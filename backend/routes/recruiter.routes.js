//
//
//
//
//
//STOP USE TO AVOID CONFUSION
//
//
//
//
// backend/routes/recruiter.routes.js
// ============================================================
// Recruiter API "adapter" routes
// Purpose: match frontend calls to /api/recruiter/*
// ============================================================

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

// Your log service exports writeLog (NOT logEvent)
const { writeLog } = require("../services/log.service");

// Helper: safe JSON parse
function safeJsonParse(v) {
  try {
    return v ? JSON.parse(v) : null;
  } catch {
    return v;
  }
}

function tableExists(name) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?")
    .get(name);
}

// ------------------------------------------------------------
// GET /api/recruiter/jobs  (frontend expects this)
// ------------------------------------------------------------
router.get("/jobs", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const rows = isAdmin
      ? db.prepare(`SELECT * FROM jobs ORDER BY createdAt DESC`).all()
      : db.prepare(`SELECT * FROM jobs WHERE recruiterId = ? ORDER BY createdAt DESC`).all(req.user.id);

    res.json(rows);
  } catch (e) {
    console.error("RECRUITER JOBS GET ERROR:", e);
    res.status(500).json({ error: "Failed to fetch recruiter jobs" });
  }
});

// ------------------------------------------------------------
// POST /api/recruiter/jobs  (frontend create job uses this)
// Note: your jobs table currently has: title, description, closingDate, recruiterId, isActive
// company/location may be sent by frontend; we ignore safely for now.
// ------------------------------------------------------------
router.post("/jobs", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const { title, description, closingDate } = req.body || {};
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const stmt = db.prepare(`
      INSERT INTO jobs (title, description, closingDate, recruiterId, isActive)
      VALUES (?, ?, ?, ?, 1)
    `);

    const info = stmt.run(
      String(title).trim(),
      description ? String(description) : null,
      closingDate ? String(closingDate) : null,
      req.user.id
    );

    // FR-13 audit log (best effort)
    writeLog({
      action: "CREATE_JOB",
      message: "Recruiter created a job",
      meta: { jobId: info.lastInsertRowid, title },
      entityType: "job",
      entityId: info.lastInsertRowid,
      actorUserId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const created = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (e) {
    console.error("RECRUITER JOBS POST ERROR:", e);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// ------------------------------------------------------------
// GET /api/recruiter/metrics (frontend expects this)
// ------------------------------------------------------------
router.get("/metrics", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const recruiterFilterSql = isAdmin ? "" : "WHERE j.recruiterId = ?";
    const recruiterParam = isAdmin ? [] : [req.user.id];

    const totalApplicationsRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM applications a
        JOIN jobs j ON j.id = a.jobId
        ${recruiterFilterSql}
      `
      )
      .get(...recruiterParam);

    let avgMatchRow = { avgScore: null };

    if (tableExists("analysis")) {
      avgMatchRow = db
        .prepare(
          `
          SELECT AVG(an.matchScore) AS avgScore
          FROM analysis an
          JOIN jobs j ON j.id = an.jobId
          ${recruiterFilterSql}
          `
        )
        .get(...recruiterParam);
    }

    // Last analysis log (if you store analysis duration in meta.durationMs)
    const lastAnalysisLog = db
      .prepare(
        `
        SELECT action, message, meta, createdAt
        FROM logs
        WHERE action = 'ANALYZE_JOB'
        ORDER BY createdAt DESC
        LIMIT 1
      `
      )
      .get();

    const lastMeta = lastAnalysisLog ? safeJsonParse(lastAnalysisLog.meta) : null;
    const analysisTimeMs = lastMeta?.durationMs ?? null;
    const lastAnalysedAt = lastAnalysisLog?.createdAt ?? null;

    res.json({
      totalApplications: totalApplicationsRow?.total ?? 0,
      avgMatchScore: avgMatchRow?.avgScore ?? null,
      topSkillFrequency: null, // optional placeholder
      analysisTimeMs,
      lastAnalysedAt,
    });
  } catch (e) {
    console.error("RECRUITER METRICS ERROR:", e);
    res.status(500).json({ error: "Failed to load recruiter metrics" });
  }
});

// ------------------------------------------------------------
// GET /api/recruiter/summary + /api/recruiter/dashboard
// Some frontends call either; return same payload.
// ------------------------------------------------------------
function summaryHandler(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const recruiterFilterSql = isAdmin ? "" : "WHERE j.recruiterId = ?";
    const recruiterParam = isAdmin ? [] : [req.user.id];

    const totalApps = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM applications a
        JOIN jobs j ON j.id = a.jobId
        ${recruiterFilterSql}
      `
      )
      .get(...recruiterParam)?.total ?? 0;

    const pending = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM applications a
        JOIN jobs j ON j.id = a.jobId
        ${recruiterFilterSql}
          ${isAdmin ? "WHERE" : "AND"} a.status = 'submitted'
      `
      )
      .get(...recruiterParam)?.total ?? 0;

    res.json({
      totalApplications: totalApps,
      newApplications: 0,
      pendingAnalysis: pending,
    });
  } catch (e) {
    console.error("RECRUITER SUMMARY ERROR:", e);
    res.status(500).json({ error: "Failed to load recruiter summary" });
  }
}

router.get("/summary", requireAuth, requireRole("recruiter", "admin"), summaryHandler);
router.get("/dashboard", requireAuth, requireRole("recruiter", "admin"), summaryHandler);

module.exports = router;