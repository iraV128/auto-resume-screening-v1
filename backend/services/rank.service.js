const { spawn } = require("child_process");
const path = require("path");

/**
 * Calls Python TF-IDF scoring service.
 * 
 * IMPORTANT:
 * - This service ONLY handles scoring.
 * - Bias mitigation (PII stripping) is now handled
 *   in the ranking route layer (analysis.routes.js).
 * 
 * This keeps separation of concerns clean:
 * Route layer → preprocessing
 * Service layer → scoring engine
 */
function scoreWithTfidf(jobText, resumeText) {
  return new Promise((resolve, reject) => {

    // 🔹 Locate Python scoring script
    const scriptPath = path.join(__dirname, "..", "python", "score_tfidf.py");

    // Spawn Python child process
    const py = spawn("python", [scriptPath]);

    let out = "";
    let err = "";

    // Capture Python output
    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));

    // When Python process finishes
    py.on("close", (code) => {
      if (code !== 0) {
        // If Python failed, reject with error
        return reject(new Error(err || "Python failed"));
      }

      try {
        // Parse JSON result returned from Python
        resolve(JSON.parse(out));
      } catch (parseError) {
        reject(new Error("Invalid JSON returned from Python"));
      }
    });

    // 🔹 Send RAW text to Python
    // (Text is already cleaned in analysis.routes.js)
    py.stdin.write(
      JSON.stringify({
        jobText,
        resumeText,
      })
    );

    py.stdin.end();
  });

  
}

module.exports = { scoreWithTfidf };
