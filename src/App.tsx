import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  CensusData,
  CensusRecord,
} from "./types/census";

import MainDashboard from "./pages/dashboard/MainDashboard";
import HouseholdPrototype from "./pages/census/HouseholdPrototype";
import {
  deleteCensusLocalDraft,
  getCensusLocalDrafts,
  markCensusDraftPendingSync,
  type CensusLocalDraft,
} from "./services/censusDraftStorage";
import Residents from "./pages/residents/Residents";
import Households from "./pages/households/Households";
import Families from "./pages/families/Families";
import Education from "./pages/education/Education";
import Occupation from "./pages/occupation/Occupation";
import Skills from "./pages/skills/Skills";
import Income from "./pages/income/Income";
import Voters from "./pages/voters/Voters";
import FourPs from "./pages/fourps/FourPs";
import Sidebar from "./components/sidebar/Sidebar";
import Login from "./pages/login/Login";
import Settings from "./pages/settings/Settings";
import Documents from "./pages/documents/Documents";
import AuditTrail from "./pages/audit/AuditTrail";
import RecycleBin from "./pages/recycle/RecycleBin";
import EncoderUpdates from "./pages/encoder/EncoderUpdates";

import type { Page } from "./components/sidebar/Sidebar";import {
  getCensusRecords,
  saveCensusRecord,
} from "./services/censusStorage";

import {
  getDashboardSummary,
  type DashboardSummary,
} from "./services/dashboardService";

import { supabase } from "./services/supabaseClient";

import {
  getAuthorizedUser,
  type AuthorizedUser,
} from "./services/authService";
import {
  applyAppTheme,
  readSavedTheme,
} from "./utils/theme";

const OFFLINE_AUTH_CACHE_PREFIX =
  "barangay-census:offline-user:v1:";
const OFFLINE_AUTH_MAX_AGE_MS =
  7 * 24 * 60 * 60 * 1000;

type CachedAuthorizedUser = {
  verifiedAt: string;
  user: AuthorizedUser;
};

function cacheAuthorizedUser(
  authUserId: string,
  user: AuthorizedUser
): void {
  try {
    const cached: CachedAuthorizedUser = {
      verifiedAt: new Date().toISOString(),
      user,
    };

    localStorage.setItem(
      `${OFFLINE_AUTH_CACHE_PREFIX}${authUserId}`,
      JSON.stringify(cached)
    );
  } catch (error) {
    console.error(
      "FAILED TO CACHE OFFLINE USER ACCESS:",
      error
    );
  }
}

function getCachedAuthorizedUser(
  authUserId: string
): AuthorizedUser | null {
  try {
    const key =
      `${OFFLINE_AUTH_CACHE_PREFIX}${authUserId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached =
      JSON.parse(raw) as CachedAuthorizedUser;
    const verifiedAt =
      new Date(cached.verifiedAt).getTime();

    if (
      !Number.isFinite(verifiedAt) ||
      Date.now() - verifiedAt >
        OFFLINE_AUTH_MAX_AGE_MS ||
      !cached.user ||
      cached.user.auth_user_id !== authUserId ||
      !cached.user.is_active
    ) {
      localStorage.removeItem(key);
      return null;
    }

    return cached.user;
  } catch (error) {
    console.error(
      "FAILED TO LOAD OFFLINE USER ACCESS:",
      error
    );
    return null;
  }
}

function clearCachedAuthorizedUser(
  authUserId?: string
): void {
  if (!authUserId) return;
  localStorage.removeItem(
    `${OFFLINE_AUTH_CACHE_PREFIX}${authUserId}`
  );
}

function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const [sidebarCollapsed, setSidebarCollapsed] =
  useState(true);

  const censusSavingRef = useRef(false);
  const loggingOutRef = useRef(false);

   const [session, setSession] =
  useState<Session | null>(null);

const [
  authorizedUser,
  setAuthorizedUser,
] = useState<AuthorizedUser | null>(null);

const [authLoading, setAuthLoading] =
  useState(true);

useEffect(() => {
  applyAppTheme(
    !authLoading && session
      ? readSavedTheme() ?? "light"
      : "light"
  );
}, [authLoading, session]);

const [offlineMode, setOfflineMode] =
  useState(!navigator.onLine);

const [
  censusSubmitSuccess,
  setCensusSubmitSuccess,
] = useState(false);

const [activeDraftId, setActiveDraftId] =
  useState<string | null>(null);

const [censusDrafts, setCensusDrafts] =
  useState<CensusLocalDraft[]>([]);

const [syncingDraftId, setSyncingDraftId] =
  useState<string | null>(null);

const [
  showCensusLeaveConfirm,
  setShowCensusLeaveConfirm,
] = useState(false);

const refreshCensusDrafts = () => {
  setCensusDrafts(
    session?.user.id ? getCensusLocalDrafts(session.user.id) : []
  );
};

  const [dashboardSummary, setDashboardSummary] =
  useState<DashboardSummary>({
    totalHouseholds: 0,
    totalResidents: 0,
    totalFamilies: 0,
    largestHouseholdCount: 0,
    totalFamilyHeads: 0,
    totalRegisteredVoters: 0,

    householdTrend: [],
    recentActivity: [],

    totalChildren: 0,

    maleCount: 0,
    femaleCount: 0,

    childrenAgeCount: 0,
    adolescentCount: 0,
    adultCount: 0,
    seniorCount: 0,

    educationData: [],
    occupationData: [],
    skillsData: [],

  });

useEffect(() => {
  const handleOnline = () => setOfflineMode(false);
  const handleOffline = () => setOfflineMode(true);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}, []);

const handleLogout = async () => {
  const authUserId = session?.user.id;

  const { error } =
    await supabase.auth.signOut({
      scope: "local",
    });

  if (error) {
    console.error(
  "LOGOUT FAILED:",
  error
);
    return;
  }

  clearCachedAuthorizedUser(authUserId);
  setSession(null);
  setAuthorizedUser(null);
  setCensusRecords([]);
  setPage("dashboard");
};

 useEffect(() => {
  let isMounted = true;

  const validateSession = async (
  nextSession: Session | null
) => {
  if (loggingOutRef.current) {
    if (isMounted) {
      setSession(null);
      setAuthorizedUser(null);
      setAuthLoading(false);
    }

    return;
  }

  if (!nextSession) {

      if (isMounted) {
        setSession(null);
        setAuthorizedUser(null);
        setAuthLoading(false);
      }

      return;
    }

    try {
      const profile =
        await getAuthorizedUser(
          nextSession.user.id
        );

      if (loggingOutRef.current) {
        return;
      }

      if (!profile || !profile.is_active) {
        clearCachedAuthorizedUser(
          nextSession.user.id
        );
        await supabase.auth.signOut();

        if (isMounted) {
          setSession(null);
          setAuthorizedUser(null);
        }
        return;
      }

      cacheAuthorizedUser(
        nextSession.user.id,
        profile
      );

      if (isMounted) {
        setSession(nextSession);
        setAuthorizedUser(profile);
        setCensusDrafts(getCensusLocalDrafts(nextSession.user.id));
        setOfflineMode(false);
      }
    } catch (error) {
      const cachedUser =
        getCachedAuthorizedUser(
          nextSession.user.id
        );

      if (!navigator.onLine && cachedUser) {
        if (isMounted) {
        setSession(nextSession);
        setAuthorizedUser(cachedUser);
        setCensusDrafts(getCensusLocalDrafts(nextSession.user.id));
        setOfflineMode(true);
        }
        return;
      }

      console.error(
        "FAILED TO VERIFY USER ACCESS:",
        error
      );

      if (isMounted) {
        setSession(null);
        setAuthorizedUser(null);
      }
    } finally {
      if (isMounted) {
        setAuthLoading(false);
      }
    }
  };

  const loadInitialSession = async () => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    await validateSession(
      currentSession
    );
  };

  loadInitialSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, nextSession) => {
      void validateSession(nextSession);
    }
  );

  return () => {
    isMounted = false;
    subscription.unsubscribe();
  };
}, []);

  // Census records loaded from Supabase
const [censusRecords, setCensusRecords] =
  useState<CensusRecord[]>([]);

const censusData = censusRecords.map(
  (record) => record.data
);

// =====================================================
// LOAD DASHBOARD SUMMARY ONLY
// =====================================================

useEffect(() => {
  if (!session) {
    return;
  }

  const loadDashboardSummary = async () => {
    try {
      const summary =
        await getDashboardSummary();

      setDashboardSummary(summary);
    } catch (error) {
      console.error(
        "FAILED TO LOAD DASHBOARD SUMMARY:",
        error
      );
    }
  };

  loadDashboardSummary();
}, [session]);

// =====================================================
// LOAD CENSUS RECORDS AFTER LOGIN
// =====================================================

useEffect(() => {
  if (!session) {
    setCensusRecords([]);
    return;
  }

  let isMounted = true;

  const loadCensusRecords = async () => {
    try {
      const records =
        await getCensusRecords();

      if (isMounted) {
        setCensusRecords(records);
      }
    } catch (error) {
      console.error(
        "FAILED TO LOAD CENSUS RECORDS:",
        error
      );
    }
  };

  loadCensusRecords();

  return () => {
    isMounted = false;
  };
}, [session]);

const handleCensusSubmit = async (
  data: CensusData
): Promise<boolean> => {
  if (censusSavingRef.current) {
    console.warn(
      "CENSUS SUBMISSION BLOCKED: save already in progress."
    );
    return false;
  }

  censusSavingRef.current = true;

  try {
    const savedRecord =
      await saveCensusRecord(data);

    if (!savedRecord) {
      console.error(
        "CENSUS WAS NOT SAVED TO SUPABASE."
      );
      return false;
    }

    setCensusRecords((current) => [
      ...current,
      savedRecord,
    ]);

    try {
      const refreshedSummary =
        await getDashboardSummary();

      setDashboardSummary(
        refreshedSummary
      );
    } catch (dashboardError) {
      console.error(
        "CENSUS SAVED, BUT DASHBOARD REFRESH FAILED:",
        dashboardError
      );
    }

    setCensusSubmitSuccess(true);
    return true;
  } catch (error) {
    console.error(
      "FAILED TO SAVE CENSUS TO SUPABASE:",
      error
    );
    return false;
  } finally {
    censusSavingRef.current = false;
  }
};

const handleEncoderUpdateSaved = async (updatedRecord: CensusRecord) => {
  setCensusRecords((current) => current.map((record) =>
    record.id === updatedRecord.id ? updatedRecord : record
  ));
  try {
    const records = await getCensusRecords();
    setCensusRecords(records);
  } catch (error) {
    console.error("UPDATED RESIDENT, BUT RECORD REFRESH FAILED:", error);
  }
  try {
    const refreshedSummary = await getDashboardSummary();
    setDashboardSummary(refreshedSummary);
  } catch (error) {
    console.error("UPDATED RESIDENT, BUT DASHBOARD REFRESH FAILED:", error);
  }
};

  const handleSyncDraft = async (
  draft: CensusLocalDraft
): Promise<void> => {
  if (
    !navigator.onLine ||
    draft.status !== "pending-sync" ||
    !draft.pendingData ||
    syncingDraftId
  ) return;

  setSyncingDraftId(draft.draftId);
  try {
    const saved =
      await handleCensusSubmit(draft.pendingData);
    if (!saved) return;

    if (session?.user.id) deleteCensusLocalDraft(session.user.id, draft.draftId);
    refreshCensusDrafts();
  } finally {
    setSyncingDraftId(null);
  }
};

if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }
 if (!session) {
  return (
    <Login
      onLoginSuccess={(user) => {
        cacheAuthorizedUser(
          user.auth_user_id,
          user
        );
        setAuthorizedUser(user);
        setCensusDrafts(getCensusLocalDrafts(user.auth_user_id));
        setOfflineMode(false);
        setPage("dashboard");
      }}
    />
  );
}

// =====================================================
// ROLE-BASED PAGE ACCESS
// =====================================================

const offlineAllowedPages: Page[] = [
  "dashboard",
  "census",
];

if (
  offlineMode &&
  !offlineAllowedPages.includes(page)
) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <h2>Offline Mode</h2>
      <p>
        Only Dashboard and Census Drafts are available
        while this device is offline.
      </p>
      <button
        type="button"
        onClick={() => setPage("census")}
      >
        Open Census Drafts
      </button>
    </div>
  );
}

const encoderAllowedPages: Page[] = [
  "dashboard",
  "census",
  "encoderUpdates",
  "auditTrail",
];

if (
  authorizedUser?.role === "encoder" &&
  !encoderAllowedPages.includes(page)
) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <h2>Access Denied</h2>

      <p>
        Your Encoder account does not have
        permission to access this page.
      </p>

      <button
        type="button"
        onClick={() => setPage("dashboard")}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

if (page === "encoderUpdates" && authorizedUser?.role !== "encoder") {
  return (
    <div className="route-access-denied">
      <h2>Access Denied</h2>
      <p>Encoder update workspace is available to Encoder accounts only.</p>
      <button type="button" onClick={() => setPage("dashboard")}>Back to Dashboard</button>
    </div>
  );
}

let pageContent;

if (page === "encoderUpdates" && authorizedUser?.role === "encoder") {
  pageContent = (
    <EncoderUpdates
      censusRecords={censusRecords}
      onBackToDashboard={() => setPage("dashboard")}
      onUpdated={handleEncoderUpdateSaved}
    />
  );
} else if (page === "residents") {
  pageContent = (
    <Residents censusRecords={censusData} />
  );
} else if (page === "households") {
  pageContent = (
    <Households
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "families") {
  pageContent = (
    <Families
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "education") {
  pageContent = (
    <Education
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "occupation") {
  pageContent = (
    <Occupation
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "skills") {
  pageContent = (
    <Skills
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "income") {
  pageContent = (
    <Income
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "voters") {
  pageContent = (
    <Voters
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (page === "fourPs") {
  pageContent = (
    <FourPs
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (
  page === "documents" &&
  authorizedUser?.role === "secretary"
) {
  pageContent = (
    <Documents
      censusRecords={censusData}
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (
  page === "auditTrail" &&
  ["secretary", "encoder"].includes(authorizedUser?.role || "")
) {
  pageContent = (
    <AuditTrail
      onBackToDashboard={() => setPage("dashboard")}
    />
  );
} else if (
  page === "recycleBin" &&
  authorizedUser?.role === "secretary"
) {
  pageContent = (
    <RecycleBin
      onBackToDashboard={() => setPage("dashboard")}
      onDataChanged={async () => {
        const records = await getCensusRecords();
        setCensusRecords(records);

        const refreshedSummary =
          await getDashboardSummary();
        setDashboardSummary(refreshedSummary);
      }}
    />
  );
} else if (
  page === "settings" &&
  authorizedUser?.role === "secretary"
) {
  pageContent = (
    <Settings
      email={session?.user?.email}
      onBackToDashboard={() =>
        setPage("dashboard")
      }
      onRefreshData={async () => {
        const records =
          await getCensusRecords();

        setCensusRecords(records);
      }}
      onLogout={handleLogout}
    />
  );
}

if (
  page === "settings" &&
  authorizedUser?.role !== "secretary"
) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <h2>Access Denied</h2>

      <p>
        You do not have permission to access
        Settings.
      </p>

      <button
        type="button"
        onClick={() => setPage("dashboard")}
      >
        Back to Dashboard
      </button>

    </div>
  );
}

 if (page === "census") {
  return (
    <div className="dashboard-page census-layout-page">

 <Sidebar
  page={page}
  onNavigate={setPage}
  onNewCensus={() =>
    setPage("census")
  }
  collapsed={sidebarCollapsed}
  onCollapsedChange={
    setSidebarCollapsed
  }
  role={authorizedUser?.role ?? ""}

/>

      <main className="dashboard-main census-main-shell">

        <div className="census-page-topbar">

          <div>
            <h1>General Census Registration</h1>

            <p>
              Please provide accurate and complete
              information.
            </p>
          </div>

          <div className="census-topbar-actions">

            <div className="census-admin-info">
  <div className="census-admin-avatar">
    {(
      authorizedUser?.full_name?.charAt(0) ||
      session.user.email?.charAt(0) ||
      "U"
    ).toUpperCase()}
  </div>

  <div>
    <strong>
      {authorizedUser?.full_name ||
        session.user.email ||
        "Authorized User"}
    </strong>

    <span>
      {authorizedUser?.role
        ? authorizedUser.role
            .charAt(0)
            .toUpperCase() +
          authorizedUser.role.slice(1)
        : "Authorized User"}
    </span>
  </div>
</div>
            <button
              type="button"
              className="census-back-dashboard"
              onClick={() => {
                if (activeDraftId !== null) {
                  setShowCensusLeaveConfirm(true);
                  return;
                }

                setActiveDraftId(null);
                refreshCensusDrafts();
                setPage("dashboard");
              }}
            >
              ← Back to Dashboard
            </button>

          </div>

        </div>

        {activeDraftId === null ? (
          <section
            style={{
              maxWidth: "980px",
              margin: "24px auto",
              padding: "24px",
              background: "#ffffff",
              borderRadius: "16px",
              boxShadow:
                "0 10px 30px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Census Drafts
                </h2>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#64748b",
                  }}
                >
                  Resume an unfinished census or start
                  a new household census.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveDraftId(
                    `new-${Date.now()}`
                  )
                }
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "12px 18px",
                  background: "#15803d",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                + Start New Census
              </button>
            </div>

            {censusDrafts.length === 0 ? (
              <div
                style={{
                  padding: "28px",
                  textAlign: "center",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "12px",
                  color: "#64748b",
                }}
              >
                No unfinished census drafts yet.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "12px",
                }}
              >
                {censusDrafts.map((draft) => (
                  <div
                    key={draft.draftId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      background: "#ffffff",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          draft.status !== "pending-sync"
                        ) {
                          setActiveDraftId(
                            draft.draftId
                          );
                        }
                      }}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: 0,
                        border: "none",
                        background: "transparent",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "9px",
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>
                          {draft.householdNumber}
                        </strong>

                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "999px",
                            background: "#fef3c7",
                            color: "#92400e",
                            fontSize: "11px",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {draft.status === "pending-sync"
                            ? "PENDING SYNC"
                            : "DRAFT"}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: "7px",
                          display: "grid",
                          gap: "4px",
                          color: "#64748b",
                          fontSize: "13px",
                        }}
                      >
                        <span>
                          {draft.purok || "Purok not selected"}
                          {" • "}
                          {draft.families[0]?.familyName
                            ? `${draft.families[0].familyName} Family`
                            : "Family name not entered"}
                          {" • "}
                          {draft.families.length}{" "}
                          {draft.families.length === 1
                            ? "family"
                            : "families"}
                        </span>

                        <span
                          style={{
                            color: "#334155",
                            fontWeight: 700,
                          }}
                        >
                          {draft.censusStep === "household" &&
                            "Step 1 of 4 — Household Information"}
                          {draft.censusStep === "family" &&
                            "Step 2 of 4 — Family Information"}
                          {draft.censusStep === "resident" &&
                            "Step 3 of 4 — Resident Information"}
                          {draft.censusStep === "review" &&
                            "Step 4 of 4 — Review & Submit"}
                        </span>

                        <span>
                          Last saved:{" "}
                          {new Date(
                            draft.updatedAt
                          ).toLocaleString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </button>

                    {draft.status === "pending-sync" ? (
                      <button
                        type="button"
                        disabled={
                          offlineMode ||
                          syncingDraftId === draft.draftId
                        }
                        onClick={() =>
                          void handleSyncDraft(draft)
                        }
                        style={{
                          border: "1px solid #f59e0b",
                          borderRadius: "9px",
                          padding: "9px 13px",
                          background: "#fffbeb",
                          color: "#92400e",
                          fontWeight: 700,
                          cursor: offlineMode
                            ? "not-allowed"
                            : "pointer",
                          opacity: offlineMode ? 0.6 : 1,
                        }}
                      >
                        {syncingDraftId === draft.draftId
                          ? "Syncing..."
                          : offlineMode
                            ? "Waiting for Internet"
                            : "Sync Now"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDraftId(
                            draft.draftId
                          )
                        }
                        style={{
                          border: "1px solid #cbd5e1",
                          borderRadius: "9px",
                          padding: "9px 13px",
                          background: "#ffffff",
                          color: "#334155",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Resume
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const confirmed =
                          window.confirm(
                            `Delete draft ${draft.householdNumber}? This cannot be undone.`
                          );

                        if (!confirmed) {
                          return;
                        }

                        deleteCensusLocalDraft(
                          session.user.id,
                          draft.draftId
                        );
                        refreshCensusDrafts();
                      }}
                      style={{
                        border: "1px solid #fecaca",
                        borderRadius: "9px",
                        padding: "9px 13px",
                        background: "#fff1f2",
                        color: "#b91c1c",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <HouseholdPrototype
            key={activeDraftId}
            ownerId={session.user.id}
            draftId={
              activeDraftId.startsWith("new-")
                ? null
                : activeDraftId
            }
            onDraftsChanged={
              refreshCensusDrafts
            }
            onSubmitCensus={
              handleCensusSubmit
            }
            onSaveDraftAndExit={() => {
              setActiveDraftId(null);
              refreshCensusDrafts();
            }}
            onQueuePendingSync={(draftId, data) => {
              markCensusDraftPendingSync(
                session.user.id,
                draftId,
                data
              );
              setActiveDraftId(null);
              refreshCensusDrafts();
            }}
          />
        )}

        {showCensusLeaveConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99998,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: "430px",
                maxWidth: "100%",
                padding: "28px",
                borderRadius: "18px",
                background: "#ffffff",
                boxShadow:
                  "0 25px 60px rgba(15, 23, 42, 0.25)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px",
                  color: "#172033",
                  fontSize: "21px",
                }}
              >
                Return to Dashboard?
              </h2>

              <p
                style={{
                  margin: "0 0 22px",
                  color: "#64748b",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Your current census progress has been
                saved as a draft. You can resume it
                later from the Census Drafts list.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowCensusLeaveConfirm(false)
                  }
                  style={{
                    padding: "10px 16px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "9px",
                    background: "#ffffff",
                    color: "#334155",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Stay Here
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowCensusLeaveConfirm(false);
                    setActiveDraftId(null);
                    refreshCensusDrafts();
                    setPage("dashboard");
                  }}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "9px",
                    background: "#15803d",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        )}

        {censusSubmitSuccess && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(15, 23, 42, 0.58)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: "400px",
                maxWidth: "100%",
                padding: "32px 28px 28px",
                borderRadius: "18px",
                background: "#ffffff",
                textAlign: "center",
                boxShadow:
                  "0 25px 60px rgba(15, 23, 42, 0.25)",
              }}
            >
              <div
                style={{
                  width: "62px",
                  height: "62px",
                  margin: "0 auto 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "#dcfce7",
                  color: "#15803d",
                  fontSize: "30px",
                  fontWeight: 700,
                }}
              >
                ✓
              </div>

              <h2
                style={{
                  margin: "0 0 10px",
                  color: "#172033",
                  fontSize: "22px",
                }}
              >
                Census Submitted Successfully
              </h2>

              <p
                style={{
                  margin: "0 0 26px",
                  color: "#64748b",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                The household census record has been
                saved successfully.
              </p>

              <button
                type="button"
                onClick={() => {
                  setCensusSubmitSuccess(false);
                  setActiveDraftId(null);
                  refreshCensusDrafts();
                  setPage("dashboard");
                }}
                style={{
                  width: "100%",
                  height: "46px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#15803d",
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}

 if (page === "dashboard") {
  return (
    <>
      {offlineMode && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: "14px",
            right: "18px",
            zIndex: 99999,
            padding: "9px 13px",
            border: "1px solid #fbbf24",
            borderRadius: "999px",
            background: "#fffbeb",
            color: "#92400e",
            fontSize: "12px",
            fontWeight: 800,
          }}
        >
          Offline Mode
        </div>
      )}

      <MainDashboard
      onNewCensus={() => {
        setActiveDraftId(null);
        refreshCensusDrafts();
        setPage("census");
      }}
      onNavigate={(nextPage) =>
        setPage(nextPage)
      }
      censusRecords={censusData}
      dashboardSummary={dashboardSummary}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={
        setSidebarCollapsed
      }
      role={authorizedUser?.role ?? ""}
    />
    </>
  );
}

return (
  <div className="dashboard-page">
  <Sidebar
  page={page}
  onNavigate={setPage}
  onNewCensus={() =>
    setPage("census")
  }
  collapsed={sidebarCollapsed}
  onCollapsedChange={
    setSidebarCollapsed
  }
  role={authorizedUser?.role ?? ""}
/>

    {pageContent}
  </div>
);
}
export default App;
