/**
 * ============================================================
 * Feedback Service (FR-10)
 * ------------------------------------------------------------
 * Generates candidate feedback for a given (jobId, resumeId):
 * - strengths: matched job keywords found in resume
 * - gaps: job keywords missing from resume
 * - summary: human-readable explanation
 *
 * Stores result in DB table: feedback
 * ============================================================
 */

const db = require("../db/database");
const { logEvent } = require("./log.service"); //  use shared log service (action-based)

/**
 * Simple stopword list to reduce noise.
 * Keep it small + practical for student project.
 */
const STOPWORDS = new Set([
  "the","and","a","an","to","of","in","for","on","with","at","by","from",
  "is","are","was","were","be","been","being",
  "as","it","this","that","these","those",
  "you","your","we","our","they","their","i",
  "will","can","may","must","should","would",
  "or","not","no","yes",
  "experience","years","year","skills","skill","work","role","responsibilities",
  "required","requirement","preferred","ability","knowledge"
]);

/**
 * Extract keywords with naive frequency scoring.
 * - lowercases
 * - removes punctuation
 * - removes stopwords
 * - keeps tokens length >= 3
 * Returns: Map(keyword -> count)
 */
function keywordCounts(text) {
  const counts = new Map();
  if (!text || typeof text !== "string") return counts;

  const cleaned = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return counts;

  for (const token of cleaned.split(" ")) {
    if (token.length < 3) continue;
    if (STOPWORDS.has(token)) continue;
    // ignore pure numbers
    if (/^\d+$/.test(token)) continue;

    counts.set(token, (counts.get(token) || 0) + 1);
  }

  return counts;
}

/**
 * Convert a Map of counts into an ordered keyword list (highest frequency first).
 */
function topKeywords(countMap, limit = 25) {
  return [...countMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Utility: safe JSON parse for topTerms etc.
 */
function safeJsonParse(value, fallback) {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Create (or replace) feedback for a job + resume.
 * If feedback already exists for the same pair, we overwrite it (clean + deterministic).
 */
function saveFeedback({ jobId, resumeId, strengths, gaps, summary }) {
  const createdAt = new Date().toISOString();

  // Clean overwrite approach (simple + reliable for marking/demo)
  db.prepare(`DELETE FROM feedback WHERE jobId = ? AND resumeId = ?`).run(jobId, resumeId);

  const stmt = db.prepare(`
    INSERT INTO feedback (jobId, resumeId, strengths, gaps, summary, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    jobId,
    resumeId,
    JSON.stringify(strengths),
    JSON.stringify(gaps),
    summary,
    createdAt
  );

  return { id: info.lastInsertRowid, jobId, resumeId, strengths, gaps, summary, createdAt };
}

/**
 * Main: generate feedback for a given jobId/resumeId.
 *
 * Options:
 * - scorePercent: include in summary (optional)
 * - topTermsJson: use ranking explainability terms if you have them (optional)
 *
 * NEW (optional):
 * - req: Express req (so logs can store ip/userAgent)
 * - actorUserId: for logs.actorUserId (if you want to force it)
 */
function generateFeedbackForPair(jobId, resumeId, options = {}) {
  const job = db.prepare(`SELECT id, title, description FROM jobs WHERE id = ?`).get(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);

  const resume = db
    .prepare(`SELECT id, originalName, content, sanitisedTextContent FROM resumes WHERE id = ?`)
    .get(resumeId);
  if (!resume) throw new Error(`Resume not found: ${resumeId}`);

  // Prefer bias-mitigated text if available
  const resumeText = resume.sanitisedTextContent || resume.content;

  // Extract keywords
  const jobCounts = keywordCounts(job.description);
  const resumeCounts = keywordCounts(resumeText);

  const jobTop = topKeywords(jobCounts, 30);
  const resumeTop = new Set(topKeywords(resumeCounts, 60));

  // Strengths: job keywords that appear in resume
  const strengths = jobTop.filter((k) => resumeTop.has(k)).slice(0, 10);

  // Gaps: job keywords not found in resume
  const gaps = jobTop.filter((k) => !resumeTop.has(k)).slice(0, 10);

  // Optional: incorporate ranking topTerms to align with explainability output
  const topTerms = safeJsonParse(options.topTermsJson, []);
  const topTermWords = Array.isArray(topTerms)
    ? topTerms.map((t) => (typeof t === "string" ? t : t.term)).filter(Boolean)
    : [];

  // If we have topTerms, lightly prioritise them in strengths
  if (topTermWords.length) {
    const boosted = [];
    for (const w of topTermWords) {
      const lw = String(w).toLowerCase();
      if (!boosted.includes(lw)) boosted.push(lw);
    }
    // merge without duplicates, keep max 10
    const merged = [...new Set([...boosted, ...strengths])].slice(0, 10);
    strengths.length = 0;
    strengths.push(...merged);
  }

  const scorePercent = typeof options.scorePercent === "number" ? options.scorePercent : null;

  const summaryParts = [
    `Feedback for "${resume.originalName}" against job "${job.title}".`,
    strengths.length
      ? `Key strengths match: ${strengths.slice(0, 5).join(", ")}.`
      : `No strong keyword matches found (based on extracted terms).`,
    gaps.length
      ? `Potential gaps to address: ${gaps.slice(0, 5).join(", ")}.`
      : `No major gaps detected from top job keywords.`,
  ];

  if (scorePercent !== null) {
    summaryParts.push(`Overall match score: ${scorePercent.toFixed(1)}%.`);
  }

  const summary = summaryParts.join(" ");

  const saved = saveFeedback({ jobId, resumeId, strengths, gaps, summary });

  // ✅ FIX: Use action-based logging service (NOT eventType column)
  logEvent(
    "FEEDBACK_GENERATED",
    `Generated feedback for jobId=${jobId}, resumeId=${resumeId}`,
    {
      entityType: "feedback",
      entityId: saved.id,
      jobId,
      resumeId,
      strengthsCount: strengths.length,
      gapsCount: gaps.length,
      scorePercent,
    },
    options.req ?? null,
    options.actorUserId ?? null
  );

  return saved;
}

module.exports = {
  generateFeedbackForPair,
};