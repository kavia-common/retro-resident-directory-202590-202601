const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Best-effort base URL resolution.
 * - In production, same-origin reverse proxy is typical, so empty base works.
 * - In dev, user can set REACT_APP_API_BASE_URL to point to backend (e.g. http://localhost:3001).
 */
function getApiBaseUrl() {
  const envBase = process.env.REACT_APP_API_BASE_URL;
  if (envBase && typeof envBase === "string") return envBase.replace(/\/+$/, "");
  return ""; // same-origin by default
}

function buildUrl(path, query) {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${p}`, window.location.origin);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function withTimeout(promise, timeoutMs) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function parseJsonSafe(resp) {
  const text = await resp.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err.message) return err.message;
  return "Request failed";
}

// PUBLIC_INTERFACE
export async function apiRequest(path, options = {}) {
  /**
   * Generic API request helper.
   * Adds JSON headers, handles non-2xx responses, and parses JSON responses.
   */
  const {
    method = "GET",
    query,
    headers,
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const url = buildUrl(path, query);

  const finalHeaders = {
    Accept: "application/json",
    ...headers,
  };

  let finalBody = body;
  if (body && typeof body === "object" && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const resp = await withTimeout(
    fetch(url, {
      method,
      headers: finalHeaders,
      body: finalBody,
    }),
    timeoutMs
  );

  const payload = await parseJsonSafe(resp);

  if (!resp.ok) {
    const message =
      (payload && payload.detail && String(payload.detail)) ||
      (payload && payload.message && String(payload.message)) ||
      `HTTP ${resp.status}`;
    const err = new Error(message);
    err.status = resp.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// PUBLIC_INTERFACE
export function getApiBaseUrlForDisplay() {
  /** Returns the resolved base URL for UI display/debug. */
  const base = getApiBaseUrl();
  return base || "(same origin)";
}

// PUBLIC_INTERFACE
export function formatApiError(err) {
  /** Convert an API error to a user-friendly message string. */
  return toErrorMessage(err);
}
