import { useEffect, useState } from "react";

export default function App() {
  const [jobs, setJobs] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resumes, setResumes] = useState([]);
  const [file, setFile] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [rankings, setRankings] = useState([]);
  const [msg, setMsg] = useState("");

  async function loadJobs() {
    const r = await fetch("http://localhost:5050/api/jobs");
    setJobs(await r.json());
  }

  async function loadResumes() {
    const r = await fetch("http://localhost:5050/api/resumes");
    setResumes(await r.json());
  }

  useEffect(() => {
    loadJobs();
    loadResumes();
  }, []);

  async function createJob() {
    setMsg("");
    const r = await fetch("http://localhost:5050/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error);
    setTitle("");
    setDescription("");
    setMsg("Job created!");
    loadJobs();
  }

  async function uploadResume() {
    setMsg("");
    if (!file) return setMsg("Please choose a file first.");

    const fd = new FormData();
    fd.append("resume", file);

    const r = await fetch("http://localhost:5050/api/resumes/upload", {
      method: "POST",
      body: fd,
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error);
    setMsg("Resume uploaded!");
    setFile(null);
    loadResumes();
  }

  async function rankResumes() {
    setMsg("");
    if (!selectedJobId) return setMsg("Choose a job first.");

    const r = await fetch("http://localhost:5050/api/analysis/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: Number(selectedJobId) }),
    });
    const data = await r.json();
    if (!r.ok) return setMsg(data.error);

    setRankings(data.results);
    setMsg("Ranking done!");
  }

  return (
    <div style={{ fontFamily: "Arial", padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h2>Automated Resume Screening Tool (Simple Build)</h2>

      {msg && <p><b>{msg}</b></p>}

      <hr />
      <h3>1) Create Job Description</h3>
      <input
        placeholder="Job Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <textarea
        placeholder="Job Description..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={6}
        style={{ width: "100%", padding: 8, marginTop: 8 }}
      />
      <button onClick={createJob} style={{ padding: "10px 14px", marginTop: 8 }}>
        Create Job
      </button>

      <hr />
      <h3>2) Upload Resume (PDF/DOCX)</h3>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={uploadResume} style={{ padding: "10px 14px", marginLeft: 10 }}>
        Upload
      </button>

      <p style={{ marginTop: 8 }}>
        <b>Uploaded resumes:</b> {resumes.map(r => r.originalName).join(", ")}
      </p>

      <hr />
      <h3>3) Rank Candidates</h3>
      <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
        <option value="">-- select a job --</option>
        {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
      </select>

      <button onClick={rankResumes} style={{ padding: "10px 14px", marginLeft: 10 }}>
        Analyse / Rank
      </button>

      <hr />
      <h3>Results (Ranked)</h3>
      {rankings.length === 0 ? (
        <p>No ranking yet.</p>
      ) : (
        <ol>
          {rankings.map(r => (
            <li key={r.resumeId} style={{ marginBottom: 12 }}>
              <b>{r.resumeName}</b> — <b>{r.scorePercent}%</b>
              <div>Top terms: {r.topTerms.join(", ")}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
