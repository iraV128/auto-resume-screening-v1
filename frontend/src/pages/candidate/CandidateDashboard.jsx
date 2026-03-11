// src/pages/candidate/CandidateDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { apiFetch, getUser } from "../../api";

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function Card({ title, right, children }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        {right}
      </div>
      <div style={{ height: 10 }} />
      {children}
    </div>
  );
}

export default function CandidateDashboard() {
  const user = getUser();

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch("/api/candidate/applications");
      const normalized = (Array.isArray(data) ? data : []).map((a) => ({
        id: a.applicationId ?? a.id,
        jobId: a.jobId,
        jobTitle: a.jobTitle || `Job #${a.jobId}`,
        status: a.status || "Submitted",
        createdAt: a.createdAt,
      }));
      setApps(normalized);
    } catch (e) {
      setError(e?.message || "Failed to load applications.");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    load();
  }, []);

  return (
    <AppShell title="Candidate Dashboard" subtitle="Track your job applications.">
      {!loading && !error && (
        <div className="btn-ok" style={{ padding: 10, marginBottom: 12 }}>
          Live mode: <b>{user?.email}</b>
        </div>
      )}

      {loading && <div className="muted">Loading your applications...</div>}
      {error && <div className="btn-error">❌ {error}</div>}

      <Card
        title="My Applications"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={load} disabled={loading}>Refresh</button>
            <Link className="btn" to="/">Browse Jobs</Link>
          </div>
        }
      >
        {apps.length === 0 ? (
          <div className="muted">You have not applied to any jobs yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {apps.map((a) => (
              <div
                key={a.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  paddingTop: 10,
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{a.jobTitle}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Submitted: {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <Badge>{a.status}</Badge>
                  <Link className="btn" to={`/jobs/${a.jobId}`}>View Job</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}