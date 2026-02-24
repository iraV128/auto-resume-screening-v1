/**
 * ============================================================
 * Database Configuration – Automated Resume Screening System
 * ------------------------------------------------------------
 * Uses better-sqlite3 (synchronous & lightweight).
 * Database file: backend/db/data.sqlite
 *
 * All tables are created on server startup using IF NOT EXISTS
 * so existing data is NOT overwritten.
 * ============================================================
 */

const Database = require("better-sqlite3");
const path = require("path");

// Absolute path to SQLite file
const dbPath = path.join(__dirname, "data.sqlite");

// Initialize database connection
const db = new Database(dbPath);

/**
 * ============================================================
 * TABLE CREATION
 * ============================================================
 */
db.exec(`
/**
 * -------------------------
 * JOBS TABLE
 * Stores job descriptions created by recruiter
 * -------------------------
 */
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

/**
 * -------------------------
 * RESUMES TABLE
 * Stores uploaded resumes and extracted text
 * -------------------------
 */
CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,               -- stored file name (server)
  originalName TEXT NOT NULL,           -- original uploaded name
  textContent TEXT NOT NULL,            -- raw extracted text
  sanitisedTextContent TEXT,            -- PII-stripped text (bias mitigation)
  createdAt TEXT NOT NULL
);

/**
 * -------------------------
 * RANKINGS TABLE
 * Stores similarity scores between a job and resumes
 * -------------------------
 */
CREATE TABLE IF NOT EXISTS rankings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId INTEGER NOT NULL,
  resumeId INTEGER NOT NULL,
  score REAL NOT NULL,                  -- raw similarity score
  scorePercent REAL NOT NULL,           -- score converted to %
  topTerms TEXT NOT NULL,               -- JSON string of matched keywords
  createdAt TEXT NOT NULL,
  FOREIGN KEY(jobId) REFERENCES jobs(id),
  FOREIGN KEY(resumeId) REFERENCES resumes(id)
);

/**
 * -------------------------
 * FEEDBACK TABLE (FR-10)
 * Stores explainable AI candidate feedback
 * -------------------------
 */
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId INTEGER NOT NULL,
  resumeId INTEGER NOT NULL,
  strengths TEXT NOT NULL,              -- JSON array (matched skills)
  gaps TEXT NOT NULL,                   -- JSON array (missing skills)
  summary TEXT NOT NULL,                -- human-readable explanation
  createdAt TEXT NOT NULL,
  FOREIGN KEY(jobId) REFERENCES jobs(id),
  FOREIGN KEY(resumeId) REFERENCES resumes(id)
);

/**
 * -------------------------
 * LOGS TABLE
 * Stores system activity for audit & traceability
 * -------------------------
 */
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventType TEXT NOT NULL,        -- e.g. JOB_CREATED, RESUME_UPLOADED, RANKING_DONE, ERROR
  message TEXT NOT NULL,          -- human readable log message
  meta TEXT,                      -- JSON string for structured metadata
  createdAt TEXT NOT NULL
);

/**
 * -------------------------
 * USERS TABLE (AUTH + JWT + RBAC)
 * Stores user accounts for login, and role for RBAC
 * -------------------------
 * Notes:
 * - password_hash stores bcrypt hash (NEVER store plain password)
 * - role supports RBAC checks: jobseeker / recruiter / admin
 * - createdAt used for auditing and admin reporting
 */
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  role TEXT NOT NULL DEFAULT 'jobseeker'
    CHECK(role IN ('jobseeker', 'recruiter', 'admin')),

  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

/**
 * -------------------------
 * INDEXES
 * Improves performance for filtering logs & user lookups
 * -------------------------
 */
CREATE INDEX IF NOT EXISTS idx_logs_eventType ON logs(eventType);
CREATE INDEX IF NOT EXISTS idx_logs_createdAt ON logs(createdAt);

-- Fast login lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

/**
 * ============================================================
 * LIGHTWEIGHT MIGRATION SECTION
 * ------------------------------------------------------------
 * If the database already exists, CREATE TABLE will NOT modify
 * existing tables. Therefore we manually check for missing
 * columns and add them safely.
 * ============================================================
 */

try {
  /**
   * -------------------------
   * MIGRATION: resumes.sanitisedTextContent (bias mitigation)
   * -------------------------
   */
  const resumeCols = db.prepare(`PRAGMA table_info(resumes)`).all();
  const hasSanitised = resumeCols.some((c) => c.name === "sanitisedTextContent");

  // Add column only if missing
  if (!hasSanitised) {
    db.exec(`ALTER TABLE resumes ADD COLUMN sanitisedTextContent TEXT;`);
    console.log("DB MIGRATION: Added resumes.sanitisedTextContent");
  }

  /**
   * -------------------------
   * MIGRATION: users table (Auth + RBAC)
   * -------------------------
   * If someone previously created a users table without role/createdAt,
   * we add missing columns safely here.
   */
  const userCols = db.prepare(`PRAGMA table_info(users)`).all();

  // If users table doesn't exist yet, PRAGMA returns [].
  // In that case, table creation above already handled it.
  if (userCols.length > 0) {
    const hasRole = userCols.some((c) => c.name === "role");
    const hasCreatedAt = userCols.some((c) => c.name === "createdAt");

    if (!hasRole) {
      // Add role column default jobseeker (RBAC)
      db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'jobseeker';`);
      console.log("DB MIGRATION: Added users.role");
    }

    if (!hasCreatedAt) {
      // Add createdAt column for audit trails
      db.exec(`ALTER TABLE users ADD COLUMN createdAt TEXT NOT NULL DEFAULT (datetime('now'));`);
      console.log("DB MIGRATION: Added users.createdAt");
    }

    // (Optional note) SQLite cannot easily add CHECK constraints via ALTER TABLE.
    // We enforce allowed roles in app logic + initial CREATE TABLE CHECK above.
  }
} catch (e) {
  console.error("DB MIGRATION ERROR:", e);
}

/**
 * Export database instance for use in routes & services
 */
module.exports = db;