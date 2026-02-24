/**
 * ============================================================
 * AUTH ROUTES – Register & Login
 * ------------------------------------------------------------
 * Responsibilities:
 *  - Register new users (with hashed passwords)
 *  - Authenticate users
 *  - Generate JWT tokens
 *
 * Security:
 *  - Passwords hashed using bcrypt
 *  - JWT signed using environment secret
 *  - Token expires in 1 hour
 * ============================================================
 */

const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../db/database");

// Use secret from .env (fallback only for development)
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";


/**
 * ============================================================
 * POST /api/auth/register
 * ------------------------------------------------------------
 * Creates a new user account
 * Flow:
 *  1. Validate input
 *  2. Check duplicate email
 *  3. Hash password
 *  4. Insert into database
 * ============================================================
 */
router.post("/register", async (req, res) => {
  try {
    // Safe destructuring (prevents crash if body undefined)
    const { username, email, password, role } = req.body || {};

    // Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        error: "username, email and password are required"
      });
    }

    /**
     * --------------------------------------------------------
     * STEP 1: Check if email already exists
     * --------------------------------------------------------
     * This avoids relying on SQLite error messages.
     */
    const existingUser = db
      .prepare(`SELECT id FROM users WHERE email = ?`)
      .get(email);

    if (existingUser) {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    /**
     * --------------------------------------------------------
     * STEP 2: Restrict allowed roles (RBAC safety)
     * --------------------------------------------------------
     * Prevents invalid roles like "superadmin"
     */
    const allowedRoles = ["jobseeker", "recruiter", "admin"];
    const userRole =
      role && allowedRoles.includes(role)
        ? role
        : "jobseeker";

    /**
     * --------------------------------------------------------
     * STEP 3: Hash password (bcrypt)
     * --------------------------------------------------------
     * 10 salt rounds = secure & standard for projects
     */
    const password_hash = await bcrypt.hash(password, 10);

    /**
     * --------------------------------------------------------
     * STEP 4: Insert user into database
     * --------------------------------------------------------
     */
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `).run(username, email, password_hash, userRole);

    return res.json({
      message: "User registered successfully"
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);

    /**
     * Fallback safety:
     * In case SQLite still throws constraint error
     */
    if (
      err.code === "SQLITE_CONSTRAINT" ||
      err.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return res.status(409).json({
        error: "Email already registered"
      });
    }

    return res.status(500).json({
      error: "Registration failed"
    });
  }
});

/**
 * ============================================================
 * POST /api/auth/login
 * ------------------------------------------------------------
 * Authenticates user
 * Flow:
 *  1. Validate input
 *  2. Check email exists
 *  3. Compare password
 *  4. Generate JWT token
 *  5. Return token + user info (for frontend storage)
 * ============================================================
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "email and password required"
      });
    }

    /**
     * --------------------------------------------------------
     * STEP 1: Find user by email
     * --------------------------------------------------------
     */
    const user = db
      .prepare(`SELECT * FROM users WHERE email = ?`)
      .get(email);

    if (!user) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    /**
     * --------------------------------------------------------
     * STEP 2: Compare password with hashed password
     * --------------------------------------------------------
     */
    const validPassword = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(400).json({
        error: "Invalid credentials"
      });
    }

    /**
     * --------------------------------------------------------
     * STEP 3: Generate JWT token
     * --------------------------------------------------------
     * Payload includes:
     *   - id
     *   - role (used later for RBAC)
     */
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    /**
     * --------------------------------------------------------
     * STEP 4 (NEW – PART 6.2):
     * Return user object along with token
     *
     * Why?
     * - Frontend needs role to control UI
     * - Avoid decoding JWT manually
     * - Cleaner role-based rendering
     * --------------------------------------------------------
     */
    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);

    return res.status(500).json({
      error: "Login failed"
    });
  }
});


module.exports = router;