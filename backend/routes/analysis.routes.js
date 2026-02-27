// backend/routes/analysis.routes.js
/**
 * ============================================================
 * Analysis & Ranking Routes
 * What it does:

Gets job description
Gets resumes
Uses rank.service.js
Stores ranking score in DB
Logs event (FR-13)
Generates feedback (FR-10)

* ------------------------------------------------------------
 * Endpoints:
 * - POST /api/analysis/rank
 *      -> ranks all resumes for a job (TF-IDF via Node -> Python)
 *      -> generates FR-10 candidate feedback for each resume
 *
 * - GET  /api/analysis/rankings/:jobId
 *      -> returns ranking list for a job (sorted DESC)
 *
 * - GET  /api/analysis/feedback/:jobId
 *      -> returns feedback for ALL resumes in a job
 *      -> optional: ?resumeId=#
 *
 * - GET  /api/analysis/feedback/:jobId/:resumeId  
 *      -> returns feedback for ONE resume (frontend-friendly)
 *
 * - GET  /api/analysis/ranked-feedback/:jobId      
 *      -> returns rankings + feedback combined in one response (best proof/demo)
 *
 * FR-13: Logging + Auditing (START, DONE, ERROR + bias mitigation proof logs)
 * FR-10: Candidate Feedback Generation (strengths/gaps/summary stored in DB)
 *
 * Notes:
 * - Timing logs measure duration; they do NOT speed up ranking.
 * - Bias mitigation uses sanitised text when available (fallback to stripPII).
 * ============================================================
 */

const router = require("express").Router();
const db = require("../db/database");

const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const { scoreWithTfidf } = require("../services/rank.service");
const { logEvent } = require("../services/log.service"); // ✅ FR-13 logger
const { stripPII } = require("../services/pii.service"); // ✅ bias mitigation helper

// ✅ FR-10 feedback generator (writes into feedback table)
const { generateFeedbackForPair } = require("../services/feedback.service");

/**
 * Utility: Safe JSON.parse to prevent crashes if DB contains invalid JSON.
 */
function safeJsonParse(value, fallback) {
  try {
    if (value === null || value === undefined) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * ------------------------------------------------------------
 * POST /api/analysis/rank
 * Body: { jobId }
 *
 * Ranks every resume for the given jobId.
 * Also generates candidate feedback per (jobId, resumeId).
 * ------------------------------------------------------------
 */
router.post("/rank", requireAuth, requireRole("recruiter", "admin"), async (req, res) => {
  const jobId = req.body?.jobId;
  let t0 = null;

  try {
    // ✅ Validate request
    if (!jobId) return res.status(400).json({ error: "jobId required" });

    // ✅ FR-13 audit log: start
    logEvent("RANKING_STARTED", "Ranking started", { jobId });
    t0 = Date.now();

    // ✅ Load job
    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // ✅ Load resumes
    const resumes = db.prepare("SELECT * FROM resumes").all();
    if (resumes.length === 0) return res.status(400).json({ error: "No resumes uploaded" });

    // ✅ Deterministic output:
    // remove old rankings & feedback for the same job, so results are clean each run
    db.prepare("DELETE FROM rankings WHERE jobId = ?").run(jobId);
    db.prepare("DELETE FROM feedback WHERE jobId = ?").run(jobId);

    // ✅ Prepared statement for ranking insert (fast & clean)
    const insertRanking = db.prepare(`
      INSERT INTO rankings (jobId, resumeId, score, scorePercent, topTerms, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // ✅ Bias mitigation: sanitise job description ONCE
    const cleanedJobText = stripPII(job.description);

    const results = [];

    // ============================================================
    // Main ranking loop: score each resume + store ranking + feedback
    // ============================================================
    for (const r of resumes) {
      // ✅ Prefer stored sanitised text (already PII-stripped).
      // Fallback: stripPII(raw text) for older DB rows.
      const usedStoredSanitised = !!(r.sanitisedTextContent && r.sanitisedTextContent.trim());

      const cleanedResumeText = usedStoredSanitised
        ? r.sanitisedTextContent
        : stripPII(r.textContent);

      // ✅ FR-13 proof log: bias mitigation was applied during scoring
      logEvent("BIAS_MITIGATION_USED_FOR_RANKING", "Ranking used sanitised resume text", {
        jobId,
        resumeId: r.id,
        usedStoredSanitised,
      });

      // ✅ TF-IDF scoring (Node -> Python)
      const scoreResult = await scoreWithTfidf(cleanedJobText, cleanedResumeText);

      // ✅ Store ranking result in DB
      insertRanking.run(
        jobId,
        r.id,
        scoreResult.score,
        scoreResult.scorePercent,
        JSON.stringify(scoreResult.topTerms),
        new Date().toISOString()
      );

      // ✅ FR-10: Generate and store feedback (strengths/gaps/summary)
      // Feedback should not block ranking if it fails, so wrap in try/catch.
      try {
        generateFeedbackForPair(jobId, r.id, {
          scorePercent: scoreResult.scorePercent,
          topTermsJson: JSON.stringify(scoreResult.topTerms),
        });
      } catch (feedbackErr) {
        console.error("FEEDBACK ERROR:", feedbackErr);

        logEvent("ERROR", "Feedback generation failed", {
          route: "analysis/rank",
          jobId,
          resumeId: r.id,
          error: feedbackErr.message,
        });
      }

      // ✅ Response payload (for UI) — minimal, fast and readable
      results.push({
        resumeId: r.id,
        resumeName: r.originalName,
        scorePercent: scoreResult.scorePercent,
        topTerms: scoreResult.topTerms,
      });
    }

    // ✅ Sort results by best match
    results.sort((a, b) => b.scorePercent - a.scorePercent);

    // ✅ FR-13 audit log: done + duration
    const durationMs = Date.now() - t0;

    logEvent("RANKING_DONE", "Ranking finished", {
      jobId,
      rankedCount: results.length,
      durationMs,
    });

    res.json({ jobId, results });
  } catch (e) {
    console.error("RANK ERROR:", e);

    const durationMs = t0 ? Date.now() - t0 : null;

    // ✅ FR-13 audit log: error
    logEvent("ERROR", e.message, {
      route: "analysis/rank",
      jobId,
      durationMs,
    });

    res.status(500).json({ error: e.message });
  }
});

/**
 * ------------------------------------------------------------
 * GET /api/analysis/rankings/:jobId
 * Returns ranking list for a job (sorted DESC).
 * ------------------------------------------------------------
 */
router.get("/rankings/:jobId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);

  const rows = db
    .prepare(
      `
      SELECT rankings.*, resumes.originalName AS resumeName
      FROM rankings
      JOIN resumes ON resumes.id = rankings.resumeId
      WHERE rankings.jobId = ?
      ORDER BY rankings.scorePercent DESC
    `
    )
    .all(jobId);

  const formatted = rows.map((r) => ({
    resumeId: r.resumeId,
    resumeName: r.resumeName,
    scorePercent: r.scorePercent,
    topTerms: safeJsonParse(r.topTerms, []),
  }));

  res.json(formatted);
});

/**
 * ------------------------------------------------------------
 * ✅ FR-10 (Part 4): GET /api/analysis/feedback/:jobId/:resumeId
 * Returns feedback for ONE resume within a job.
 * Great for "View Feedback" button in frontend.
 * ------------------------------------------------------------
 */
router.get("/feedback/:jobId/:resumeId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);
  const resumeId = Number(req.params.resumeId);

  const row = db
    .prepare(
      `
      SELECT feedback.*, resumes.originalName AS resumeName
      FROM feedback
      JOIN resumes ON resumes.id = feedback.resumeId
      WHERE feedback.jobId = ? AND feedback.resumeId = ?
      ORDER BY feedback.createdAt DESC
      LIMIT 1
    `
    )
    .get(jobId, resumeId);

  if (!row) return res.status(404).json({ error: "Feedback not found" });

  res.json({
    id: row.id,
    jobId: row.jobId,
    resumeId: row.resumeId,
    resumeName: row.resumeName,
    strengths: safeJsonParse(row.strengths, []),
    gaps: safeJsonParse(row.gaps, []),
    summary: row.summary,
    createdAt: row.createdAt,
  });
});

/**
 * ------------------------------------------------------------
 * ✅ FR-10: GET /api/analysis/feedback/:jobId
 * Optional query: ?resumeId=#
 *
 * Returns feedback for ALL resumes in a job.
 * If resumeId is given, returns only that resume's feedback.
 * ------------------------------------------------------------
 */
router.get("/feedback/:jobId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);
  const resumeId = req.query.resumeId ? Number(req.query.resumeId) : null;

  let rows;

  if (resumeId) {
    rows = db
      .prepare(
        `
        SELECT feedback.*, resumes.originalName AS resumeName
        FROM feedback
        JOIN resumes ON resumes.id = feedback.resumeId
        WHERE feedback.jobId = ? AND feedback.resumeId = ?
        ORDER BY feedback.createdAt DESC
      `
      )
      .all(jobId, resumeId);
  } else {
    rows = db
      .prepare(
        `
        SELECT feedback.*, resumes.originalName AS resumeName
        FROM feedback
        JOIN resumes ON resumes.id = feedback.resumeId
        WHERE feedback.jobId = ?
        ORDER BY feedback.createdAt DESC
      `
      )
      .all(jobId);
  }

  const formatted = rows.map((f) => ({
    id: f.id,
    jobId: f.jobId,
    resumeId: f.resumeId,
    resumeName: f.resumeName,
    strengths: safeJsonParse(f.strengths, []),
    gaps: safeJsonParse(f.gaps, []),
    summary: f.summary,
    createdAt: f.createdAt,
  }));

  res.json(formatted);
});

/**
 * ------------------------------------------------------------
 * ✅ FR-10 (Part 4): GET /api/analysis/ranked-feedback/:jobId
 * Returns a combined view of:
 * - ranking score + topTerms
 * - feedback strengths/gaps/summary
 *
 * This is ideal for frontend because it avoids multiple API calls.
 * Also perfect for "proof" screenshots in your report/demo.
 * ------------------------------------------------------------
 */
router.get("/ranked-feedback/:jobId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);

  const rows = db
    .prepare(
      `
      SELECT
        rankings.resumeId,
        resumes.originalName AS resumeName,
        rankings.scorePercent,
        rankings.topTerms,
        feedback.strengths,
        feedback.gaps,
        feedback.summary,
        feedback.createdAt AS feedbackCreatedAt
      FROM rankings
      JOIN resumes ON resumes.id = rankings.resumeId
      LEFT JOIN feedback
        ON feedback.jobId = rankings.jobId AND feedback.resumeId = rankings.resumeId
      WHERE rankings.jobId = ?
      ORDER BY rankings.scorePercent DESC
    `
    )
    .all(jobId);

  const formatted = rows.map((r) => ({
    resumeId: r.resumeId,
    resumeName: r.resumeName,
    scorePercent: r.scorePercent,
    topTerms: safeJsonParse(r.topTerms, []),

    // Feedback may be null if ranking ran but feedback generation failed
    strengths: safeJsonParse(r.strengths, []),
    gaps: safeJsonParse(r.gaps, []),
    summary: r.summary || null,
    feedbackCreatedAt: r.feedbackCreatedAt || null,
  }));

  res.json({ jobId, results: formatted });
});

module.exports = router;
