// src/pages/admin/SystemLogs.jsx
// ============================================================
// SYSTEM LOGS
// ------------------------------------------------------------
// FR-13 Logging & Auditing
// - Loads admin-only logs from GET /api/logs
// - Shows action, entity, actor, IP, timestamp, and metadata
// ============================================================

import { useEffect, useState } from "react";
import { apiFetch } from "../../api";

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function formatMeta(meta) {
  if (meta == null) return "No metadata";
  if (typeof meta === "string") return meta;

  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return String(meta);
  }
}

export default function SystemLogs() {
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
      setError(e?.message || "Failed to load logs.");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div
        className="card"
        style={{
          padding: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>System Logs</h3>
          <div className="muted" style={{ marginTop: 6 }}>
            Audit trail for login, job creation, resume uploads,
            applications, analysis events, and system errors.
          </div>
        </div>

        <button className="btn" onClick={loadLogs} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="btn-error" style={{ padding: 10 }}>
          {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="card" style={{ padding: 16 }}>
          No logs available yet.
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <div style={{ display: "grid", gap: 10 }}>
          {logs.map((l) => (
            <div
              key={l.id}
              className="card"
              style={{ padding: 14, borderRadius: 12 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {l.action || "Unknown action"}
                    {l.entityType ? (
                      <span className="muted">
                        {" "}
                        — {l.entityType}
                        {l.entityId ? ` #${l.entityId}` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="muted" style={{ fontSize: 13 }}>
                  {formatDate(l.createdAt)}
                </div>
              </div>

              <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                actorUserId: {l.actorUserId ?? "null"} | ip: {l.ip ?? "null"}
              </div>

              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer" }}>View metadata</summary>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    marginTop: 8,
                    fontSize: 12,
                    overflowX: "auto",
                  }}
                >
                  {formatMeta(l.meta)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}