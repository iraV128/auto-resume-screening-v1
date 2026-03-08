// backend/routes/jobs.routes.js
// ============================================================
// JOB ROUTES
// - Public jobs list/details
// - Recruiter scoped jobs
// - Recruiter metrics
// - Create / Update / Delete jobs
// Aligned to database.js schema:
// jobs(title, company, location, description, dueDate)
// rankings(score, breakdown)
// ============================================================

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function getDueDate(body) {
  const v = body?.dueDate ?? body?.closing_date ?? body?.closingDate ?? null;
  if (!v) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normaliseJob(job) {
  if (!job) return job;
  return {
    ...job,
    closing_date: job.dueDate ?? null,
    closingDate: job.dueDate ?? null,
  };
}

function hasTable(name) {
  return !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(name);
}

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
    console.warn("⚠ log insert failed:", e.message);
  }
}

function getOwnedJob(jobId, user) {
  const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
  if (!job) return null;
  if (user.role === "admin") return job;
  if (user.role === "recruiter" && Number(job.recruiterId) === Number(user.id)) {
    return job;
  }
  return false;
}

function parseBreakdownTerms(breakdown) {
  if (!breakdown) return [];
  try {
    const parsed = JSON.parse(breakdown);

    // Preferred shape: { topTerms: [...] }
    if (Array.isArray(parsed?.topTerms)) return parsed.topTerms;

    // Fallback: array directly
    if (Array.isArray(parsed)) return parsed;

    // Fallback: { terms: [...] }
    if (Array.isArray(parsed?.terms)) return parsed.terms;

    return [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------
// GET /api/jobs/recruiter/metrics
// IMPORTANT: above "/:id"
// ------------------------------------------------------------
router.get(
  "/recruiter/metrics",
  requireAuth,
  requireRole("recruiter", "admin"),
  (req, res) => {
    try {
      const recruiterId =
        req.user.role === "admin" && req.query.recruiterId
          ? Number(req.query.recruiterId)
          : req.user.role === "admin"
          ? null
          : req.user.id;

      const args = recruiterId ? [recruiterId] : [];
      const recruiterFilter = recruiterId ? "AND j.recruiterId = ?" : "";

      let totalApplications = 0;
      let newApplications = 0;
      let pendingAnalysis = 0;
      let avgMatchScore = null;
      let topSkills = [];

      if (hasTable("applications") && hasTable("jobs")) {
        totalApplications =
          db.prepare(`
            SELECT COUNT(*) AS c
            FROM applications a
            JOIN jobs j ON j.id = a.jobId
            WHERE 1=1 ${recruiterFilter}
          `).get(...args)?.c ?? 0;

        // DB status is lowercase 'submitted'
        newApplications =
          db.prepare(`
            SELECT COUNT(*) AS c
            FROM applications a
            JOIN jobs j ON j.id = a.jobId
            WHERE a.status = 'submitted' ${recruiterFilter}
          `).get(...args)?.c ?? 0;

        if (hasTable("rankings")) {
          pendingAnalysis =
            db.prepare(`
              SELECT COUNT(*) AS c
              FROM applications a
              JOIN jobs j ON j.id = a.jobId
              WHERE 1=1 ${recruiterFilter}
                AND NOT EXISTS (
                  SELECT 1
                  FROM rankings r
                  WHERE r.jobId = a.jobId
                    AND r.resumeId = a.resumeId
                )
            `).get(...args)?.c ?? 0;
        }
      }

      if (hasTable("rankings") && hasTable("jobs")) {
        // rankings column is score, not scorePercent
        const avgScore =
          db.prepare(`
            SELECT AVG(r.score) AS avg
            FROM rankings r
            JOIN jobs j ON j.id = r.jobId
            WHERE 1=1 ${recruiterFilter}
          `).get(...args)?.avg ?? null;

        // Convert 0..1 score to percentage for frontend card
        avgMatchScore =
          avgScore == null ? null : Math.round(Number(avgScore) * 100);

        // Top skills derived from rankings.breakdown JSON
        const rows = db.prepare(`
          SELECT r.breakdown
          FROM rankings r
          JOIN jobs j ON j.id = r.jobId
          WHERE r.breakdown IS NOT NULL ${recruiterFilter}
        `).all(...args);

        const freq = new Map();
        for (const row of rows) {
          const terms = parseBreakdownTerms(row.breakdown);
          for (const term of terms) {
            const t = String(term || "").trim();
            if (!t) continue;
            freq.set(t, (freq.get(t) || 0) + 1);
          }
        }

        topSkills = Array.from(freq.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([term, count]) => ({ term, count }));
      }

      return res.json({
        ok: true,
        totalApplications,
        newApplications,
        pendingAnalysis,
        avgMatchScore,
        topSkills,
      });
    } catch (err) {
      console.error("GET /api/jobs/recruiter/metrics error:", err);
      return res.status(500).json({ error: "Failed to load recruiter metrics" });
    }
  }
);

// ------------------------------------------------------------
// GET /api/jobs
// PUBLIC by default
// ?scope=recruiter => own jobs only
// ------------------------------------------------------------
router.get("/", (req, res) => {
  try {
    const scope = String(req.query.scope || "").trim();

    if (scope === "recruiter") {
      if (!req.headers.authorization) {
        return res.status(401).json({ error: "Authentication required" });
      }

      return requireAuth(req, res, () => {
        if (!["recruiter", "admin"].includes(req.user.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }

        const jobs =
          req.user.role === "admin"
            ? db.prepare("SELECT * FROM jobs ORDER BY id DESC").all()
            : db.prepare("SELECT * FROM jobs WHERE recruiterId = ? ORDER BY id DESC").all(req.user.id);

        return res.json(jobs.map(normaliseJob));
      });
    }

    const jobs = db.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
    return res.json(jobs.map(normaliseJob));
  } catch (err) {
    console.error("GET /api/jobs error:", err);
    return res.status(500).json({ error: "Failed to load jobs" });
  }
});

// ------------------------------------------------------------
// GET /api/jobs/:id
// ------------------------------------------------------------
router.get("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(id);
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    return res.json(normaliseJob(job));
  } catch (err) {
    console.error("GET /api/jobs/:id error:", err);
    return res.status(500).json({ error: "Failed to load job details" });
  }
});

// ------------------------------------------------------------
// POST /api/jobs
// ------------------------------------------------------------
router.post("/", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const company = String(req.body?.company || "").trim();
    const location = String(req.body?.location || "").trim();
    const description = String(req.body?.description || "").trim();
    const dueDate = getDueDate(req.body);

    if (!title || !company || !location || !description || !dueDate) {
      return res.status(400).json({
        error: "Title, company, location, description, and closing date are required",
      });
    }

    const info = db.prepare(`
      INSERT INTO jobs (recruiterId, title, company, location, description, dueDate)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, title, company, location, description, dueDate);

    writeLog({
      actorUserId: req.user.id,
      action: "JOB_CREATED",
      entityType: "job",
      entityId: info.lastInsertRowid,
      req,
      meta: { title, company, location, dueDate },
    });

    return res.status(201).json({
      message: "Job created successfully",
      id: info.lastInsertRowid,
    });
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    return res.status(500).json({ error: "Failed to create job" });
  }
});

// ------------------------------------------------------------
// PUT /api/jobs/:id
// ------------------------------------------------------------
router.put("/:id", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const ownedJob = getOwnedJob(id, req.user);
    if (ownedJob === null) return res.status(404).json({ error: "Job not found" });
    if (ownedJob === false) return res.status(403).json({ error: "You cannot edit this job" });

    const title = String(req.body?.title || "").trim();
    const company = String(req.body?.company || "").trim();
    const location = String(req.body?.location || "").trim();
    const description = String(req.body?.description || "").trim();
    const dueDate = getDueDate(req.body);

    if (!title || !company || !location || !description || !dueDate) {
      return res.status(400).json({
        error: "Title, company, location, description, and closing date are required",
      });
    }

    db.prepare(`
      UPDATE jobs
      SET title = ?, company = ?, location = ?, description = ?, dueDate = ?
      WHERE id = ?
    `).run(title, company, location, description, dueDate, id);

    writeLog({
      actorUserId: req.user.id,
      action: "JOB_UPDATED",
      entityType: "job",
      entityId: id,
      req,
      meta: { title, company, location, dueDate },
    });

    return res.json({
      message: "Job updated successfully",
      job: normaliseJob(db.prepare("SELECT * FROM jobs WHERE id = ?").get(id)),
    });
  } catch (err) {
    console.error("PUT /api/jobs/:id error:", err);
    return res.status(500).json({ error: "Failed to update job" });
  }
});

// ------------------------------------------------------------
// DELETE /api/jobs/:id
// ------------------------------------------------------------
router.delete("/:id", requireAuth, requireRole("recruiter", "admin"), (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid job id" });
    }

    const ownedJob = getOwnedJob(id, req.user);
    if (ownedJob === null) return res.status(404).json({ error: "Job not found" });
    if (ownedJob === false) return res.status(403).json({ error: "You cannot delete this job" });

    db.prepare("DELETE FROM jobs WHERE id = ?").run(id);

    writeLog({
      actorUserId: req.user.id,
      action: "JOB_DELETED",
      entityType: "job",
      entityId: id,
      req,
      meta: { title: ownedJob.title || null },
    });

    return res.json({ message: "Job deleted successfully" });
  } catch (err) {
    console.error("DELETE /api/jobs/:id error:", err);
    return res.status(500).json({ error: "Failed to delete job" });
  }
});

module.exports = router;