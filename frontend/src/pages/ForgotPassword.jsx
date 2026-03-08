// frontend/src/pages/ForgotPassword.jsx
// -----------------------------------------------------------------------------
// Forgot Password (Real backend integration)
// Calls POST /api/auth/forgot-password
// Security: message does NOT reveal whether email exists.
// Demo: backend returns demoToken so you can test reset flow in UI/Postman.
// -----------------------------------------------------------------------------

import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [demoToken, setDemoToken] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setDemoToken("");

    if (!email.trim()) {
      setMessage("Please enter your email.");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setMessage(res.message || "If an account exists, a reset link has been generated.");

      // Demo token for testing screenshot + reset page
      if (res.demoToken) setDemoToken(res.demoToken);
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Forgot Password</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Enter your email and we’ll generate a reset token (demo mode).
      </p>

      <div className="card" style={{ padding: 16 }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. user@test.com" />
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? "Generating..." : "Generate Reset Token"}
          </button>

          {message && <div className="card" style={{ padding: 12 }}>{message}</div>}

          {/* Demo helper: show token for testing (remove in production) */}
          {demoToken && (
            <div className="card" style={{ padding: 12 }}>
              <div className="muted" style={{ fontSize: 12 }}>Demo Reset Token:</div>
              <code style={{ wordBreak: "break-all" }}>{demoToken}</code>
              <div style={{ marginTop: 10 }}>
                <Link to={`/reset-password?token=${demoToken}`} className="btn-primary">
                  Go to Reset Password
                </Link>
              </div>
            </div>
          )}

          <div className="muted" style={{ fontSize: 12 }}>
            <Link to="/login">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}