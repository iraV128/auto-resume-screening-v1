// backend/middleware/auth.middleware.js
// ============================================================
// AUTH + RBAC Middleware
// - requireAuth: verifies JWT, puts decoded payload on req.user
// - requireRole: blocks access unless role is allowed
// ============================================================

const jwt = require("jsonwebtoken");

// ✅ IMPORTANT: must match auth.routes.js secret
// In production: set JWT_SECRET in .env
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_later";

/**
 * Require Authentication (JWT)
 * Header: Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || "";

  // Must exist
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  // Must be Bearer token
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Invalid Authorization format (use Bearer token)" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, iat, exp }
    return next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require Role (RBAC)
 * Usage:
 * router.get("/", requireAuth, requireRole("admin"), handler)
 * router.post("/", requireAuth, requireRole("recruiter", "admin"), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) return res.status(401).json({ error: "Not authenticated" });

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Forbidden: requires role ${allowedRoles.join(" or ")}`,
      });
    }

    return next();
  };
}

module.exports = { requireAuth, requireRole };