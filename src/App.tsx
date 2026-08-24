import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import MainDashboard from "./MainDashboard";
import HouseholdPrototype from "./HouseholdPrototype";
import Residents from "./Residents";
import Households from "./Households";
import Families from "./Families";
import Education from "./Education";
import Occupation from "./Occupation";
import Skills from "./Skills";
import Income from "./Income";
import Voters from "./Voters";
import FourPs from "./FourPs";
import Sidebar from "./Sidebar";
import Login from "./Login";
import Settings from "./Settings";

import type { Page } from "./Sidebar";import {
  getCensusRecords,
  saveCensusRecord,
} from "./censusStorage";

import { supabase } from "./supabaseClient";

function App() {
  const [page, setPage] = useState<Page>("dashboard");

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
const [censusRecords, setCensusRecords] = useState<any[]>([]);

useEffect(() => {
  if (!session) {
    return;
  }

  const loadCensusRecords = async () => {
    const records = await getCensusRecords();

    setCensusRecords(
      records.map((record) => record.data)
    );
  };

  loadCensusRecords();
}, [session]);

const handleCensusSubmit = async (data: any) => {
  console.log("RECEIVED CENSUS DATA IN APP:", data);

  try {
    const savedRecord = await saveCensusRecord(data);
    if (!savedRecord) {
      console.error("CENSUS WAS NOT SAVED TO SUPABASE.");
      return;
    }

    console.log(
      "CENSUS SAVED SUCCESSFULLY:",
      savedRecord
    );

    setCensusRecords((current) => [
      ...current,
      savedRecord.data,
    ]);

    setPage("dashboard");

  } catch (error) {
    console.error(
      "FAILED TO SAVE CENSUS TO SUPABASE:",
      error
    );
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

if (page === "residents") {
  return (
    <div className="dashboard-page">

      <Sidebar
        page={page}
        onNavigate={(nextPage) =>
          setPage(nextPage as Page)
        }
        onNewCensus={() => setPage("census")}
      />

      <Residents />

    </div>
  );
}
if (page === "families") {
  return (
    <div className="dashboard-page">

      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Families
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />

    </div>
  );
}

if (page === "fourPs") {
  return (
    <div className="dashboard-page">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <FourPs
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />
    </div>
  );
}

if (page === "households") {
  return (
    <div className="dashboard-page">

      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Households
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />

    </div>
  );
}

if (page === "education") {
  return (
    <div className="dashboard-page">

      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Education
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />

    </div>
  );
}

if (page === "occupation") {
  return (
    <div className="dashboard-page">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Occupation
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />
    </div>
  );
}

if (page === "skills") {
  return (
    <div className="dashboard-page">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Skills
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />
    </div>
  );
}

if (page === "income") {
  return (
    <div className="dashboard-page">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Income
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />
    </div>
  );
}

if (page === "voters") {
  return (
    <div className="dashboard-page">
      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Voters
        censusRecords={censusRecords}
        onBackToDashboard={() => setPage("dashboard")}
      />
    </div>
  );
}

if (page === "settings") {
  
  return (
    <div className="dashboard-page">

      <Sidebar
        page={page}
        onNavigate={setPage}
        onNewCensus={() => setPage("census")}
      />

      <Settings
        email={session?.user?.email}
        onBackToDashboard={() =>
          setPage("dashboard")
        }
        onRefreshData={async () => {
          const records = await getCensusRecords();

          setCensusRecords(
            records.map((record) => record.data)
          );
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

    </div>
  );
}



  if (page === "census") {
    return (
      <div className="census-page-wrapper">

        <div
          style={{
            maxWidth: "1240px",
            margin: "20px auto 0",
            padding: "0 20px",
          }}
        >
          <button
            onClick={() => setPage("dashboard")}
            style={{
              border: "none",
              background: "transparent",
              color: "#176b57",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "10px 0",
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        <HouseholdPrototype
          onSubmitCensus={handleCensusSubmit}
        />

      </div>
    );
  }
console.log("APP CENSUS RECORDS:", censusRecords);
console.log("APP FIRST RECORD:", censusRecords[0]);
console.log(
  "APP FIRST RECORD FAMILIES:",
  censusRecords[0]?.families
);
 return (
  <MainDashboard
    onNewCensus={() => setPage("census")}
    onNavigate={(nextPage) => {
      console.log("APP NAVIGATION:", nextPage);
      setPage(nextPage);
    }}
    censusRecords={censusRecords}
  />
);
}

export default App;