// backend/routes/jobs.routes.js
/**
 * ============================================================
 * JOB ROUTES (FR: Job Posting)
 * ------------------------------------------------------------
 * Handles:
 *  - POST /api/jobs     -> Create a new job (Recruiter/Admin only)
 *  - GET  /api/jobs     -> List all jobs (Any authenticated user)
 *
 * Why protected?
 *  - Only logged-in users can see jobs in this prototype
 *  - RBAC ensures only recruiter/admin can create jobs
 *
 * Logging (FR-13):
 *  - Logs job creation events for auditing evidence
 * 
 * UC-00: Public can browse open jobs
 * UC-00b: Public can view job details
 * Recruiter/Admin can create jobs
 * ============================================================
 */

const router = require("express").Router();
const db = require("../db/database");
const { logEvent } = require("../services/log.service");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

/**
 * ------------------------------------------------------------
 * GET /api/jobs   (PUBLIC)
 * - UC-00 Browse Open Jobs
 * - Anyone can view jobs (no token)
 * - We return all jobs here (frontend can filter by closing_date)
 *   If you want ONLY open jobs, add WHERE closing_date >= today.
 * ------------------------------------------------------------
 */
router.get("/", (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
  return res.json(jobs);
});

/**
 * ------------------------------------------------------------
 * GET /api/jobs/:id   (PUBLIC)
 * - UC-00b View Job Details
 * ------------------------------------------------------------
 */
router.get("/:id", (req, res) => {
  const { id } = req.params;

  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);

  if (!job) {
    return res.status(404).json({ error: "Job not found" });
  }

  return res.json(job);
});

/**
 * ------------------------------------------------------------
 * POST /api/jobs   (PROTECTED)
 * - Recruiter/Admin only
 * ------------------------------------------------------------
 */
router.post("/", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  const { title, description, closing_date } = req.body || {};

  // ✅ Your use-cases mention closing date should exist for postings
  if (!title || !description || !closing_date) {
    return res.status(400).json({ error: "title, description, closing_date required" });
  }

  const info = db
    .prepare(
      `INSERT INTO jobs (title, description, closing_date, createdAt)
       VALUES (?, ?, ?, ?)`
    )
    .run(title, description, closing_date, new Date().toISOString());

  // FR-13 audit log
  logEvent("JOB_CREATED", "New job created", {
    jobId: info.lastInsertRowid,
    title,
    createdBy: req.user?.id,
    role: req.user?.role,
  });

  return res.json({ id: info.lastInsertRowid });
});

module.exports = router;