// backend/routes/candidate.routes.js
// ============================================================
// CANDIDATE ENDPOINTS (uses JWT user id)
// ------------------------------------------------------------
// Locked final scope:
// - Candidate dashboard shows ONLY candidate application data
// - No candidate-side reports page
// - No candidate-side notifications page
// ============================================================

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

// ------------------------------------------------------------
// GET /api/candidate/applications
// Candidate's own applications only
// ------------------------------------------------------------
router.get("/applications", requireAuth, requireRole("jobseeker"), (req, res) => {
  try {
    const userId = Number(req.user.id);

    const rows = db
      .prepare(`
        SELECT
          a.id AS applicationId,
          a.status,
          a.createdAt,
          j.id AS jobId,
          j.title AS jobTitle,
          j.dueDate,
          r.id AS resumeId,
          r.originalName
        FROM applications a
        JOIN jobs j ON j.id = a.jobId
        JOIN resumes r ON r.id = a.resumeId
        WHERE a.userId = ?
        ORDER BY a.createdAt DESC
      `)
      .all(userId);

    return res.json(rows);
  } catch (e) {
    console.error("CANDIDATE applications ERROR:", e);
    return res.status(500).json({ error: "Failed to load applications" });
  }
});

module.exports = router;