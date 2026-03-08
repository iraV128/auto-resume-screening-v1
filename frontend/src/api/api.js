// src/api.js
// ============================================================
// API Helper (Frontend)
// ------------------------------------------------------------
// What this file does:
// 1) Saves/reads JWT token + user from localStorage
// 2) apiFetch() automatically attaches JWT to every request
// 3) Supports BOTH:
//    - JSON requests (normal POST/PUT)
//    - FormData requests (file uploads)  ✅ IMPORTANT for resumes
// 4) Parses backend errors into a clean Error(message)
// ============================================================

// Backend base URL (set this in frontend/.env)
const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5050";
// Example: VITE_API_BASE="http://localhost:5050"

export function getToken() {
  // Read JWT token from localStorage
  return localStorage.getItem("token");
}

export function setToken(token) {
  // Save JWT token
  localStorage.setItem("token", token);
}

export function clearToken() {
  // Logout: remove token AND user
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  // Read user object from localStorage
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  // Save user object (must include role: admin/recruiter/jobseeker)
  localStorage.setItem("user", JSON.stringify(user));
}

/**
 * apiFetch("/api/jobs")
 * apiFetch("/api/auth/login", { method:"POST", body:{ email, password } })
 *
 * For file upload:
 * const fd = new FormData();
 * fd.append("file", file);
 * apiFetch("/api/resumes/upload", { method:"POST", body: fd })
 */
export async function apiFetch(path, options = {}) {
  const token = getToken();

  const {
    method = "GET",
    body,
    headers = {},
    ...rest
  } = options;

  // ✅ Detect if body is FormData (for file upload)
  const isFormData = body instanceof FormData;

  // Build headers
  const finalHeaders = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  // ✅ Only set JSON content-type if NOT FormData
  // (Browser will auto-set multipart boundary for FormData)
  if (!isFormData) {
    finalHeaders["Content-Type"] = "application/json";
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers: finalHeaders,

    // ✅ If FormData -> send directly
    // ✅ If JSON -> stringify
    body:
      body == null
        ? undefined
        : isFormData
        ? body
        : JSON.stringify(body),

    ...rest,
  });

  // Try to parse response:
  // - if JSON -> return object
  // - if not JSON -> return text
  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  // If request failed, throw a clean error message
  if (!res.ok) {
    const message =
      (data && data.error) ||
      (data && data.message) ||
      `Request failed (${res.status})`;

    // Optional: if token expired (401), force logout
    // (helps when JWT expires after 1h)
    if (res.status === 401) {
      clearToken();
    }

    throw new Error(message);
  }

  return data;
}