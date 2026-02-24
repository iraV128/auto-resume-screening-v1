/**
 * ============================================================
 * AUTH + RBAC MIDDLEWARE
 * ------------------------------------------------------------
 * requireAuth:
 *  - Verifies JWT and attaches decoded payload to req.user
 *
 * requireRole:
 *  - Allows only specified roles to access a route
 * ============================================================
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

/**
 * Require Authentication (JWT)
 * Header: Authorization: Bearer <token>
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const parts = authHeader.split(" ");
  const token = parts.length === 2 ? parts[1] : null;

  if (!token) {
    return res.status(401).json({ error: "Invalid Authorization format" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, iat, exp }
    return next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

/**
 * Require Role (RBAC)
 * Usage:
 *   router.get("/", requireAuth, requireRole("admin"), handler)
 *   router.post("/", requireAuth, requireRole("recruiter","admin"), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Forbidden: requires role ${allowedRoles.join(" or ")}`
      });
    }

    return next();
  };
}

// ✅ Export BOTH functions (this is what fixes "requireRole is not a function")
module.exports = { requireAuth, requireRole };