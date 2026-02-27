// src/pages/admin/SystemLogs.jsx
// ============================================================
// Wireframe 9 + UC-11: System Logs Page
// Must show table:
// | Event | Job ID | User | Status | Timestamp |
// Must filter by START/DONE/ERROR
// ============================================================

import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/Appshell";
import { apiFetch } from "../../api";

export default function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL / START / DONE / ERROR
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        // Admin-only endpoint recommended: GET /api/logs
        const data = await apiFetch("/api/logs");
        setLogs(Array.isArray(data) ? data : data.logs || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter logs by event type (START/DONE/ERROR)
  const filtered = useMemo(() => {
    if (filter === "ALL") return logs;
    return logs.filter((l) => String(l.eventType || "").includes(filter));
  }, [logs, filter]);

  return (
    <AppShell
      title="System Logs"
      subtitle="Audit trail for ranking events, login attempts, and system errors."
    >
      <div className="card">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span className="muted">Filter:</span>
          <button onClick={() => setFilter("ALL")} className={filter === "ALL" ? "btn-primary" : ""}>All</button>
          <button onClick={() => setFilter("START")} className={filter === "START" ? "btn-primary" : ""}>START</button>
          <button onClick={() => setFilter("DONE")} className={filter === "DONE" ? "btn-primary" : ""}>DONE</button>
          <button onClick={() => setFilter("ERROR")} className={filter === "ERROR" ? "btn-primary" : ""}>ERROR</button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading && <div className="muted">Loading logs...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="card">No log records available.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Job ID</th>
                <th>User</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id || `${l.eventType}-${l.created_at}`}>
                  <td>{l.eventType}</td>
                  <td className="muted">{l.meta?.jobId ?? l.jobId ?? "-"}</td>
                  <td className="muted">{l.userId ?? "-"}</td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (String(l.eventType || "").includes("ERROR")
                          ? "badge-danger"
                          : String(l.eventType || "").includes("DONE")
                          ? "badge-ok"
                          : "badge-warn")
                      }
                    >
                      {String(l.eventType || "").includes("ERROR")
                        ? "ERROR"
                        : String(l.eventType || "").includes("DONE")
                        ? "DONE"
                        : "START"}
                    </span>
                  </td>
                  <td className="muted">
                    {l.created_at ? new Date(l.created_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}