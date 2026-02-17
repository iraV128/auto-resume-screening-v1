const { spawn } = require("child_process");
const path = require("path");

function scoreWithTfidf(jobText, resumeText) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "python", "score_tfidf.py");
    const py = spawn("python", [scriptPath]);

    let out = "";
    let err = "";

    py.stdout.on("data", (d) => (out += d.toString()));
    py.stderr.on("data", (d) => (err += d.toString()));

    py.on("close", (code) => {
      if (code !== 0) return reject(new Error(err || "Python failed"));
      resolve(JSON.parse(out));
    });

    py.stdin.write(JSON.stringify({ jobText, resumeText }));
    py.stdin.end();
  });
}

module.exports = { scoreWithTfidf };
