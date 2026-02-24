import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { getToken, getUser, setUser, clearToken } from "./api";

export default function App() {
  const [token, setTokenState] = useState(getToken());
  const [user, setUserState] = useState(getUser());

  // Called after login success (Login.jsx should call onLogin(data.user))
  function handleLogin(u) {
    // token is already stored by setToken(data.token) inside Login.jsx
    setTokenState(getToken());

    // Save user in both state + localStorage (role-based UI needs it)
    if (u) {
      setUser(u);        // localStorage
      setUserState(u);   // React state
    } else {
      // fallback: try reading whatever is in localStorage
      setUserState(getUser());
    }
  }

  function handleLogout() {
    clearToken();          // removes token + user from localStorage (based on your api.js)
    setTokenState(null);
    setUserState(null);
  }

  /**
   * Safety:
   * If token exists but user is missing (e.g., localStorage got cleared partially),
   * force logout cleanly.
   */
  useEffect(() => {
    if (token && !user) {
      clearToken();
      setTokenState(null);
      setUserState(null);
    }
  }, [token, user]);

  return token ? (
  <Dashboard onLogout={handleLogout} user={user} />
) : (
  <Login onLogin={handleLogin} />
);
}