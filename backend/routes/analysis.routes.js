const router = require("express").Router();
const db = require("../db/database");
const { scoreWithTfidf } = require("../services/rank.service");

router.post("/rank", async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ error: "jobId required" });

    const job = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const resumes = db.prepare("SELECT * FROM resumes").all();
    if (resumes.length === 0) return res.status(400).json({ error: "No resumes uploaded" });

    // Clear old rankings for this job
    db.prepare("DELETE FROM rankings WHERE jobId = ?").run(jobId);

    const insert = db.prepare(`
      INSERT INTO rankings (jobId, resumeId, score, scorePercent, topTerms, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let results = [];
    for (const r of resumes) {
      const scoreResult = await scoreWithTfidf(job.description, r.textContent);
      insert.run(
        jobId,
        r.id,
        scoreResult.score,
        scoreResult.scorePercent,
        JSON.stringify(scoreResult.topTerms),
        new Date().toISOString()
      );
      results.push({
        resumeId: r.id,
        resumeName: r.originalName,
        scorePercent: scoreResult.scorePercent,
        topTerms: scoreResult.topTerms,
      });
    }

    results.sort((a, b) => b.scorePercent - a.scorePercent);
    res.json({ jobId, results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/rankings/:jobId", (req, res) => {
  const jobId = Number(req.params.jobId);
  const rows = db.prepare(`
    SELECT rankings.*, resumes.originalName AS resumeName
    FROM rankings
    JOIN resumes ON resumes.id = rankings.resumeId
    WHERE rankings.jobId = ?
    ORDER BY rankings.scorePercent DESC
  `).all(jobId);

  const formatted = rows.map(r => ({
    resumeId: r.resumeId,
    resumeName: r.resumeName,
    scorePercent: r.scorePercent,
    topTerms: JSON.parse(r.topTerms)
  }));

  res.json(formatted);
});

module.exports = router;
