/**
 * ============================================================
 * SERVER CONFIGURATION – Automated Resume Screening System
 * ------------------------------------------------------------
 * - Loads environment variables
 * - Initializes Express app
 * - Applies global middleware
 * - Registers all API routes
 * - Starts backend server
 * ============================================================
 */

require("dotenv").config(); // Load .env variables

const express = require("express");
const cors = require("cors");

const app = express();

/**
 * ============================================================
 * GLOBAL MIDDLEWARE (MUST COME BEFORE ROUTES)
 * ------------------------------------------------------------
 * - cors() allows frontend to call backend
 * - express.json() parses incoming JSON body
 *   Without this, req.body will be undefined
 * ============================================================
 */
app.use(cors());
app.use(express.json({ limit: "5mb" })); // Allows up to 5MB JSON payload

/**
 * ============================================================
 * ROUTES
 * ------------------------------------------------------------
 * All API routes are mounted here
 * ============================================================
 */

// Auth (Register / Login)
const authRoutes = require("./routes/auth.routes");
app.use("/api/auth", authRoutes);

// Core system routes
app.use("/api/jobs", require("./routes/jobs.routes"));
app.use("/api/resumes", require("./routes/resumes.routes"));
app.use("/api/analysis", require("./routes/analysis.routes"));
app.use("/api/logs", require("./routes/logs.routes"));

/**
 * ============================================================
 * HEALTH CHECK ROUTE
 * Used to confirm backend is running
 * ============================================================
 */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/**
 * ============================================================
 * START SERVER
 * ============================================================
 */
const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});