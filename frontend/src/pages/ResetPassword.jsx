// frontend/src/pages/ResetPassword.jsx
// -----------------------------------------------------------------------------
// Reset Password
// - Reads token from query param (?token=...)
// - Calls POST /api/auth/reset-password
// - Shows success message for testing screenshots
// -----------------------------------------------------------------------------

import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { resetPassword } from "../api/auth";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const q = useQuery();
  const navigate = useNavigate();

  const token = q.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");

    if (!token) {
      setMsg("Missing token. Please use the reset link again.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setMsg("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setMsg("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword });
      setMsg(res.message || "Password reset successful.");

      // Optional: go to login after a moment
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (err) {
      const m = String(err?.message || "");
      if (m.toLowerCase().includes("token")) setMsg("Invalid or expired token.");
      else setMsg("Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", padding: 16 }}>
      <h2 style={{ marginBottom: 6 }}>Reset Password</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Set a new password using your reset token.
      </p>

      <div className="card" style={{ padding: 16 }}>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div className="muted" style={{ fontSize: 12 }}>
            Token: <code style={{ wordBreak: "break-all" }}>{token || "(none)"}</code>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <label className="muted" style={{ fontSize: 12 }}>Confirm New Password</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          <button className="btn-primary" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>

          {msg && <div className="card" style={{ padding: 12 }}>{msg}</div>}

          <div className="muted" style={{ fontSize: 12 }}>
            <Link to="/login">Back to Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}