// src/pages/PublicJobs.jsx
// ============================================================
// UC-00: Browse Open Jobs (Public)
// - No login required
// - Shows only active jobs (closing date not passed)
// - Simple search filter (A2 flow)
// ============================================================

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/Appshell";

export default function PublicJobs() {
  const [jobs, setJobs] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Backend should ideally return only OPEN jobs for public list.
        // If it returns all jobs, we filter on frontend as a backup.
        const data = await apiFetch("/api/jobs");
        setJobs(Array.isArray(data) ? data : data.jobs || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter: keyword search + closing date not passed (UC-00)
  const filtered = useMemo(() => {
    const now = new Date();
    return jobs
      .filter((j) => {
        // If job has closing_date, hide expired jobs
        if (j.closing_date) {
          const cd = new Date(j.closing_date);
          if (cd < now) return false;
        }
        return true;
      })
      .filter((j) => {
        if (!q.trim()) return true;
        const s = (j.title + " " + (j.description || "")).toLowerCase();
        return s.includes(q.toLowerCase());
      });
  }, [jobs, q]);

  return (
    <AppShell
      title="Open Jobs"
      subtitle="Browse jobs publicly — apply before the closing date."
    >
      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
          <input
            placeholder="Search jobs (e.g., developer, helpdesk)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="muted" style={{ fontSize: 13 }}>
            Showing jobs that are still open (closing date not passed).
          </div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading && <div className="muted">Loading jobs...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        // UC-00 Alternate flow A1: No jobs
        <div className="card">
          <div>No job positions currently available.</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Please refresh later.
          </div>
        </div>
      )}

      <div className="grid">
        {filtered.map((job) => (
          <div key={job.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h3 style={{ margin: 0 }}>{job.title}</h3>
                <div className="muted" style={{ fontSize: 13 }}>
                  Closing date: {job.closing_date ? new Date(job.closing_date).toLocaleDateString() : "Not set"}
                </div>
              </div>

              {/* UC-00b: view job details */}
              <Link to={`/jobs/${job.id}`} className="badge">
                View details →
              </Link>
            </div>

            {job.description && (
              <div className="muted" style={{ marginTop: 10 }}>
                {job.description.slice(0, 180)}{job.description.length > 180 ? "..." : ""}
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}