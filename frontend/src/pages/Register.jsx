// src/pages/Register.jsx
// ============================================================
// REGISTER PAGE
// ------------------------------------------------------------
// - Calls POST /api/auth/register
// - Saves token + user if registration succeeds
// - Redirects by role
//
// Locked checklist alignment:
// - Generic success/error messages
// - Public registration for jobseeker/recruiter only
// ============================================================

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setToken, setUser } from "../api";
import { registerUser } from "../api/auth";

// UI-only password strength helper
function getPasswordStrength(pw) {
  const s = String(pw || "");
  let score = 0;
  if (s.length >= 8) score++;
  if (s.length >= 12) score++;
  if (/[a-z]/.test(s)) score++;
  if (/[A-Z]/.test(s)) score++;
  if (/[0-9]/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  if (!s) return { label: "", score: 0 };
  if (score <= 2) return { label: "Weak", score };
  if (score <= 4) return { label: "Medium", score };
  return { label: "Strong", score };
}

export default function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("jobseeker");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Basic client validation
    if (!username.trim() || !email.trim() || !password || !confirm) {
      setError("Please check your details and try again.");
      return;
    }

    if (password !== confirm) {
      setError("Please check your details and try again.");
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({ username, email, password, role });

      setToken(data.token);
      setUser(data.user);

      if (data.user.role === "recruiter") {
        navigate("/recruiter", { replace: true });
      } else {
        navigate("/candidate", { replace: true });
      }
    } catch (err) {
      setError("Registration failed. Please try again. Password must be atleast 8 characters long.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Create Account</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Register as a Jobseeker or Recruiter.
      </p>

      <div className="card" style={{ padding: 16 }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          {/* Username */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Ira"
            />
          </div>

          {/* Email */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. user@test.com"
              autoComplete="email"
            />
          </div>

          {/* Role */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Account Type</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="jobseeker">Jobseeker</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </div>

          {/* Password */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Password</label>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            {strength.label && (
              <div className="muted" style={{ fontSize: 12 }}>
                Password strength: <b>{strength.label}</b>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Confirm Password</label>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}>
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>

          {error && <div className="btn-error">{error}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
            <Link to="/login" className="muted" style={{ fontSize: 12 }}>
              Already have an account? Login
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