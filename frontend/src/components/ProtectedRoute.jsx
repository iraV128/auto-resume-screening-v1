// src/components/ProtectedRoute.jsx
// ------------------------------------------------------------
// Purpose:
// - Blocks protected pages if user is not logged in
// Rule:
// - No token -> redirect to /login
// - Preserve original route so login can redirect back
// ------------------------------------------------------------

import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../api";

export default function ProtectedRoute({ children }) {
  const token = getToken();
  const location = useLocation();

  // Not logged in -> send to login and remember attempted route
  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Logged in -> allow page
  return children;
}