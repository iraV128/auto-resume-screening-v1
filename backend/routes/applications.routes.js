// backend/routes/applications.routes.js
// ============================================================
// APPLICATION ROUTES
// ------------------------------------------------------------
// POST /api/applications/apply
// Body: { jobId, resumeId }
// Uses req.user.id from JWT
//
// Locked checklist rules:
// - Candidate/jobseeker only
// - Must reference existing job + resume
// - Must prevent duplicate applications
// - Must block applying after closing date
// ============================================================

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

// ------------------------------------------------------------
// Helper: safe logging
// ------------------------------------------------------------
function writeLog({ actorUserId, action, entityType, entityId, req, meta }) {
  try {
    db.prepare(`
      INSERT INTO logs (actorUserId, action, message, entityType, entityId, ipAddress, userAgent, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      actorUserId ?? null,
      action,
      action,
      entityType ?? null,
      entityId ?? null,
      req?.ip ?? null,
      req?.headers?.["user-agent"] ?? null,
      meta ? JSON.stringify(meta) : null
    );
  } catch (e) {
    console.warn("⚠ application log insert failed:", e.message);
  }
}

// ------------------------------------------------------------
// POST /api/applications/apply
// Candidate/jobseeker only
// ------------------------------------------------------------
router.post("/apply", requireAuth, requireRole("jobseeker"), (req, res) => {
  try {
    const userId = Number(req.user.id);
    const jobId = Number(req.body?.jobId);
    const resumeId = Number(req.body?.resumeId);

    // Validate required values
    if (!Number.isFinite(jobId) || !Number.isFinite(resumeId)) {
      return res.status(400).json({ error: "jobId and resumeId are required" });
    }

    // Check job exists
    const job = db
      .prepare("SELECT id, title, dueDate FROM jobs WHERE id = ?")
      .get(jobId);

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Backend protection: block applying after closing date
    if (job.dueDate) {
      const closingTime = new Date(job.dueDate).getTime();
      if (!Number.isNaN(closingTime) && closingTime < Date.now()) {
        return res.status(400).json({ error: "Applications are closed for this job" });
      }
    }

    // Check resume exists
    const resume = db
      .prepare("SELECT id FROM resumes WHERE id = ?")
      .get(resumeId);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Prevent duplicate application per user per job
    const existing = db
      .prepare("SELECT id FROM applications WHERE jobId = ? AND userId = ?")
      .get(jobId, userId);

    if (existing) {
      return res.status(409).json({
        error: "Already applied for this job",
        applicationId: existing.id,
      });
    }

    // Create new application
    const info = db
      .prepare(`
        INSERT INTO applications (jobId, userId, resumeId, status, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(jobId, userId, resumeId, "submitted", new Date().toISOString());

    // Audit log
    writeLog({
      actorUserId: userId,
      action: "APPLICATION_CREATED",
      entityType: "application",
      entityId: info.lastInsertRowid,
      req,
      meta: {
        jobId,
        resumeId,
        jobTitle: job.title || null,
      },
    });

    return res.json({
      ok: true,
      applicationId: info.lastInsertRowid,
      message: "Application submitted successfully",
    });
  } catch (e) {
    console.error("APPLY ERROR:", e);
    return res.status(500).json({ error: "Failed to apply" });
  }
});

module.exports = router;