import { apiRequest } from "./client";

/**
 * NOTE: Backend OpenAPI currently exposes only "/" (health). The UI is wired
 * to conventional REST endpoints expected for this work item. Once the backend
 * implements these routes, the UI will work without changes (or with minor
 * path adjustments).
 */

// PUBLIC_INTERFACE
export async function fetchResidents(params = {}) {
  /**
   * Fetch residents list.
   * Expected backend: GET /api/residents?q=&building=&unit=&page=&page_size=
   * Returns: { items: Resident[], total: number } OR Resident[]
   */
  return apiRequest("/api/residents", { method: "GET", query: params });
}

// PUBLIC_INTERFACE
export async function fetchResidentById(residentId) {
  /** Fetch a single resident by id. Expected backend: GET /api/residents/{id} */
  return apiRequest(`/api/residents/${encodeURIComponent(residentId)}`, {
    method: "GET",
  });
}

// PUBLIC_INTERFACE
export async function createResident(payload, token) {
  /** Create resident (admin). Expected backend: POST /api/residents */
  return apiRequest("/api/residents", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: payload,
  });
}

// PUBLIC_INTERFACE
export async function updateResident(residentId, payload, token) {
  /** Update resident (admin). Expected backend: PUT /api/residents/{id} */
  return apiRequest(`/api/residents/${encodeURIComponent(residentId)}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: payload,
  });
}

// PUBLIC_INTERFACE
export async function deleteResident(residentId, token) {
  /** Delete resident (admin). Expected backend: DELETE /api/residents/{id} */
  return apiRequest(`/api/residents/${encodeURIComponent(residentId)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

// PUBLIC_INTERFACE
export async function loginAdmin(username, password) {
  /**
   * Admin login. Expected backend: POST /api/auth/login
   * Returns: { access_token: string, token_type: "bearer", is_admin?: boolean }
   */
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
}
