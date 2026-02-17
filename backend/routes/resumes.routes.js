const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const db = require("../db/database");

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

async function parseFileToText(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".pdf") {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text || "";
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || "";
  }

  throw new Error("Only PDF and DOCX supported");
}

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const textContent = await parseFileToText(file.path, file.originalname);
    if (!textContent.trim()) return res.status(400).json({ error: "Could not extract text" });

    const stmt = db.prepare("INSERT INTO resumes (filename, originalName, textContent, createdAt) VALUES (?, ?, ?, ?)");
    const info = stmt.run(file.filename, file.originalname, textContent, new Date().toISOString());

    res.json({ id: info.lastInsertRowid, originalName: file.originalname });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT id, originalName, createdAt FROM resumes ORDER BY id DESC").all();
  res.json(rows);
});

module.exports = router;
