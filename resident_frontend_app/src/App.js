import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import { formatApiError, getApiBaseUrlForDisplay } from "./api/client";
import {
  createResident,
  deleteResident,
  fetchResidentById,
  fetchResidents,
  loginAdmin,
  updateResident,
} from "./api/residents";
import { ResidentForm } from "./components/ResidentForm";
import { Field, RetroButton, RetroPanel, StatusBanner, TextInput } from "./components/RetroUI";

function normalizeResidentsListPayload(payload) {
  if (Array.isArray(payload)) return { items: payload, total: payload.length };
  if (payload && Array.isArray(payload.items)) return payload;
  return { items: [], total: 0 };
}

function getResidentId(r) {
  return r?.id ?? r?.resident_id ?? r?._id ?? null;
}

function displayName(r) {
  return r?.full_name ?? r?.name ?? "(Unnamed Resident)";
}

function displayBuildingUnit(r) {
  const b = r?.building ? String(r.building) : "";
  const u = r?.unit ? String(r.unit) : "";
  if (!b && !u) return "—";
  if (b && u) return `${b}-${u}`;
  return b || u;
}

// PUBLIC_INTERFACE
function App() {
  /** Retro Resident Directory UI (browse/search/detail + admin CRUD). */

  const [theme, setTheme] = useState("light");

  // Search/filter state (client-controlled, server-powered)
  const [query, setQuery] = useState("");
  const [building, setBuilding] = useState("");
  const [unit, setUnit] = useState("");

  // Residents list state
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [residents, setResidents] = useState([]);
  const [total, setTotal] = useState(0);

  // Selected resident details state
  const [selectedId, setSelectedId] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedResident, setSelectedResident] = useState(null);

  // Admin auth
  const [token, setToken] = useState(() => window.localStorage.getItem("rrd_admin_token") || "");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isAdmin = Boolean(token);

  // Admin CRUD mode
  const [mode, setMode] = useState("view"); // view | add | edit
  const [saveBusy, setSaveBusy] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const filters = useMemo(
    () => ({
      q: query,
      building,
      unit,
    }),
    [query, building, unit]
  );

  async function loadList() {
    setListLoading(true);
    setListError("");
    try {
      const payload = await fetchResidents(filters);
      const norm = normalizeResidentsListPayload(payload);
      setResidents(norm.items || []);
      setTotal(Number.isFinite(norm.total) ? norm.total : (norm.items || []).length);

      // If current selectedId is no longer present, clear selection
      if (selectedId) {
        const stillThere = (norm.items || []).some((r) => String(getResidentId(r)) === String(selectedId));
        if (!stillThere) {
          setSelectedId(null);
          setSelectedResident(null);
        }
      }
    } catch (e) {
      setResidents([]);
      setTotal(0);
      setListError(formatApiError(e));
    } finally {
      setListLoading(false);
    }
  }

  async function loadDetail(id) {
    if (!id) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const payload = await fetchResidentById(id);
      setSelectedResident(payload);
    } catch (e) {
      setSelectedResident(null);
      setDetailError(formatApiError(e));
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    // Initial list load
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    loadDetail(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    /** Toggle between light and dark themes. */
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  async function handleApplyFilters(e) {
    e.preventDefault();
    await loadList();
  }

  async function handleClearFilters() {
    setQuery("");
    setBuilding("");
    setUnit("");
    // Wait for state to update, then load with empty filters
    setTimeout(() => {
      // uses latest state due to closure; call via direct empty filters:
      (async () => {
        setListLoading(true);
        setListError("");
        try {
          const payload = await fetchResidents({ q: "", building: "", unit: "" });
          const norm = normalizeResidentsListPayload(payload);
          setResidents(norm.items || []);
          setTotal(Number.isFinite(norm.total) ? norm.total : (norm.items || []).length);
          setSelectedId(null);
          setSelectedResident(null);
        } catch (e) {
          setResidents([]);
          setTotal(0);
          setListError(formatApiError(e));
        } finally {
          setListLoading(false);
        }
      })();
    }, 0);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    setAuthBusy(true);
    try {
      if (!username.trim() || !password) {
        throw new Error("Enter username and password.");
      }
      const resp = await loginAdmin(username.trim(), password);
      const accessToken = resp?.access_token || resp?.token || "";
      if (!accessToken) throw new Error("Login did not return an access token.");
      setToken(accessToken);
      window.localStorage.setItem("rrd_admin_token", accessToken);
      setPassword("");
      setMode("view");
    } catch (err) {
      setAuthError(formatApiError(err));
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogout() {
    setToken("");
    window.localStorage.removeItem("rrd_admin_token");
    setMode("view");
    setSaveError("");
  }

  async function handleStartEdit() {
    if (!selectedId) return;
    setSaveError("");
    setMode("edit");
  }

  async function handleStartAdd() {
    setSaveError("");
    setSelectedId(null);
    setSelectedResident(null);
    setMode("add");
  }

  async function handleSave(values) {
    setSaveBusy(true);
    setSaveError("");
    try {
      if (!isAdmin) throw new Error("Admin login required.");

      if (mode === "add") {
        const created = await createResident(values, token);
        const newId = getResidentId(created);
        await loadList();
        if (newId) {
          setSelectedId(newId);
        }
        setMode("view");
      } else if (mode === "edit") {
        if (!selectedId) throw new Error("No resident selected to edit.");
        await updateResident(selectedId, values, token);
        await loadList();
        await loadDetail(selectedId);
        setMode("view");
      }
    } catch (e) {
      setSaveError(formatApiError(e));
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedId) return;
    const ok = window.confirm("Delete this resident? This cannot be undone.");
    if (!ok) return;

    setSaveBusy(true);
    setSaveError("");
    try {
      if (!isAdmin) throw new Error("Admin login required.");
      await deleteResident(selectedId, token);
      setSelectedId(null);
      setSelectedResident(null);
      await loadList();
      setMode("view");
    } catch (e) {
      setSaveError(formatApiError(e));
    } finally {
      setSaveBusy(false);
    }
  }

  const selectedFromList = useMemo(() => {
    if (!selectedId) return null;
    return residents.find((r) => String(getResidentId(r)) === String(selectedId)) || null;
  }, [residents, selectedId]);

  const titleRightActions = (
    <>
      <RetroButton
        variant="secondary"
        size="sm"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        Theme: {theme === "light" ? "Light" : "Dark"}
      </RetroButton>
    </>
  );

  return (
    <div className="App">
      <div className="topbar">
        <div className="topbar__row">
          <div className="brand">
            <div className="brand__title">Retro Resident Directory</div>
            <div className="brand__subtitle">
              Browse • Search • Details • Admin CRUD
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span className="small-muted">API: {getApiBaseUrlForDisplay()}</span>
            {titleRightActions}
          </div>
        </div>
      </div>

      <div className="shell">
        {/* Sidebar */}
        <div>
          <RetroPanel
            title="Search / Filter"
            actions={
              <div className="retro-panel__actions">
                <RetroButton size="sm" variant="secondary" onClick={handleClearFilters} disabled={listLoading}>
                  Clear
                </RetroButton>
              </div>
            }
          >
            <form className="search-row" onSubmit={handleApplyFilters}>
              <Field label="Search">
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Name, phone, email..."
                />
              </Field>
              <div className="retro-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                <Field label="Building">
                  <TextInput
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder="A"
                  />
                </Field>
                <Field label="Unit">
                  <TextInput
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="101"
                  />
                </Field>
              </div>

              <div className="search-row__actions">
                <RetroButton type="submit" disabled={listLoading}>
                  {listLoading ? "Searching..." : "Apply"}
                </RetroButton>
                <RetroButton type="button" variant="secondary" onClick={loadList} disabled={listLoading}>
                  Refresh
                </RetroButton>
              </div>

              {listError && (
                <StatusBanner
                  kind="error"
                  title="Could not load residents"
                  actions={
                    <RetroButton variant="secondary" size="sm" onClick={loadList}>
                      Retry
                    </RetroButton>
                  }
                >
                  {listError}
                </StatusBanner>
              )}

              {!listError && listLoading && (
                <StatusBanner kind="loading" title="Loading">
                  Fetching residents...
                </StatusBanner>
              )}

              {!listError && !listLoading && residents.length === 0 && (
                <StatusBanner kind="empty" title="No results">
                  Try a different search, or clear filters.
                </StatusBanner>
              )}

              {!listError && !listLoading && residents.length > 0 && (
                <div className="small-muted">
                  Showing <strong>{residents.length}</strong>
                  {Number.isFinite(total) ? ` / ${total}` : ""} residents
                </div>
              )}
            </form>
          </RetroPanel>

          <div style={{ height: 14 }} />

          <RetroPanel
            title="Residents"
            actions={
              isAdmin ? (
                <RetroButton size="sm" onClick={handleStartAdd} disabled={saveBusy || listLoading}>
                  + Add
                </RetroButton>
              ) : null
            }
          >
            <div className="list" role="list" aria-label="Residents list">
              {residents.map((r) => {
                const id = getResidentId(r);
                const active = id && selectedId && String(id) === String(selectedId);
                return (
                  <div
                    key={String(id ?? displayName(r))}
                    role="listitem"
                    className={["listitem", active ? "listitem--active" : ""].join(" ")}
                    tabIndex={0}
                    onClick={() => id && setSelectedId(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        id && setSelectedId(id);
                      }
                    }}
                    aria-label={`View resident ${displayName(r)}`}
                  >
                    <div className="listitem__name">{displayName(r)}</div>
                    <div className="listitem__meta">
                      <span className="chip">{displayBuildingUnit(r)}</span>
                      {r?.phone && <span className="chip">{String(r.phone)}</span>}
                      {r?.email && <span className="chip">{String(r.email)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </RetroPanel>
        </div>

        {/* Main content */}
        <div>
          <RetroPanel
            title={
              mode === "add"
                ? "Admin: Add Resident"
                : mode === "edit"
                  ? "Admin: Edit Resident"
                  : "Resident Details"
            }
            actions={
              <div className="retro-panel__actions">
                {mode === "view" && isAdmin && (
                  <>
                    <RetroButton
                      size="sm"
                      variant="secondary"
                      onClick={handleStartEdit}
                      disabled={!selectedId || saveBusy || detailLoading}
                      title={!selectedId ? "Select a resident to edit" : "Edit selected resident"}
                    >
                      Edit
                    </RetroButton>
                    <RetroButton
                      size="sm"
                      variant="danger"
                      onClick={handleDeleteSelected}
                      disabled={!selectedId || saveBusy || detailLoading}
                      title={!selectedId ? "Select a resident to delete" : "Delete selected resident"}
                    >
                      Delete
                    </RetroButton>
                  </>
                )}
              </div>
            }
          >
            {saveError && (
              <StatusBanner kind="error" title="Action failed">
                {saveError}
              </StatusBanner>
            )}

            {mode === "add" && isAdmin && (
              <ResidentForm
                initialResident={null}
                submitLabel="Create"
                busy={saveBusy}
                onCancel={() => setMode("view")}
                onSubmit={handleSave}
              />
            )}

            {mode === "edit" && isAdmin && (
              <ResidentForm
                initialResident={selectedResident || selectedFromList}
                submitLabel="Save changes"
                busy={saveBusy}
                onCancel={() => setMode("view")}
                onSubmit={handleSave}
              />
            )}

            {mode === "view" && (
              <>
                {!selectedId && (
                  <StatusBanner kind="empty" title="Select a resident">
                    Choose a resident from the list to view details.
                  </StatusBanner>
                )}

                {selectedId && detailLoading && (
                  <StatusBanner kind="loading" title="Loading details">
                    Fetching resident profile...
                  </StatusBanner>
                )}

                {selectedId && detailError && (
                  <StatusBanner
                    kind="error"
                    title="Could not load resident details"
                    actions={
                      <RetroButton variant="secondary" size="sm" onClick={() => loadDetail(selectedId)}>
                        Retry
                      </RetroButton>
                    }
                  >
                    {detailError}
                  </StatusBanner>
                )}

                {selectedId && !detailLoading && !detailError && (selectedResident || selectedFromList) && (
                  <>
                    <div className="detail-title">
                      <div className="detail-title__name">
                        {displayName(selectedResident || selectedFromList)}
                      </div>
                      <span className="chip">{displayBuildingUnit(selectedResident || selectedFromList)}</span>
                    </div>

                    <div className="kv">
                      <div className="kv__row">
                        <div className="kv__k">Phone</div>
                        <div className="kv__v">{(selectedResident || selectedFromList)?.phone || "—"}</div>
                      </div>
                      <div className="kv__row">
                        <div className="kv__k">Email</div>
                        <div className="kv__v">{(selectedResident || selectedFromList)?.email || "—"}</div>
                      </div>
                      <div className="kv__row">
                        <div className="kv__k">Notes</div>
                        <div className="kv__v">{(selectedResident || selectedFromList)?.notes || "—"}</div>
                      </div>
                    </div>
                  </>
                )}

                <div style={{ height: 14 }} />

                <RetroPanel title="Admin" actions={null}>
                  {!isAdmin ? (
                    <>
                      <form className="retro-form" onSubmit={handleLogin}>
                        <div className="retro-grid">
                          <Field label="Username">
                            <TextInput
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              autoComplete="username"
                              placeholder="admin"
                            />
                          </Field>
                          <Field label="Password">
                            <TextInput
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              type="password"
                              autoComplete="current-password"
                              placeholder="••••••••"
                            />
                          </Field>
                        </div>

                        <div className="retro-form__actions">
                          <RetroButton type="submit" disabled={authBusy}>
                            {authBusy ? "Signing in..." : "Sign in"}
                          </RetroButton>
                        </div>

                        {authError && (
                          <StatusBanner kind="error" title="Login failed">
                            {authError}
                          </StatusBanner>
                        )}

                        <div className="small-muted">
                          Admin actions include add/edit/delete residents.
                        </div>
                      </form>
                    </>
                  ) : (
                    <>
                      <StatusBanner
                        kind="info"
                        title="Admin session active"
                        actions={
                          <RetroButton variant="secondary" size="sm" onClick={handleLogout}>
                            Sign out
                          </RetroButton>
                        }
                      >
                        You can add, edit, and delete residents.
                      </StatusBanner>
                    </>
                  )}
                </RetroPanel>
              </>
            )}
          </RetroPanel>
        </div>
      </div>
    </div>
  );
}

export default App;
