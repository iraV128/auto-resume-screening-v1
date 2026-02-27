// src/pages/PublicJobDetails.jsx
// ============================================================
// UC-00b: View Job Details (Public)
// - No login required
// - Shows job info + closing date
// - If deadline passed: show "Application Closed" + disable Apply
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser } from "../api";
import AppShell from "../components/Appshell";

export default function PublicJobDetails() {
  const { jobId } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await apiFetch(`/api/jobs/${jobId}`);
        setJob(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId]);

  // Deadline check (UC-00b exception E1)
  const isClosed = useMemo(() => {
    if (!job?.closing_date) return false;
    return new Date(job.closing_date) < new Date();
  }, [job]);

  function handleApply() {
    // UC-03: Apply to job (upload resume)
    // If not logged in -> redirect to login first
    const user = getUser();
    if (!user) {
      // After login you can redirect back later (optional improvement)
      navigate("/login", { replace: true });
      return;
    }
    // Logged in -> go to upload page
    navigate(`/jobs/${jobId}/apply`);
  }

  return (
    <AppShell title="Job Details" subtitle="Review details and apply before the closing date.">
      {loading && <div className="muted">Loading job details...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && job && (
        <div className="card">
          <h3>{job.title}</h3>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span className={`badge ${isClosed ? "badge-danger" : "badge-ok"}`}>
              {isClosed ? "Application Closed" : "Open"}
            </span>

            <span className="badge">
              Closing date: {job.closing_date ? new Date(job.closing_date).toLocaleDateString() : "Not set"}
            </span>
          </div>

          <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {job.description || "No description provided."}
          </div>

          <div style={{ height: 14 }} />

          {/* Apply button behaviour from UC-00b exception */}
          <button className="btn-primary" onClick={handleApply} disabled={isClosed}>
            {isClosed ? "Applications Closed" : "Apply / Upload Resume"}
          </button>

          {/* Wireframe: show ethical/bias note */}
          <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
            Personal data will not influence ranking (PII is removed before scoring).
          </div>
        </div>
      )}
    </AppShell>
  );
}