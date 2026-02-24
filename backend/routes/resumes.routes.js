// backend/routes/resumes.routes.js
// FR-13: Logging + Auditing for resume uploads (success + errors)

const { logEvent } = require("../services/log.service");
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// pdf-parse sometimes exports as { default: fn } depending on version
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;

const mammoth = require("mammoth");
const db = require("../db/database");

// ✅ Bias mitigation helper: create sanitisedTextContent (PII stripped)
const { stripPII } = require("../services/pii.service");

// Ensure uploads folder exists (runtime folder)
const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Save uploaded files to /uploads with a timestamp prefix
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

/**
 * Extract text from PDF/DOCX.
 * NOTE: Some PDFs can fail with pdf.js errors (e.g., "bad XRef entry").
 * We handle that gracefully and return a clear message (so app doesn't crash).
 */
async function parseFileToText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  // --- PDF parsing ---
  if (ext === ".pdf") {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return (data.text || "").trim();
    } catch (err) {
      console.error("PDF PARSE ERROR:", err.message);
      throw new Error("PDF parsing failed (bad XRef). Please upload DOCX instead.");
    }
  }

  // --- DOCX parsing ---
  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return (result.value || "").trim();
  }

  // Unsupported file type
  throw new Error("Only PDF and DOCX supported");
}

// Upload resume endpoint
router.post("/upload", upload.single("resume"), async (req, res) => {
  // Debug line (you can remove later)
  console.log("UPLOAD ROUTE HIT");

  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    // 1) Parse file into raw text (PDF/DOCX)
    const textContent = await parseFileToText(file.path, file.originalname);
    if (!textContent.trim()) {
      return res.status(400).json({ error: "Could not extract text" });
    }

    // ✅ 2) Step 3: Create sanitised text (PII stripped) and store it
    const sanitisedTextContent = stripPII(textContent);

    // ✅ Step 4: Calculate safe proof metrics (NO sensitive content logged)
    // We only log lengths + reduction %, which proves bias mitigation ran.
    const rawLen = textContent.length;
    const cleanLen = sanitisedTextContent.length;
    const reductionChars = Math.max(0, rawLen - cleanLen);
    const reductionPct =
      rawLen > 0 ? Number(((reductionChars / rawLen) * 100).toFixed(2)) : 0;

    // ✅ 3) Save resume record in SQLite (store BOTH raw + sanitised)
    const stmt = db.prepare(`
      INSERT INTO resumes (filename, originalName, textContent, sanitisedTextContent, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      file.filename,
      file.originalname,
      textContent,
      sanitisedTextContent,
      new Date().toISOString()
    );

    // ✅ FR-13: Log successful resume upload (auditable event)
    logEvent("RESUME_UPLOADED", "Resume uploaded", {
      resumeId: info.lastInsertRowid,
      originalName: file.originalname,
      filename: file.filename,
      sanitisedStored: true, // evidence flag (doesn't leak PII)
    });

    // ✅ Step 4: Proof log — bias mitigation applied
    // This is the main evidence you can cite in your report/demo.
    logEvent("BIAS_MITIGATION_APPLIED", "PII stripped and sanitised text stored", {
      resumeId: info.lastInsertRowid,
      rawLen,
      cleanLen,
      reductionChars,
      reductionPct,
    });

    res.json({ id: info.lastInsertRowid, originalName: file.originalname });
  } catch (e) {
    console.error("UPLOAD ERROR:", e);

    // ✅ FR-13: Log error events (auditable failures)
    logEvent("ERROR", e.message, { route: "resumes/upload" });

    res.status(500).json({ error: e.message });
  }
});

// List uploaded resumes
router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id, originalName, createdAt FROM resumes ORDER BY id DESC")
    .all();
  res.json(rows);
});

// Debug: check stored raw vs sanitised lengths
router.get("/debug/:id", (req, res) => {
  const row = db.prepare(`
    SELECT
      id,
      originalName,
      LENGTH(textContent) AS rawLen,
      LENGTH(sanitisedTextContent) AS cleanLen
    FROM resumes
    WHERE id = ?
  `).get(req.params.id);

  res.json(row);
});

module.exports = router;
