// backend/services/log.service.js
const db = require("../db/database");

function writeLog({
  action,
  message,
  meta,
  entityType,
  entityId,
  actorUserId,
  ipAddress,
  userAgent,
}) {
  try {
    const safeAction = action || "EVENT";
    const safeMessage = message || "Event recorded";
    const metaJson = meta ? JSON.stringify(meta) : null;

    db.prepare(`
      INSERT INTO logs (action, message, meta, entityType, entityId, actorUserId, ipAddress, userAgent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      safeAction,
      safeMessage,
      metaJson,
      entityType || null,
      entityId || null,
      actorUserId || null,
      ipAddress || null,
      userAgent || null
    );
  } catch (e) {
    console.error("LOGGING FAILED:", e.message);
  }
}

/**
 * logEvent(action, message, meta, req, actorUserId)
 * Matches how auth.routes.js is calling it.
 */
function logEvent(action, message = "", meta = {}, req = null, actorUserId = null) {
  const ipAddress =
    req?.headers?.["x-forwarded-for"]?.toString()?.split(",")?.[0]?.trim() ||
    req?.ip ||
    null;

  const userAgent = req?.headers?.["user-agent"] || null;

  // allow meta to carry entity info (optional)
  const entityType = meta?.entityType ?? null;
  const entityId = meta?.entityId ?? null;

  writeLog({
    action,
    message,
    meta,
    entityType,
    entityId,
    actorUserId,
    ipAddress,
    userAgent,
  });
}

module.exports = { writeLog, logEvent };