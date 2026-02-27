// src/components/ProtectedRoute.jsx
// ------------------------------------------------------------
// Protects a route by checking only authentication.
// ✅ If token exists -> allow access
// ❌ If token missing -> redirect to /login
// ------------------------------------------------------------

import { Navigate } from "react-router-dom";
import { getToken } from "../api";

export default function ProtectedRoute({ children }) {
  const token = getToken();

  // Not logged in
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Logged in -> show the page/component
  return children;
}