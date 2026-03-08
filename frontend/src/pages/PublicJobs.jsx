// src/pages/PublicJobs.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../api";
import AppShell from "../components/AppShell";

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
        const data = await apiFetch("/api/jobs");
        setJobs(Array.isArray(data) ? data : data.jobs || []);
      } catch (e) {
        setError(e?.message || "Failed to load jobs.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();

    return jobs
      .filter((j) => {
        const closingDate = j.closing_date || j.closingDate || j.dueDate || null;
        if (closingDate) {
          const cd = new Date(closingDate);
          if (cd < now) return false;
        }
        return true;
      })
      .filter((j) => {
        if (!q.trim()) return true;
        const s = `${j.title || ""} ${j.description || ""}`.toLowerCase();
        return s.includes(q.toLowerCase());
      });
  }, [jobs, q]);

  return (
    <AppShell title="Open Jobs" subtitle="Browse jobs publicly — apply before the closing date.">
      <div className="card">
        <input
          placeholder="Search jobs (e.g., developer, helpdesk)..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div style={{ height: 12 }} />

      {loading && <div className="muted">Loading jobs...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="card">No job positions currently available.</div>
      )}

      <div className="grid">
        {filtered.map((job) => {
          const closingDate = job.closing_date || job.closingDate || job.dueDate || null;

          return (
            <div key={job.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{job.title}</h3>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Closing date: {closingDate ? new Date(closingDate).toLocaleDateString() : "Not set"}
                  </div>
                </div>

                <Link to={`/jobs/${job.id}`} className="btn">
                  View details →
                </Link>
              </div>

              <div className="muted" style={{ marginTop: 10 }}>
                {(job.description || "").slice(0, 180)}
                {(job.description || "").length > 180 ? "..." : ""}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}