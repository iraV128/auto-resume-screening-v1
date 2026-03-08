// backend/routes/analysis.routes.js
// ============================================================
// ANALYSIS / RANKING ROUTES
// Aligned to database.js schema:
// resumes(content, sanitisedTextContent)
// rankings(score, breakdown)
// feedback(summary, strengths, gaps, recommendations)
// ============================================================

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");
const { scoreWithTfidf } = require("../services/rank.service");
const { logEvent } = require("../services/log.service");
const { stripPII } = require("../services/pii.service");
const { generateFeedbackForPair } = require("../services/feedback.service");

function safeJsonParse(value, fallback) {
  try {
    if (value == null) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function breakdownToTopTerms(breakdown) {
  const parsed = safeJsonParse(breakdown, {});
  if (Array.isArray(parsed?.topTerms)) return parsed.topTerms;
  if (Array.isArray(parsed?.terms)) return parsed.terms;
  if (Array.isArray(parsed)) return parsed;
  return [];
}

router.post("/rank", requireAuth, requireRole("recruiter", "admin"), async (req, res) => {
  const jobId = Number(req.body?.jobId);
  let t0 = null;

  try {
    if (!Number.isFinite(jobId)) {
      return res.status(400).json({ error: "jobId required" });
    }

    t0 = Date.now();
    logEvent("RANKING_STARTED", "Ranking started", { jobId }, req, req.user?.id ?? null);

    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    // Only score resumes actually applied to this job
    const resumes = db.prepare(`
      SELECT r.*
      FROM applications a
      JOIN resumes r ON r.id = a.resumeId
      WHERE a.jobId = ?
      ORDER BY r.id ASC
    `).all(jobId);

    if (resumes.length === 0) {
      return res.status(400).json({ error: "No resumes found for this job" });
    }

    db.prepare("DELETE FROM rankings WHERE jobId = ?").run(jobId);
    db.prepare("DELETE FROM feedback WHERE jobId = ?").run(jobId);

    const insertRanking = db.prepare(`
      INSERT INTO rankings (jobId, resumeId, score, breakdown, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    const cleanedJobText = stripPII(job.description);
    const results = [];

    for (const r of resumes) {
      const cleanedResumeText =
        r.sanitisedTextContent && String(r.sanitisedTextContent).trim()
          ? r.sanitisedTextContent
          : stripPII(r.content || "");

      logEvent(
        "BIAS_MITIGATION_USED_FOR_RANKING",
        "Ranking used sanitised resume text",
        { jobId, resumeId: r.id },
        req,
        req.user?.id ?? null
      );

      const scoreResult = await scoreWithTfidf(cleanedJobText, cleanedResumeText);

      // DB stores compact schema; frontend can still receive scorePercent/topTerms
      const breakdown = {
        scorePercent: scoreResult.scorePercent,
        topTerms: Array.isArray(scoreResult.topTerms) ? scoreResult.topTerms : [],
      };

      insertRanking.run(
        jobId,
        r.id,
        Number(scoreResult.score || 0),
        JSON.stringify(breakdown),
        new Date().toISOString()
      );

      try {
        generateFeedbackForPair(jobId, r.id, {
          scorePercent: scoreResult.scorePercent,
          topTermsJson: JSON.stringify(breakdown.topTerms),
        });
      } catch (feedbackErr) {
        console.error("FEEDBACK ERROR:", feedbackErr);
        logEvent(
          "ERROR",
          "Feedback generation failed",
          { route: "analysis/rank", jobId, resumeId: r.id, error: feedbackErr.message },
          req,
          req.user?.id ?? null
        );
      }

      results.push({
        resumeId: r.id,
        resumeName: r.originalName,
        scorePercent: scoreResult.scorePercent,
        topTerms: breakdown.topTerms,
      });
    }

    results.sort((a, b) => b.scorePercent - a.scorePercent);

    const durationMs = Date.now() - t0;
    logEvent(
      "RANKING_DONE",
      "Ranking finished",
      { jobId, rankedCount: results.length, durationMs },
      req,
      req.user?.id ?? null
    );

    return res.json({ jobId, results });
  } catch (e) {
    console.error("RANK ERROR:", e);
    const durationMs = t0 ? Date.now() - t0 : null;

    logEvent(
      "ERROR",
      e.message,
      { route: "analysis/rank", jobId, durationMs },
      req,
      req.user?.id ?? null
    );

    return res.status(500).json({ error: e.message || "Ranking failed" });
  }
});

// Rankings list for one job
router.get("/rankings/:jobId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);

  const rows = db.prepare(`
    SELECT rankings.*, resumes.originalName AS resumeName
    FROM rankings
    JOIN resumes ON resumes.id = rankings.resumeId
    WHERE rankings.jobId = ?
    ORDER BY rankings.score DESC
  `).all(jobId);

  const formatted = rows.map((r) => {
    const topTerms = breakdownToTopTerms(r.breakdown);
    const scorePercent = Math.round(Number(r.score || 0) * 100);

    return {
      resumeId: r.resumeId,
      resumeName: r.resumeName,
      scorePercent,
      topTerms,
    };
  });

  res.json(formatted);
});

// Feedback for one resume in one job
router.get("/feedback/:jobId/:resumeId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);
  const resumeId = Number(req.params.resumeId);

  const row = db.prepare(`
    SELECT feedback.*, resumes.originalName AS resumeName
    FROM feedback
    JOIN resumes ON resumes.id = feedback.resumeId
    WHERE feedback.jobId = ? AND feedback.resumeId = ?
    ORDER BY feedback.createdAt DESC
    LIMIT 1
  `).get(jobId, resumeId);

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

// Combined ranking + feedback
router.get("/ranked-feedback/:jobId", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const jobId = Number(req.params.jobId);

  const rows = db.prepare(`
    SELECT
      rankings.resumeId,
      resumes.originalName AS resumeName,
      rankings.score,
      rankings.breakdown,
      feedback.strengths,
      feedback.gaps,
      feedback.summary,
      feedback.createdAt AS feedbackCreatedAt
    FROM rankings
    JOIN resumes ON resumes.id = rankings.resumeId
    LEFT JOIN feedback
      ON feedback.jobId = rankings.jobId AND feedback.resumeId = rankings.resumeId
    WHERE rankings.jobId = ?
    ORDER BY rankings.score DESC
  `).all(jobId);

  const formatted = rows.map((r) => ({
    resumeId: r.resumeId,
    resumeName: r.resumeName,
    scorePercent: Math.round(Number(r.score || 0) * 100),
    topTerms: breakdownToTopTerms(r.breakdown),
    strengths: safeJsonParse(r.strengths, []),
    gaps: safeJsonParse(r.gaps, []),
    summary: r.summary || null,
    feedbackCreatedAt: r.feedbackCreatedAt || null,
  }));

  res.json({ jobId, results: formatted });
});

module.exports = router;