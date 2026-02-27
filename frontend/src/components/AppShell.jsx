// src/components/AppShell.jsx
// ============================================================
// AppShell = layout wrapper for ALL pages
// - Top navigation (role-based links)
// - Shows user badge (email + role)
// - Logout button
// - Provides consistent spacing + container
// ============================================================

import { Link, useNavigate } from "react-router-dom";
import { clearToken, getUser } from "../api";

export default function AppShell({ title, subtitle, children }) {
  const user = getUser();
  const navigate = useNavigate();

  function logout() {
    // UC-10 Logout: remove token + user, then redirect to login
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div>
      {/* Top Navigation Bar */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          {/* Left side: Brand + Links */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
              ARS<span style={{ color: "#6d5efc" }}>.</span>
            </div>

            {/* Public Home */}
            <Link to="/" className="muted">
              Home
            </Link>

            {/* Role-based links */}
            {user?.role === "recruiter" && (
              <Link to="/recruiter" className="muted">
                Recruiter
              </Link>
            )}
            {user?.role === "jobseeker" && (
              <Link to="/candidate" className="muted">
                Candidate
              </Link>
            )}
            {user?.role === "admin" && (
              <Link to="/admin" className="muted">
                Admin
              </Link>
            )}
          </div>

          {/* Right side: Badge + Logout */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {user && (
              <span className="badge">
                {user.email || "user"} • {user.role}
              </span>
            )}
            {user && (
              <button className="btn-danger" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Page Container */}
      <div className="container">
        {/* Page heading */}
        {title && (
          <div style={{ margin: "14px 0 10px" }}>
            <h2>{title}</h2>
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>
        )}

        {/* Page content */}
        {children}
      </div>
    </div>
  );
}