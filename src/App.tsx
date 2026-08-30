import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type {
  CensusData,
  CensusRecord,
} from "./types/census";

import MainDashboard from "./pages/dashboard/MainDashboard";
import HouseholdPrototype from "./pages/census/HouseholdPrototype";
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

import type { Page } from "./components/sidebar/Sidebar";import {
  getCensusRecords,
  saveCensusRecord,
} from "./services/censusStorage";

import { supabase } from "./services/supabaseClient";

function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const [sidebarCollapsed, setSidebarCollapsed] =
  useState(true);

  const censusSavingRef = useRef(false);

    const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);
      setAuthLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setAuthLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Census records loaded from Supabase
 const [censusRecords, setCensusRecords] =
  useState<CensusRecord[]>([]);

  const censusData = censusRecords.map(
  (record) => record.data
);
  
useEffect(() => {
  if (!session) {
    return;
  }

  const loadCensusRecords = async () => {
    const records = await getCensusRecords();

   setCensusRecords(records);
  };

  loadCensusRecords();
}, [session]);

const handleCensusSubmit = async (
  data: CensusData
) => {
  if (censusSavingRef.current) {
    console.warn(
      "CENSUS SUBMISSION BLOCKED: save already in progress."
    );
    return;
  }

  censusSavingRef.current = true;

  try {
    const savedRecord =
      await saveCensusRecord(data);

    if (!savedRecord) {
      console.error(
        "CENSUS WAS NOT SAVED TO SUPABASE."
      );
      return;
    }

   setCensusRecords((current) => [
  ...current,
  savedRecord,
]);

    setPage("dashboard");
  } catch (error) {
    console.error(
      "FAILED TO SAVE CENSUS TO SUPABASE:",
      error
    );
  } finally {
    censusSavingRef.current = false;
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
  onLoginSuccess={() => setPage("dashboard")}
/>
  );
}

let pageContent;

if (page === "residents") {
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
} else if (page === "settings") {
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
      onLogout={async () => {
        const { error } =
          await supabase.auth.signOut();

        if (error) {
          console.error(
            "LOGOUT FAILED:",
            error
          );
          return;
        }

        setPage("dashboard");
      }}
    />
  );
}

 if (page === "census") {
  return (
    <div className="dashboard-page census-layout-page">

      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
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
                A
              </div>

              <div>
                <strong>Admin</strong>
                <span>System Administrator</span>
              </div>
            </div>

            <button
              type="button"
              className="census-back-dashboard"
              onClick={() => setPage("dashboard")}
            >
              ← Back to Dashboard
            </button>

          </div>

        </div>

        <HouseholdPrototype
          onSubmitCensus={handleCensusSubmit}
        />

      </main>

    </div>
  );
}

  if (page === "dashboard") {
  return (
    <MainDashboard
      onNewCensus={() => setPage("census")}
      onNavigate={(nextPage) =>
        setPage(nextPage)
      }
      censusRecords={censusData}
      sidebarCollapsed={sidebarCollapsed}
      onSidebarCollapsedChange={
        setSidebarCollapsed
      }
    />
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
    />

    {pageContent}
  </div>
);
}
export default App;