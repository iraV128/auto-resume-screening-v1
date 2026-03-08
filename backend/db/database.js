// backend/db/database.js
// ============================================================
// Option B Schema: separate rankings + feedback tables
// Also includes applications table for apply flow.
// Designed to align routes + stop current DB errors.
// ============================================================

const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "data.sqlite");
console.log("USING DB:", dbPath);
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function initDb() {
  db.transaction(() => {
    // USERS
    db.prepare(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        passwordHash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'jobseeker'
          CHECK (role IN ('jobseeker','recruiter','admin')),
        failedAttempts INTEGER NOT NULL DEFAULT 0,
        lockUntil INTEGER
      )
    `).run();

    // JOBS (FR-06)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recruiterId INTEGER,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT NOT NULL,
        description TEXT NOT NULL,
        dueDate TEXT NOT NULL,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (recruiterId) REFERENCES users(id) ON DELETE SET NULL
      )
    `).run();

    // RESUMES (FR-05 + FR-08 bias mitigation)
    // Keep BOTH filename and originalName to avoid query mismatches.
    db.prepare(`
      CREATE TABLE IF NOT EXISTS resumes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        filename TEXT NOT NULL,
        originalName TEXT,
        content TEXT NOT NULL,
        sanitisedTextContent TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
      )
    `).run();

    // APPLICATIONS (UC-03 apply flow)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId INTEGER NOT NULL,
        userId INTEGER NOT NULL,
        resumeId INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'submitted'
          CHECK (status IN ('submitted','reviewed','shortlisted','rejected')),
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE,
        UNIQUE(jobId, userId)
      )
    `).run();

    // RANKINGS (FR-08/FR-09)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS rankings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId INTEGER NOT NULL,
        resumeId INTEGER NOT NULL,
        score REAL NOT NULL,
        breakdown TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE,
        UNIQUE(jobId, resumeId)
      )
    `).run();

    // FEEDBACK (FR-10)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        jobId INTEGER NOT NULL,
        resumeId INTEGER NOT NULL,
        summary TEXT,
        strengths TEXT,
        gaps TEXT,
        recommendations TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE,
        FOREIGN KEY (resumeId) REFERENCES resumes(id) ON DELETE CASCADE,
        UNIQUE(jobId, resumeId)
      )
    `).run();

    // LOGS (FR-13) — make inserts impossible to fail
    // Use actorUserId because your current code has been inserting that.
    db.prepare(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        message TEXT NOT NULL,
        meta TEXT,
        entityType TEXT,
        entityId INTEGER,
        actorUserId INTEGER,
        ipAddress TEXT,
        userAgent TEXT,
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (actorUserId) REFERENCES users(id) ON DELETE SET NULL
      )
    `).run();

    // Seed admin (demo + marking)
    const adminExists = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
    if (!adminExists) {
      const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@test.com";
      const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";
      const hash = bcrypt.hashSync(adminPassword, 10);

      db.prepare(
        "INSERT INTO users (username, email, passwordHash, role) VALUES (?, ?, ?, 'admin')"
      ).run("Admin", adminEmail, hash);

      console.log("✅ Seeded admin:", adminEmail, "/", adminPassword);
    }
  })();
}

initDb();
module.exports = db;