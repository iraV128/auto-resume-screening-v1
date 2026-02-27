// src/components/RoleRoute.jsx
// ------------------------------------------------------------
// Protects a route by checking authentication + role.
// ✅ user exists and role is allowed -> allow access
// ❌ user missing -> redirect /login
// ❌ role not allowed -> redirect to "/"
// ------------------------------------------------------------

import { Navigate } from "react-router-dom";
import { getUser } from "../api";

export default function RoleRoute({ allowedRoles, children }) {
  const user = getUser();

  // If user not found, they are basically not logged in properly
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role does not match allowed roles, block access
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Passed checks -> show the page/component
  return children;
}