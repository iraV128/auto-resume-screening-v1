require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/jobs", require("./routes/jobs.routes"));
app.use("/api/resumes", require("./routes/resumes.routes"));
app.use("/api/analysis", require("./routes/analysis.routes"));

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log("Backend running on port", PORT));
