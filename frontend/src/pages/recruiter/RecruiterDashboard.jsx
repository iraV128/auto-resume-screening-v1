// src/pages/recruiter/RecruiterDashboard.jsx
// ============================================================
// Wireframe 3: Recruiter Dashboard (SME usability)
// Must include 4 panels + metrics cards:
// - Active Jobs
// - Applications Received
// - Quick Actions (Create Job / Analyse Now)
// - Summary Analytics (Total apps, Avg score, Top skill, Analysis time)
// ============================================================

import AppShell from "../../components/Appshell";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api";

export default function RecruiterDashboard() {
  // NOTE: For now UI-only (design first).
  // Next step we wire real numbers via API endpoints.
// Quick fix: hardcode jobId for now (later we make dropdown)
const selectedJobId = 1;

const [running, setRunning] = useState(false);
const [msg, setMsg] = useState("");
const navigate = useNavigate();

async function handleAnalyseNow() {
  setRunning(true);
  setMsg("");

  try {
    // Calls backend: POST /api/analysis/rank
    await apiFetch("/api/analysis/rank", {
      method: "POST",
      body: { jobId: selectedJobId },
    });

    // After ranking, go straight to Rankings page (Wireframe 6)
    navigate(`/recruiter/jobs/${selectedJobId}/rankings`);
  } catch (e) {
    setMsg(e.message);
  } finally {
    setRunning(false);
  }
}


  return (
    <AppShell
      title="Recruiter Dashboard"
      subtitle="Create jobs, review applications, analyse resumes, and view explainable rankings."
    >
      {/* Top metric cards (visual polish for HD marking) */}
      <div className="grid dashboard-4cards">
        <div className="card">
          <div className="muted">Total Applications</div>
          <h2 style={{ marginTop: 6 }}>—</h2>
          <div className="muted" style={{ fontSize: 12 }}>Across all active jobs</div>
        </div>

        <div className="card">
          <div className="muted">Avg Match Score</div>
          <h2 style={{ marginTop: 6 }}>—</h2>
          <div className="muted" style={{ fontSize: 12 }}>Shows ranking quality</div>
        </div>

        <div className="card">
          <div className="muted">Top Skill Frequency</div>
          <h2 style={{ marginTop: 6 }}>—</h2>
          <div className="muted" style={{ fontSize: 12 }}>Most common skill found</div>
        </div>

        <div className="card">
          <div className="muted">Analysis Time</div>
          <h2 style={{ marginTop: 6 }}>—</h2>
          <div className="muted" style={{ fontSize: 12 }}>Performance (NFR)</div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {/* 2-column dashboard panels */}
      <div className="grid dashboard-2col">
        {/* Panel 1: Active Jobs */}
        <div className="card">
          <h3>📌 Active Jobs</h3>
          <div className="muted" style={{ fontSize: 13 }}>
            Shows jobs that are open (closing date not passed).
          </div>

          <div style={{ height: 10 }} />

          {/* Placeholder list (we will wire /api/jobs next) */}
          <div className="muted">No jobs loaded yet (UI ready).</div>
        </div>

        {/* Right column: Quick actions + Applications summary */}
        <div className="grid">
          {/* Panel 2: Applications Received */}
          <div className="card">
            <h3>📥 Applications Received</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              Total resumes submitted to your jobs.
            </div>
            <div style={{ marginTop: 10 }}>
              <span className="badge">New: —</span>{" "}
              <span className="badge">Pending analysis: —</span>
            </div>
          </div>

          {/* Panel 3: Quick Actions */}
          <div className="card">
            <h3>⚙ Quick Actions</h3>
            <div className="grid">
                {/* Create Job button (leave as UI only for now) */}
                <button className="btn-primary">
                    + Create Job
                </button>
                {/* Analyse Now button (CONNECTED to backend ranking) */}
                <button
                    onClick={handleAnalyseNow}
                    disabled={running}
                    className="btn-secondary"
                >
                    {running ? "Analysing..." : "Analyse Now"}
                </button>

                {/* Error message if ranking fails */}
                {msg && (
                    <div className="error" style={{ marginTop: 8 }}>
                    {msg}
                    </div>
                )}
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
              Tip: “Analyse Now” runs TF-IDF scoring + logs ranking events.
            </div>
          </div>

          {/* Panel 4: Summary Analytics */}
          <div className="card">
            <h3>📊 Summary Analytics</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              Visual summary supports explainability and SME usability.
            </div>

            {/* Placeholder chart blocks (later we can add real charts) */}
            <div style={{ height: 10 }} />
            <div className="card" style={{ padding: 10 }}>
              <div className="muted" style={{ fontSize: 12 }}>Top 10 Skills (bar chart placeholder)</div>
              <div style={{ height: 80 }} />
            </div>
          </div>
        </div>
        
      </div>
    </AppShell>
  );
}