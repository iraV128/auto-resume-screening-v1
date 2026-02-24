/**
 * ============================================================
 * Log Service (FR-13)
 * ------------------------------------------------------------
 * Writes audit events into logs table.
 * Logging must NEVER crash the app (try/catch).
 * ============================================================
 */

const db = require("../db/database");

/**
 * Insert a log event into the database.
 *
 * @param {string} eventType - e.g. JOB_CREATED, RESUME_UPLOADED, RANKING_DONE, ERROR
 * @param {string} message - human readable description
 * @param {object} meta - optional structured metadata (stored as JSON string)
 */
function logEvent(eventType, message, meta = {}) {
  try {
    const stmt = db.prepare(
      "INSERT INTO logs (eventType, message, meta, createdAt) VALUES (?, ?, ?, ?)"
    );

    stmt.run(
      eventType,
      message,
      JSON.stringify(meta || {}),
      new Date().toISOString()
    );
  } catch (e) {
    // If logging fails, don't crash the app
    console.error("LOGGING FAILED:", e.message);
  }
}

module.exports = { logEvent };
