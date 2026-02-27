// src/pages/Login.jsx
// ------------------------------------------------------------
// Login page:
// - Calls POST /api/auth/login
// - Saves token + user to localStorage
// - Redirects based on role:
//   recruiter/admin -> /recruiter
//   jobseeker       -> /candidate
// ------------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, setToken, setUser } from "../api";

export default function Login() {
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();

    // Reset UI state
    setError("");
    setLoading(true);

    try {
      // Call backend login endpoint
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      // Save JWT
      setToken(data.token);

      // Save user (recommended: must include "role")
      if (data.user) {
        setUser(data.user);

        // ✅ Redirect based on role (MUST match backend exactly)
        if (data.user.role === "recruiter" || data.user.role === "admin") {
          navigate("/recruiter", { replace: true });
        } else {
          navigate("/candidate", { replace: true });
        }
      } else {
        // If backend doesn't return user, go to home and it will decide
        navigate("/", { replace: true });
      }
    } catch (err) {
      // Show readable error
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>Login</h2>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* Error message */}
        {error && <div style={{ color: "crimson" }}>{error}</div>}
      </form>
    </div>
  );
}