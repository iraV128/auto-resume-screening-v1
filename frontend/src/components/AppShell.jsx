// src/components/AppShell.jsx
// ============================================================
// AppShell = shared layout wrapper for app pages
// ------------------------------------------------------------
// - Top navigation
// - Role-based shortcut links
// - Login/Register when logged out
// - User badge + Back + Logout when logged in
// - Shared page title/subtitle/content container
// ============================================================

import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearToken, getToken, getUser } from "../api";

export default function AppShell({ title, subtitle, children }) {
  const user = getUser();
  const token = getToken();
  const navigate = useNavigate();
  const location = useLocation();

  function logout() {
    // Remove auth session and return user to login
    clearToken();
    navigate("/login", { replace: true });
  }

  // Detect auth pages to avoid showing duplicate auth links
  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/register";
  const isForgotPage = location.pathname === "/forgot-password";
  const isResetPage = location.pathname === "/reset-password";
  const isAuthPage = isLoginPage || isRegisterPage || isForgotPage || isResetPage;

  function goBackSafe() {
    // Simple back navigation
    // If history is limited, fallback to dashboard for logged-in users
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(token ? "/dashboard" : "/", { replace: true });
    }
  }

  return (
    <div>
      {/* ===================================================== */}
      {/* Top Navigation Bar */}
      {/* ===================================================== */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            paddingTop: 10,
            paddingBottom: 10,
          }}
        >
          {/* Left side: brand + core links */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.4 }}>
              ARS<span style={{ color: "#6d5efc" }}>.</span>
            </div>

            {/* Public home */}
            <Link to="/" className="muted">
              Home
            </Link>

            {/* Shared role-based dashboard redirect */}
            {token && (
              <Link to="/dashboard" className="muted">
                Dashboard
              </Link>
            )}

            {/* Role-specific shortcuts */}
            {user?.role === "recruiter" && (
              <Link to="/recruiter/jobs" className="muted">
                Recruiter
              </Link>
            )}

            {user?.role === "admin" && (
              <Link to="/admin/logs" className="muted">
                System Logs
              </Link>
            )}
          </div>

          {/* Right side: auth links OR session actions */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {!token ? (
              <>
                {/* Logged out */}
                {!isLoginPage && !isAuthPage && (
                  <Link to="/login" className="muted">
                    Login
                  </Link>
                )}

                {!isRegisterPage && !isAuthPage && (
                  <Link to="/register" className="muted">
                    Register
                  </Link>
                )}

                {/* On forgot/reset pages, still allow direct nav to login/register */}
                {(isForgotPage || isResetPage) && (
                  <>
                    <Link to="/login" className="muted">
                      Login
                    </Link>
                    <Link to="/register" className="muted">
                      Register
                    </Link>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Logged in user badge */}
                {user && (
                  <span className="badge">
                    {user.email || "user"} • {user.role}
                  </span>
                )}

                {/* Back button */}
                <button className="btn" onClick={goBackSafe}>
                  Back
                </button>

                {/* Logout */}
                <button className="btn-danger" onClick={logout}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================== */}
      {/* Page Container */}
      {/* ===================================================== */}
      <div className="container">
        {title && (
          <div style={{ margin: "14px 0 10px" }}>
            <h2>{title}</h2>
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}