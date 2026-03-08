// frontend/src/api/auth.js
// -----------------------------------------------------------------------------
// Auth API calls for:
// - register
// - forgot password
// - reset password
// - update password (JWT required)
// -----------------------------------------------------------------------------

import { apiFetch, getToken } from "./api";

export function registerUser({ username, email, password, role }) {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: { username, email, password, role },
  });
}

export function forgotPassword({ email }) {
  return apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword({ token, newPassword }) {
  return apiFetch("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword },
  });
}

export function updatePassword({ currentPassword, newPassword }) {
  const token = getToken();
  return apiFetch("/api/auth/update-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: { currentPassword, newPassword },
  });
}