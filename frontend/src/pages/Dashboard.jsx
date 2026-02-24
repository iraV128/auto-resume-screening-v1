import { useEffect, useState } from "react";
import { apiFetch, clearToken } from "../api";

/**
 * Dashboard
 * - Shows logged-in user info (email + role)
 * - Loads jobs from backend
 * - Allows recruiters/admins to create jobs (RBAC UI)
 */
export default function Dashboard({ onLogout, user }) {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState("");

  /**
   * Load jobs list
   * - GET /api/jobs
   * - Uses apiFetch which automatically attaches Authorization: Bearer <token>
   */
  async function loadJobs() {
    setError("");
    try {
      const data = await apiFetch("/api/jobs");
      setJobs(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load jobs");
    }
  }

  /**
   * Create job (Recruiter/Admin only)
   * - POST /api/jobs
   * - Backend should enforce RBAC too (not just UI)
   */
  async function createJob() {
    setError("");
    try {
      const res = await apiFetch("/api/jobs", {
        method: "POST",
        body: {
          title: "Frontend Test Job",
          description: "Created from frontend using JWT token",
        },
      });

      await loadJobs();
      alert("Job created with id: " + (res?.id ?? "unknown"));
    } catch (err) {
      setError(err.message || "Failed to create job");
    }
  }

  /**
   * Logout
   * - Clears localStorage (token + user)
   * - Tells App.jsx to switch back to Login screen
   */
  function logout() {
    clearToken();
    onLogout?.();
  }

  // Load jobs when dashboard mounts OR when user changes (login as different user)
  useEffect(() => {
    loadJobs();
  }, [user?.id]);

  // If somehow we reached Dashboard but user is missing, show a safe message
  if (!user) {
    return (
      <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
        <h2>Dashboard</h2>
        <p>User info missing. Please log in again.</p>
        <button onClick={logout}>Back to Login</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2>Dashboard</h2>
          <div>
            Logged in as: <b>{user.email}</b> ({user.role})
          </div>
        </div>

        <button onClick={logout}>Logout</button>
      </div>

      <hr />

      {/* RBAC UI: only recruiter/admin see Create Job button */}
      {(user.role === "recruiter" || user.role === "admin") && (
        <button onClick={createJob}>Create Job (Recruiter/Admin)</button>
      )}

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <h3>Jobs</h3>
      {jobs.length === 0 ? (
        <p>No jobs yet.</p>
      ) : (
        <ul>
          {jobs.map((j) => (
            <li key={j.id}>
              <b>{j.title}</b> — {j.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}