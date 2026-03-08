// src/pages/RecruiterJobs.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/AppShell";
import { apiFetch } from "../api";

const LS_LAST_ANALYSIS = "recruiter:lastAnalysis";

function saveLastAnalysis(durationMs) {
  try {
    localStorage.setItem(
      LS_LAST_ANALYSIS,
      JSON.stringify({ atISO: new Date().toISOString(), durationMs })
    );
  } catch {}
}

export default function RecruiterJobs() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [toast, setToast] = useState(null);

  async function loadJobs() {
    setLoading(true);
    setToast(null);

    try {
      const data = await apiFetch("/api/jobs?scope=recruiter");
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      setJobs([]);
      setToast({ type: "error", msg: e?.message || "Could not load recruiter jobs." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function analyseJob(jobId, jobTitle) {
    setToast({
      type: "info",
      msg: `"${jobTitle || `Job ${jobId}`}" is being analysed, please wait...`,
    });

    const start = performance.now();

    try {
      await apiFetch("/api/analysis/rank", {
        method: "POST",
        body: { jobId },
      });

      const duration = Math.round(performance.now() - start);
      saveLastAnalysis(duration);

      setToast({
        type: "success",
        msg: `Analysis completed successfully for "${jobTitle || `job ${jobId}`}".`,
      });
    } catch (e) {
      setToast({
        type: "error",
        msg: e?.message || "Analysis failed.",
      });
    }
  }

  async function deleteJob(jobId, jobTitle) {
    const confirmed = window.confirm(`Are you sure you want to delete "${jobTitle || "this job"}"?`);
    if (!confirmed) return;

    setToast(null);

    try {
      await apiFetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      setToast({ type: "success", msg: "Job deleted successfully." });
      loadJobs();
    } catch (e) {
      setToast({ type: "error", msg: e?.message || "Failed to delete job." });
    }
  }

  return (
    <AppShell title="Recruiter Jobs" subtitle="Create, manage, and analyse your job listings.">
      {toast && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            border:
              toast.type === "error"
                ? "1px solid rgba(255,0,0,0.35)"
                : toast.type === "info"
                ? "1px solid rgba(255,255,255,0.18)"
                : "1px solid rgba(0,255,120,0.25)",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            {toast.type === "error"
              ? "Error"
              : toast.type === "info"
              ? "Please wait"
              : "Success"}
          </div>
          <div className="muted">{toast.msg}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <Link className="btn" to="/recruiter/jobs/new">+ Create Job</Link>
      </div>

      <div className="card">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Active Jobs</div>

        {loading ? (
          <div className="muted">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="muted">No jobs yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {jobs.map((job) => {
              const id = job.id;
              const closingDate = job.closing_date || job.closingDate || job.dueDate || null;

              return (
                <div key={id} className="card" style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{job.title || "Untitled Job"}</div>
                    <div className="muted">
                      {job.company || ""}
                      {job.location ? ` • ${job.location}` : ""}
                    </div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      Closing date: {closingDate ? new Date(closingDate).toLocaleDateString() : "Not set"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="btn" onClick={() => analyseJob(id, job.title)}>Analyse</button>
                    <Link className="btn" to={`/recruiter/jobs/${id}/rankings`}>Rankings</Link>
                    <Link className="btn" to={`/jobs/${id}`}>View</Link>
                    <Link className="btn" to={`/recruiter/jobs/${id}/edit`}>Edit</Link>
                    <button className="btn" onClick={() => deleteJob(id, job.title)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}