// src/pages/PublicJobDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser } from "../api";
import AppShell from "../components/AppShell";

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
        setError(e?.message || "Failed to load job details.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [jobId]);

  const closingDate = job?.closing_date || job?.closingDate || job?.dueDate || null;

  const isClosed = useMemo(() => {
    if (!closingDate) return false;
    return new Date(closingDate) < new Date();
  }, [closingDate]);

  function handleApply() {
    const user = getUser();
    const applyPath = `/jobs/${jobId}/apply`;

    if (!user) {
      navigate("/login", {
        replace: true,
        state: { from: applyPath },
      });
      return;
    }

    navigate(applyPath);
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
              Closing date: {closingDate ? new Date(closingDate).toLocaleDateString() : "Not set"}
            </span>
          </div>

          <div className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {job.description || "No description provided."}
          </div>

          <div style={{ height: 14 }} />

          <button className="btn-primary" onClick={handleApply} disabled={isClosed}>
            {isClosed ? "Applications Closed" : "Apply / Upload Resume"}
          </button>
        </div>
      )}
    </AppShell>
  );
}