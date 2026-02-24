// backend/routes/logs.routes.js
/**
 * ============================================================
 * LOGS ROUTES (FR-13: Logging + Auditing)
 * ------------------------------------------------------------
 * Purpose:
 * - Allows Admin to read audit logs from the database
 * - Used for debugging + evidence screenshots in report
 *
 * Endpoint:
 * - GET /api/logs
 *
 * Optional query params:
 * - eventType=RANKING_DONE   (filter by event type)
 * - limit=50                (max 200 for safety)
 *
 * Security:
 * - Admin only (JWT + RBAC)
 * ============================================================
 */

const router = require("express").Router();
const db = require("../db/database");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

/**
 * ============================================================
 * GET /api/logs?eventType=...&limit=...
 * ------------------------------------------------------------
 * Returns latest logs (most recent first)
 * - If eventType is provided: returns only that type
 * - limit is capped to 200 to prevent huge responses
 * ============================================================
 */
router.get("/", requireAuth, requireRole("admin"), (req, res) => {
  try {
    const eventType = req.query.eventType || null;

    // limit defaults to 50, max 200
    const limit = Math.min(Number(req.query.limit) || 50, 200);

    let rows;

    if (eventType) {
      rows = db.prepare(`
        SELECT * FROM logs
        WHERE eventType = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `).all(eventType, limit);
    } else {
      rows = db.prepare(`
        SELECT * FROM logs
        ORDER BY createdAt DESC
        LIMIT ?
      `).all(limit);
    }

    /**
     * Parse meta JSON safely
     * - meta is stored as JSON string in DB (TEXT)
     * - return {} if missing or invalid JSON
     */
    const formatted = rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      message: r.message,
      meta: (() => {
        try {
          return r.meta ? JSON.parse(r.meta) : {};
        } catch {
          return {};
        }
      })(),
      createdAt: r.createdAt,
    }));

    return res.json(formatted);

  } catch (err) {
    console.error("LOGS FETCH ERROR:", err);
    return res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;