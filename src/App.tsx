
import { useEffect, useState } from "react";
import MainDashboard from "./MainDashboard";
import HouseholdPrototype from "./HouseholdPrototype";
import Residents from "./Residents";
import Households from "./Households";
import Families from "./Families";
import Sidebar from "./Sidebar";
import type { Page } from "./Sidebar";import {
  getCensusRecords,
  saveCensusRecord,
} from "./censusStorage";

function App() {
  const [page, setPage] = useState<Page>("dashboard");

  // Census records loaded from Supabase
const [censusRecords, setCensusRecords] = useState<any[]>([]);

useEffect(() => {
  const loadCensusRecords = async () => {
    const records = await getCensusRecords();

    setCensusRecords(
      records.map((record) => record.data)
    );
  };

  loadCensusRecords();
}, []);

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

      <Residents
        censusRecords={censusRecords}
      />

    </div>
  );
}

if (page === "families") {
  return (
    <div className="dashboard-page">

      <aside className="dashboard-sidebar">

        <div className="sidebar-brand">
          <div className="sidebar-logo">
            LOGO
          </div>

          <div>
            <h2>Barangay</h2>
            <span>Digital Census</span>
          </div>
        </div>

        <nav className="dashboard-nav">

          <button
            className="nav-item"
            onClick={() => setPage("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className="nav-item"
            onClick={() => setPage("residents")}
          >
            <span>👥</span>
            Residents
          </button>

          <button className="nav-item">
            <span>🏠</span>
            Households
          </button>

          <button
            className="nav-item active"
            onClick={() => setPage("families")}
          >
            <span>👨‍👩‍👧</span>
            Families
          </button>

          <div className="nav-label">
            DATA CATEGORIES
          </div>

          <button className="nav-item">
            <span>🎓</span>
            Education
          </button>

          <button className="nav-item">
            <span>💼</span>
            Occupation
          </button>

          <button className="nav-item">
            <span>🛠</span>
            Skills
          </button>

          <button className="nav-item">
            <span>💰</span>
            Income
          </button>

          <button className="nav-item">
            <span>🗳</span>
            Voters
          </button>

        </nav>

        <div className="sidebar-bottom">

          <button
            className="new-census-sidebar"
            onClick={() => setPage("census")}
          >
            <span>＋</span>
            New Census
          </button>

        </div>

      </aside>

      <Families
        censusRecords={censusRecords}
        onBackToDashboard={() =>
          setPage("dashboard")
        }
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
    onOpenResidents={() => setPage("residents")}
    onOpenFamilies={() => {
      console.log("OPENING FAMILIES PAGE");
      setPage("families");
    }}
    censusRecords={censusRecords}
  />
);
}

export default App;