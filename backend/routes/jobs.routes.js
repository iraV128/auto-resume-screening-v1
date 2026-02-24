/**
 * ============================================================
 * JOB ROUTES
 * ------------------------------------------------------------
 * Handles:
 *   - Create job (Protected)
 *   - Get all jobs
 *
 * Stores:
 *   - Job title
 *   - Job description
 *
 * Purpose:
 *   Jobs are the reference descriptions that resumes
 *   are compared against for ranking.
 * ============================================================
 */

const router = require("express").Router();
const db = require("../db/database");
const { logEvent } = require("../services/log.service");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");


/**
 * ============================================================
 * POST /api/jobs
 * ------------------------------------------------------------
 * Creates a new job
 * - Requires valid JWT (requireAuth)
 * - Stores title & description
 * - Logs event (FR-13)
 * ============================================================
 */
router.post("/", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    // Safe destructuring
    const { title, description } = req.body || {};

    // Basic validation
    if (!title || !description) {
      return res.status(400).json({
        error: "title and description required"
      });
    }

    // Insert job into database
    const stmt = db.prepare(`
      INSERT INTO jobs (title, description, createdAt)
      VALUES (?, ?, ?)
    `);

    const info = stmt.run(
      title,
      description,
      new Date().toISOString()
    );

    /**
     * FR-13 Logging:
     * Records system activity for auditing
     */
    logEvent("JOB_CREATED", "New job created", {
      jobId: info.lastInsertRowid,
      title,
      createdBy: req.user?.id || null  // from JWT
    });

    return res.json({
      id: info.lastInsertRowid
    });

  } catch (err) {
    console.error("JOB CREATE ERROR:", err);

    return res.status(500).json({
      error: "Failed to create job"
    });
  }
});


/**
 * ============================================================
 * GET /api/jobs
 * ------------------------------------------------------------
 * Returns all jobs
 * (Currently public — can be protected later if needed)
 * ============================================================
 */
router.post("/", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const jobs = db
      .prepare("SELECT * FROM jobs ORDER BY id DESC")
      .all();

    return res.json(jobs);

  } catch (err) {
    console.error("JOB FETCH ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch jobs"
    });
  }
});

module.exports = router;