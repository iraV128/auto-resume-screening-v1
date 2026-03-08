// backend/server.js
// ============================================================
// SERVER ENTRY POINT
// ------------------------------------------------------------
// - Loads env vars
// - Enables CORS
// - Parses JSON/body
// - Mounts all route modules
// - Health check + global error handler
// ============================================================

//Shows which backend folder is actually active
console.log("RUNNING FROM:", __dirname);
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";

// ------------------------------------------------------------
// CORS
// Allow frontend to call backend API
// ------------------------------------------------------------
app.use(
  cors({
    origin: [FRONTEND_ORIGIN],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ------------------------------------------------------------
// Body parsers
// ------------------------------------------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ------------------------------------------------------------
// Helper: ensure route modules export an Express router
// ------------------------------------------------------------
function requireRouter(relativePath) {
  const mod = require(relativePath);

  // CommonJS export: module.exports = router
  if (typeof mod === "function") return mod;

  // Alternate export style: exports.router = router
  if (mod && typeof mod.router === "function") return mod.router;

  // Wrapped default export
  if (mod && typeof mod.default === "function") return mod.default;

  throw new Error(
    `Route module "${relativePath}" did not export an Express router function. ` +
      `Fix: end the file with "module.exports = router;". Got: ${typeof mod}`
  );
}

// ------------------------------------------------------------
// Basic root endpoint for quick testing
// ------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("ARS backend is running");
});

// ------------------------------------------------------------
// API Routes
// ------------------------------------------------------------
app.use("/api/auth", requireRouter("./routes/auth.routes"));
app.use("/api/jobs", requireRouter("./routes/jobs.routes"));
app.use("/api/resumes", requireRouter("./routes/resumes.routes"));
app.use("/api/analysis", requireRouter("./routes/analysis.routes"));
app.use("/api/logs", requireRouter("./routes/logs.routes"));
app.use("/api/applications", requireRouter("./routes/applications.routes"));
app.use("/api/candidate", requireRouter("./routes/candidate.routes"));
app.use("/api/recruiter", requireRouter("./routes/recruiter.routes"));

// ------------------------------------------------------------
// Health endpoint
// ------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend is running ✅" });
});

// ------------------------------------------------------------
// Global error handler
// ------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error("❌ Unhandled server error:", err);
  return res.status(500).json({
    error: "Server error",
  });
});

// ------------------------------------------------------------
// Start server
// ------------------------------------------------------------
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});