// backend/routes/logs.routes.js
// ============================================================
// SYSTEM LOGS API
// ------------------------------------------------------------
// Admin-only monitoring route
// GET /api/logs -> returns latest logs
//
// Locked final rule:
// - System logs are admin-only
// - Used for monitoring, audit trail, and final demo evidence
// ============================================================

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

// ------------------------------------------------------------
// Helper: parse stored JSON safely
// ------------------------------------------------------------
function parseMeta(meta) {
  if (meta == null) return null;

  try {
    return typeof meta === "string" ? JSON.parse(meta) : meta;
  } catch {
    return meta;
  }
}

// ------------------------------------------------------------
// GET /api/logs
// Admin-only
// Returns latest 200 logs
// ------------------------------------------------------------
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const rows = db
      .prepare(`
        SELECT
          id,
          action,
          message,
          meta,
          actorUserId,
          entityType,
          entityId,
          ipAddress,
          userAgent,
          createdAt
        FROM logs
        ORDER BY datetime(createdAt) DESC, id DESC
        LIMIT 200
      `)
      .all();

    const mapped = rows.map((r) => ({
      ...r,
      ip: r.ipAddress ?? null, // frontend expects "ip"
      meta: parseMeta(r.meta),
    }));

    return res.json(mapped);
  } catch (e) {
    console.error("LOGS GET ERROR:", e);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// ------------------------------------------------------------
// GET /api/logs/stats
// Optional summary endpoint for admin dashboard/log stats
// ------------------------------------------------------------
router.get("/stats", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const total = db.prepare(`SELECT COUNT(*) AS count FROM logs`).get()?.count ?? 0;

    const byAction = db
      .prepare(`
        SELECT action, COUNT(*) AS count
        FROM logs
        GROUP BY action
        ORDER BY count DESC, action ASC
        LIMIT 20
      `)
      .all();

    const recentErrors = db
      .prepare(`
        SELECT COUNT(*) AS count
        FROM logs
        WHERE action = 'ERROR'
      `)
      .get()?.count ?? 0;

    return res.json({
      total,
      recentErrors,
      byAction,
    });
  } catch (e) {
    console.error("LOGS STATS ERROR:", e);
    return res.status(500).json({ error: "Failed to fetch log stats" });
  }
});

// Must export router directly
module.exports = router;