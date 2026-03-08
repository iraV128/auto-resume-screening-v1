// src/pages/admin/AdminDashboard.jsx
// ============================================================
// ADMIN DASHBOARD
// - Monitoring only
// - Can show redirect notice if user was redirected here
// ============================================================

import { Link, useLocation } from "react-router-dom";

export default function AdminDashboard() {
  const location = useLocation();
  const redirectMessage = location.state?.message || "";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Redirect notice */}
      {redirectMessage && (
        <div
          className="card"
          style={{
            padding: 16,
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Notice</h3>
          <div className="muted">{redirectMessage}</div>
        </div>
      )}

      {/* Monitoring intro */}
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Admin Monitoring Panel</h3>
        <div className="muted">
          Use this area to monitor system activity, review audit trails,
          and support final demo evidence for logging and security controls.
        </div>
      </div>

      {/* Quick actions */}
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 12 }}>Quick Actions</h3>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" to="/admin/logs">
            View System Logs
          </Link>
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>
          Admin access is restricted to monitoring and audit review only.
        </div>
      </div>

      {/* Scope note */}
      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>Admin Scope</h3>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Review system logs</li>
          <li>Monitor authentication and activity events</li>
          <li>Support audit and compliance evidence</li>
          <li>Does not impersonate recruiter or candidate roles</li>
        </ul>
      </div>
    </div>
  );
}