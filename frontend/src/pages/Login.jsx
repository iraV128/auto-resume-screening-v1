// src/pages/Login.jsx
// ============================================================
// LOGIN PAGE
// ------------------------------------------------------------
// - Calls POST /api/auth/login
// - Saves token + user
// - Redirects by role
// - If redirected from Apply page, sends user back there
//
// Locked checklist alignment:
// - Generic success/error messaging
// - Cleaner demo/testing behaviour
// - Backend handles lockout, not frontend localStorage
// ============================================================

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch, setToken, setUser } from "../api";

// Simple password helper for UI only
function getPasswordStrength(pw) {
  const s = String(pw || "");
  const hasLower = /[a-z]/.test(s);
  const hasUpper = /[A-Z]/.test(s);
  const hasNumber = /[0-9]/.test(s);
  const hasSymbol = /[^A-Za-z0-9]/.test(s);

  let score = 0;
  if (s.length >= 8) score += 1;
  if (s.length >= 12) score += 1;
  if (hasLower) score += 1;
  if (hasUpper) score += 1;
  if (hasNumber) score += 1;
  if (hasSymbol) score += 1;

  if (!s) return { label: "", score: 0 };
  if (score <= 2) return { label: "Weak", score };
  if (score <= 4) return { label: "Medium", score };
  return { label: "Strong", score };
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const strength = getPasswordStrength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Simple required field check
    if (!email.trim() || !password) {
      setError("Please enter your login details.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      // Save auth info
      setToken(data.token);
      if (data.user) setUser(data.user);

      // If user came from Apply page, send them back
      const from = location?.state?.from;
      if (from) {
        navigate(from, { replace: true });
        return;
      }

      // Default role redirects
      const role = data?.user?.role;
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "recruiter") navigate("/recruiter", { replace: true });
      else navigate("/candidate", { replace: true });
    } catch (err) {
      const msg = String(err?.message || "").toLowerCase();

      if (msg.includes("failed to fetch")) {
        setError("Login failed. Please try again later.");
      } else {
        setError("Invalid credentials. Please check case sensitve!");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Login</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Access your dashboard securely.
      </p>

      <div className="card" style={{ padding: 16 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Note: Email verification may be required in a future release.
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          {/* Email */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>
              Email
            </label>
            <input
              placeholder="e.g. user@test.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>
              Password
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ flex: 1 }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {strength.label && (
              <div className="muted" style={{ fontSize: 12 }}>
                Password strength: <b>{strength.label}</b>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>

          {error && <div className="btn-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link to="/forgot-password" className="muted" style={{ fontSize: 12 }}>
              Forgot Password?
            </Link>

            <Link to="/privacy" className="muted" style={{ fontSize: 12 }}>
              Why we collect this data
            </Link>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <Link to="/register" className="muted" style={{ fontSize: 12 }}>
              Don’t have an account? Register
            </Link>

            <Link to="/" className="muted" style={{ fontSize: 12 }}>
              ← Back to Open Jobs
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}