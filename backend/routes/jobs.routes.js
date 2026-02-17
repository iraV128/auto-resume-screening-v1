const router = require("express").Router();
const db = require("../db/database");

router.post("/", (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).json({ error: "title and description required" });

  const stmt = db.prepare("INSERT INTO jobs (title, description, createdAt) VALUES (?, ?, ?)");
  const info = stmt.run(title, description, new Date().toISOString());
  res.json({ id: info.lastInsertRowid });
});

router.get("/", (req, res) => {
  const jobs = db.prepare("SELECT * FROM jobs ORDER BY id DESC").all();
  res.json(jobs);
});

module.exports = router;
