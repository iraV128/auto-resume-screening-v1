// Admin dashboard placeholder.
// Later we will add a link to /admin/logs and call GET /api/logs

import { clearToken, getUser } from "../../api";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const user = getUser();
  const navigate = useNavigate();

  function logout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin Dashboard</h2>
      <p>
        Logged in as: {user?.email} ({user?.role})
      </p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}