// src/components/RoleRoute.jsx
// ------------------------------------------------------------
// Purpose:
// - Blocks pages if user does not have the required role
// Rules:
// - If user missing -> redirect /login
// - If role not allowed -> redirect /dashboard
// ------------------------------------------------------------

import { Navigate, useLocation } from "react-router-dom";
import { getUser } from "../api";

export default function RoleRoute({ allowedRoles = [], children }) {
  const user = getUser();
  const location = useLocation();

  // Broken session / missing user object
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // No role list provided -> allow access
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    return children;
  }

  // Wrong role -> send user to their dashboard flow
  if (!allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to="/dashboard"
        replace
        state={{
          error: "forbidden",
          message: "You do not have permission to access that page.",
          from: location.pathname + location.search,
        }}
      />
    );
  }

  // Allowed role
  return children;
}