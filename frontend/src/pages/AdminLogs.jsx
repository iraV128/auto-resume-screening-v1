// frontend/src/pages/AdminLogs.jsx
// ============================================================
// Admin Logs Page (Simple + Compatible with your current backend)
// - Calls GET /api/logs
// - Displays most recent logs
// ============================================================

import { useEffect, useState } from "react";
import { apiFetch } from "../api";

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    setError("");
    setLoading(true);
    try {
      const data = await apiFetch("/api/logs");
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>System Logs (Admin)</h2>
        <button onClick={loadLogs} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <p style={{ opacity: 0.8 }}>
        Showing latest 200 log entries from <code>/api/logs</code>
      </p>

      {error && <div style={{ color: "crimson" }}>❌ {error}</div>}

      {!loading && logs.length === 0 ? (
        <div>No logs yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {logs.map((l) => (
            <div
              key={l.id}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <b>{l.action}</b>
                  {l.entityType ? (
                    <span style={{ opacity: 0.8 }}>
                      {" "}
                      — {l.entityType}
                      {l.entityId ? `#${l.entityId}` : ""}
                    </span>
                  ) : null}
                </div>
                <div style={{ opacity: 0.75 }}>{l.createdAt}</div>
              </div>

              <div style={{ marginTop: 6, opacity: 0.85 }}>
                actorUserId: {l.actorUserId ?? "null"} | ip: {l.ip ?? "null"}
              </div>

              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: "pointer" }}>View meta</summary>
                <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>
                  {JSON.stringify(l.meta, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}