// backend/routes/resumes.routes.js
// ============================================================
// RESUME ROUTES
// ------------------------------------------------------------
// POST /api/resumes/upload
// - Candidate uploads PDF/DOCX resume
// - Max size: 10MB
// - Extract text
// - Strip PII for bias mitigation
// - Store both raw and sanitised text
//
// GET /api/resumes
// - Simple list/debug support
//
// Locked checklist rules:
// - Resume upload should be authenticated
// - PDF/DOCX only
// - Max 10MB
// - Logging + bias-mitigation evidence
// ============================================================

const { logEvent } = require("../services/log.service");
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;

const mammoth = require("mammoth");
const db = require("../db/database");

const { stripPII } = require("../services/pii.service");
const { requireAuth, requireRole } = require("../middleware/auth.middleware");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// ------------------------------------------------------------
// Multer storage
// ------------------------------------------------------------
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// ------------------------------------------------------------
// Backend file validation
// - Accept only PDF / DOC / DOCX
// - Max size 10MB
// ------------------------------------------------------------
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || "").toLowerCase();

  const allowed = [".pdf", ".doc", ".docx"];
  if (!allowed.includes(ext)) {
    return cb(new Error("Only PDF and DOCX files are allowed"));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

// ------------------------------------------------------------
// Parse uploaded file into plain text
// ------------------------------------------------------------
async function parseFileToText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return (data.text || "").trim();
    } catch (err) {
      console.error("PDF PARSE ERROR:", err.message);
      throw new Error("PDF parsing failed. Please upload DOCX instead.");
    }
  }

  // DOCX is the main supported Word format
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || "").trim();
  }

  // Keep strict message for unsupported formats
  throw new Error("Only PDF and DOCX supported");
}

// ------------------------------------------------------------
// POST /api/resumes/upload
// Candidate-only for real apply flow
// Multer runs before controller logic
// ------------------------------------------------------------
router.post(
  "/upload",
  requireAuth,
  requireRole("jobseeker"),
  (req, res, next) => {
    upload.single("resume")(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Resume must be 10MB or smaller" });
        }
        return res.status(400).json({ error: err.message || "Upload failed" });
      }

      if (err) {
        return res.status(400).json({ error: err.message || "Invalid file upload" });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Extract text from file
      const textContent = await parseFileToText(file.path, file.originalname);

      if (!textContent.trim()) {
        return res.status(400).json({ error: "Could not extract text from resume" });
      }

      // Strip PII before ranking
      const sanitisedTextContent = stripPII(textContent);

      // Bias mitigation stats for evidence/logging
      const rawLen = textContent.length;
      const cleanLen = sanitisedTextContent.length;
      const reductionChars = Math.max(0, rawLen - cleanLen);
      const reductionPct =
        rawLen > 0
          ? Number(((reductionChars / rawLen) * 100).toFixed(2))
          : 0;

      const userId = req.user?.id ?? null;

      // Save resume
      const stmt = db.prepare(`
        INSERT INTO resumes (
          userId,
          filename,
          originalName,
          content,
          sanitisedTextContent,
          createdAt
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        userId,
        file.filename,
        file.originalname,
        textContent,
        sanitisedTextContent,
        new Date().toISOString()
      );

      const resumeId = info.lastInsertRowid;

      // Audit log: upload
      logEvent(
        "RESUME_UPLOADED",
        "Resume uploaded",
        {
          entityType: "resume",
          entityId: resumeId,
          originalName: file.originalname,
          filename: file.filename,
          userId,
        },
        req,
        userId
      );

      // Audit log: PII stripping / bias mitigation
      logEvent(
        "BIAS_MITIGATION_APPLIED",
        "PII stripped and sanitised text stored",
        {
          entityType: "resume",
          entityId: resumeId,
          rawLen,
          cleanLen,
          reductionChars,
          reductionPct,
        },
        req,
        userId
      );

      return res.json({
        id: resumeId,
        originalName: file.originalname,
        message: "Resume uploaded successfully",
      });
    } catch (e) {
      console.error("UPLOAD ERROR:", e);

      logEvent(
        "ERROR",
        e.message,
        { entityType: "resume", route: "resumes/upload" },
        req,
        req.user?.id ?? null
      );

      return res.status(500).json({ error: e.message || "Resume upload failed" });
    }
  }
);

// ------------------------------------------------------------
// GET /api/resumes
// Simple list for testing/debug
// ------------------------------------------------------------
router.get("/", requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT id, originalName, createdAt FROM resumes ORDER BY id DESC")
    .all();

  res.json(rows);
});

// ------------------------------------------------------------
// GET /api/resumes/debug/:id
// Debug helper for raw vs sanitised text lengths
// ------------------------------------------------------------
router.get("/debug/:id", requireAuth, (req, res) => {
  const row = db
    .prepare(`
      SELECT id, originalName,
        LENGTH(content) AS rawLen,
        LENGTH(sanitisedTextContent) AS cleanLen
      FROM resumes
      WHERE id = ?
    `)
    .get(req.params.id);

  res.json(row || null);
});

// ------------------------------------------------------------
// GET /api/resumes/:id/download
// Recruiter/Admin can download a resume file
// Candidate can only download their own resume
// ------------------------------------------------------------
router.get("/:id/download", requireAuth, (req, res) => {
  try {
    const resumeId = Number(req.params.id);

    if (!Number.isFinite(resumeId)) {
      return res.status(400).json({ error: "Invalid resume id" });
    }

    const resume = db
      .prepare(`
        SELECT id, userId, filename, originalName
        FROM resumes
        WHERE id = ?
      `)
      .get(resumeId);

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Access rules:
    // - recruiter/admin can download
    // - candidate/jobseeker can only download their own resume
    if (req.user.role === "jobseeker" && Number(resume.userId) !== Number(req.user.id)) {
      return res.status(403).json({ error: "You do not have permission to access this resume" });
    }

    if (!["jobseeker", "recruiter", "admin"].includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const filePath = path.join(uploadDir, resume.filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Resume file is missing from storage" });
    }

    // Optional audit log
    logEvent(
      "RESUME_DOWNLOADED",
      "Resume downloaded",
      {
        entityType: "resume",
        entityId: resume.id,
        originalName: resume.originalName,
      },
      req,
      req.user?.id ?? null
    );

    return res.download(filePath, resume.originalName || resume.filename);
  } catch (e) {
    console.error("RESUME DOWNLOAD ERROR:", e);
    return res.status(500).json({ error: "Failed to download resume" });
  }
});

module.exports = router;