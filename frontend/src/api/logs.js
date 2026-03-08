// frontend/src/api/logs.js
// -------------------------------------------------------------
// Purpose: API helpers for Admin Logs page (FR-13 Logging & Auditing)
// We reuse token helper from src/api/api.js
// -------------------------------------------------------------

import { getToken } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

// Build auth headers for protected admin endpoints
function authHeaders() {
  const token = getToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

// GET /api/logs (supports: page, limit, action, from, to)
export async function fetchLogs(params = {}) {
  const url = new URL(`${BASE_URL}/api/logs`);

  if (params.page) url.searchParams.set("page", String(params.page));
  if (params.limit) url.searchParams.set("limit", String(params.limit));

  // action filter (matches DB column logs.action)
  if (params.action) url.searchParams.set("action", params.action);

  // backward compatibility: older UI "eventType" -> "action"
  if (params.eventType && !params.action) {
    url.searchParams.set("action", params.eventType);
  }

  if (params.from) url.searchParams.set("from", params.from);
  if (params.to) url.searchParams.set("to", params.to);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const msg = await safeReadError(res);
    throw new Error(msg || `Failed to fetch logs (${res.status})`);
  }

  return res.json();
}

// GET /api/logs/stats
export async function fetchLogStats() {
  const res = await fetch(`${BASE_URL}/api/logs/stats`, {
    method: "GET",
    headers: {
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const msg = await safeReadError(res);
    throw new Error(msg || `Failed to fetch log stats (${res.status})`);
  }

  return res.json();
}

// Helper: read backend error safely (json or text)
async function safeReadError(res) {
  try {
    const data = await res.json();
    return data?.error || data?.message;
  } catch {
    try {
      return await res.text();
    } catch {
      return null;
    }
  }
}