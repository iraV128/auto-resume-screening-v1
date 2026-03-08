// backend/routes/auth.routes.js
// ============================================================
// AUTH ROUTES (Register + Login + Me)
// ------------------------------------------------------------
// Locked checklist alignment:
// - Generic success/error messages for frontend/demo
// - JWT auth
// - Failed login protection
// - FR-13 audit logs
// ============================================================

const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db/database");
const { logEvent } = require("../services/log.service");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_later";

const MAX_FAILED = 3;
const LOCK_MINUTES = 5;
const LOCK_MS = LOCK_MINUTES * 60 * 1000;

// ------------------------------------------------------------
// Create signed JWT token
// ------------------------------------------------------------
function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

// ------------------------------------------------------------
// POST /api/auth/register
// Public registration
// Only allows jobseeker or recruiter
// ------------------------------------------------------------
router.post("/register", (req, res) => {
  try {
    const { username, email, password, role } = req.body || {};

    // Required field validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Registration failed. Please check your details.",
      });
    }

    // Basic password rule
    if (String(password).length < 8) {
      return res.status(400).json({
        error: "Registration failed. Please check your details.",
      });
    }

    const safeEmail = String(email).trim().toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail);

    if (!emailOk) {
      return res.status(400).json({
        error: "Registration failed. Please check your details.",
      });
    }

    // Only allow safe public roles
    const allowedRoles = ["jobseeker", "recruiter"];
    const safeRole = allowedRoles.includes(role) ? role : "jobseeker";

    // Duplicate email check
    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(safeEmail);
    if (existing) {
      return res.status(409).json({
        error: "Registration failed. Please try again.",
      });
    }

    const passwordHash = bcrypt.hashSync(String(password), 10);

    const info = db.prepare(`
      INSERT INTO users (username, email, passwordHash, role)
      VALUES (?, ?, ?, ?)
    `).run(String(username).trim(), safeEmail, passwordHash, safeRole);

    const newUser = {
      id: info.lastInsertRowid,
      username: String(username).trim(),
      email: safeEmail,
      role: safeRole,
    };

    // Audit log
    logEvent(
      "REGISTER",
      "User registered",
      {
        entityType: "user",
        entityId: newUser.id,
        email: safeEmail,
        role: safeRole,
      },
      req,
      newUser.id
    );

    const token = makeToken(newUser);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: newUser,
    });
  } catch (e) {
    console.error("REGISTER error:", e);

    logEvent(
      "ERROR",
      e.message,
      { entityType: "auth", route: "auth/register" },
      req,
      null
    );

    return res.status(500).json({
      error: "Registration failed. Please try again later.",
    });
  }
});

// ------------------------------------------------------------
// POST /api/auth/login
// Public login
// Generic frontend-facing responses
// ------------------------------------------------------------
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Invalid credentials",
      });
    }

    const safeEmail = String(email).trim().toLowerCase();

    const user = db.prepare(`
      SELECT id, username, email, role, passwordHash, failedAttempts, lockUntil
      FROM users
      WHERE email = ?
    `).get(safeEmail);

    // User not found
    if (!user) {
      logEvent(
        "LOGIN_FAIL",
        "Login failed (user not found)",
        { entityType: "auth", email: safeEmail },
        req,
        null
      );

      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    const now = Date.now();

    // Temporary account lock
    if (user.lockUntil && Number(user.lockUntil) > now) {
      logEvent(
        "LOGIN_BLOCKED_LOCKED",
        "Login blocked (account locked)",
        {
          entityType: "user",
          entityId: user.id,
          email: safeEmail,
        },
        req,
        user.id
      );

      return res.status(423).json({
        error: "Invalid credentials",
      });
    }

    const ok = bcrypt.compareSync(String(password), user.passwordHash);

    // Wrong password
    if (!ok) {
      const nextFails = (user.failedAttempts || 0) + 1;

      if (nextFails >= MAX_FAILED) {
        const lockUntil = now + LOCK_MS;

        db.prepare(`
          UPDATE users
          SET failedAttempts = ?, lockUntil = ?
          WHERE id = ?
        `).run(nextFails, lockUntil, user.id);

        logEvent(
          "ACCOUNT_LOCKED",
          "Account locked due to failed login attempts",
          {
            entityType: "user",
            entityId: user.id,
            email: safeEmail,
            failedAttempts: nextFails,
            lockMinutes: LOCK_MINUTES,
          },
          req,
          user.id
        );

        return res.status(423).json({
          error: "Invalid credentials",
        });
      }

      db.prepare(`
        UPDATE users
        SET failedAttempts = ?, lockUntil = NULL
        WHERE id = ?
      `).run(nextFails, user.id);

      logEvent(
        "LOGIN_FAIL",
        "Login failed (wrong password)",
        {
          entityType: "user",
          entityId: user.id,
          email: safeEmail,
          failedAttempts: nextFails,
        },
        req,
        user.id
      );

      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // Successful login: reset counters
    db.prepare(`
      UPDATE users
      SET failedAttempts = 0, lockUntil = NULL
      WHERE id = ?
    `).run(user.id);

    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    logEvent(
      "LOGIN_SUCCESS",
      "Login successful",
      {
        entityType: "user",
        entityId: user.id,
        email: safeEmail,
        role: user.role,
      },
      req,
      user.id
    );

    const token = makeToken(safeUser);

    return res.json({
      message: "Login successful",
      token,
      user: safeUser,
    });
  } catch (e) {
    console.error("LOGIN error:", e);

    logEvent(
      "ERROR",
      e.message,
      { entityType: "auth", route: "auth/login" },
      req,
      null
    );

    return res.status(500).json({
      error: "Login failed. Please try again later.",
    });
  }
});

// ------------------------------------------------------------
// GET /api/auth/me
// Validate token and return current user
// ------------------------------------------------------------
router.get("/me", (req, res) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    const user = db
      .prepare(`SELECT id, username, email, role FROM users WHERE id = ?`)
      .get(payload.id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch {
    return res.status(401).json({ error: "Invalid/expired token" });
  }
});

module.exports = router;