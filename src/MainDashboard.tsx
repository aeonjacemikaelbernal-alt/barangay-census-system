import "./dashboard.css";

type MainDashboardProps = {
  onNewCensus: () => void;
  onOpenResidents: () => void;
  onOpenFamilies: () => void;
  censusRecords: any[];
};
function MainDashboard({
  onNewCensus,
  onOpenResidents,
 onOpenFamilies,
  censusRecords,
}: MainDashboardProps) {

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];
const totalHouseholds = safeRecords.length;

const allFamilies = safeRecords.flatMap(
  (record) =>
    Array.isArray(record?.families)
      ? record.families
      : []
);

const allMembers = allFamilies.flatMap(
  (family: any) =>
    Array.isArray(family?.members)
      ? family.members
      : []
);

console.log("DASHBOARD RECORDS:", safeRecords);
console.log("ALL FAMILIES:", allFamilies);
console.log("ALL MEMBERS:", allMembers);
console.log("TOTAL MEMBERS:", allMembers.length);

const totalFamilies = allFamilies.length;

const totalResidents = allMembers.length;

const totalFamilyHeads = allFamilies.reduce(
  (total: number, family: any) => {
    const members = Array.isArray(family?.members)
      ? family.members
      : [];

    return total + (members.length > 0 ? 1 : 0);
  },
  0
);

const totalRegisteredVoters = allMembers.filter(
  (member: any) =>
    String(member?.voterStatus || "")
      .trim()
      .toLowerCase() === "registered voter"
).length;

const totalChildren = allFamilies.reduce(
  (total: number, family: any) => {
    const members = Array.isArray(family?.members)
      ? family.members
      : [];

    return total + Math.max(members.length - 2, 0);
  },
  0
);
  return (
    <div className="dashboard-page">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="dashboard-sidebar">

        <div className="sidebar-brand">

          <div className="sidebar-logo">
            LOGO
          </div>

          <div>
            <h2>
              Barangay
            </h2>

            <span>
              Digital Census
            </span>
          </div>

        </div>

        <nav className="dashboard-nav">

          <button className="nav-item active">
            <span>⌂</span>
            Dashboard
          </button>
<button
  className="nav-item"
onClick={() => {
  console.log("RESIDENTS BUTTON CLICKED");
  onOpenResidents();
}}>
  <span>👥</span>
  Residents
</button>

          <button className="nav-item">
            <span>🏠</span>
            Households
          </button>

          <button
  type="button"
  className="nav-item"
  onClick={() => {
    console.log("FAMILIES BUTTON CLICKED");
    onOpenFamilies();
  }}
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
            onClick={onNewCensus}
          >
            <span>＋</span>
            New Census
          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="dashboard-main">

        {/* =================================================
            TOP HEADER
        ================================================= */}

        <header className="dashboard-header">

          <div>

            <p className="dashboard-overline">
              BARANGAY MANAGEMENT SYSTEM
            </p>

            <h1>
              Main Dashboard
            </h1>

            <p className="dashboard-description">
              Overview of residents, households,
              families and barangay census data.
            </p>

          </div>

          <button
            className="new-census-button"
            onClick={onNewCensus}
          >
            <span>＋</span>
            New Census
          </button>

        </header>

        {/* =================================================
            SUMMARY CARDS
        ================================================= */}

        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon">
              👥
            </div>

            <div className="stat-content">

              <span>
                TOTAL RESIDENTS
              </span>

              <strong>
                  {totalResidents}
              </strong>

              <small>
                Registered residents
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              🏠
            </div>

            <div className="stat-content">

              <span>
                TOTAL HOUSEHOLDS
              </span>

              <strong>
                {totalHouseholds}
              </strong>

              <small>
                Registered households
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              👨‍👩‍👧
            </div>

            <div className="stat-content">

              <span>
                TOTAL FAMILIES
              </span>

              <strong>
                {totalFamilies}
              </strong>

              <small>
                Registered families
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              👤
            </div>

            <div className="stat-content">

              <span>
                FAMILY HEADS
              </span>

              <strong>
                  {totalFamilyHeads}
              </strong>

              <small>
                Registered family heads
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              🗳
            </div>

            <div className="stat-content">

              <span>
                REGISTERED VOTERS
              </span>

              <strong>
                  {totalRegisteredVoters}
              </strong>

              <small>
                Registered voters
              </small>

            </div>

          </div>

          <div className="stat-card">

            <div className="stat-icon">
              👶
            </div>

            <div className="stat-content">

              <span>
                CHILDREN
              </span>

              <strong>
                  {totalChildren}
              </strong>

              <small>
                Resident children
              </small>

            </div>

          </div>

        </section>

        {/* =================================================
            QUICK ACTIONS
        ================================================= */}

        <section className="dashboard-section">

          <div className="section-heading">

            <div>
              <span>
                QUICK ACCESS
              </span>

              <h2>
                Census Data Categories
              </h2>
            </div>

            <p>
              Explore and analyze barangay data.
            </p>

          </div>

          <div className="category-grid">

            <button className="category-card">

              <div className="category-icon">
                👥
              </div>

              <div>
                <h3>
                  Residents
                </h3>

                <p>
                  View all registered residents
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                🏠
              </div>

              <div>
                <h3>
                  Households
                </h3>

                <p>
                  View household information
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                👨‍👩‍👧
              </div>

              <div>
                <h3>
                  Families
                </h3>

                <p>
                  Explore family structures
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                🎓
              </div>

              <div>
                <h3>
                  Education
                </h3>

                <p>
                  Educational attainment data
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                💼
              </div>

              <div>
                <h3>
                  Occupation
                </h3>

                <p>
                  Jobs and employment data
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                🛠
              </div>

              <div>
                <h3>
                  Skills
                </h3>

                <p>
                  Resident skills and specialties
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                💰
              </div>

              <div>
                <h3>
                  Income
                </h3>

                <p>
                  Household and resident income
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

            <button className="category-card">

              <div className="category-icon">
                🗳
              </div>

              <div>
                <h3>
                  Voters
                </h3>

                <p>
                  Voter registration information
                </p>
              </div>

              <span className="category-arrow">
                →
              </span>

            </button>

          </div>

        </section>

        {/* =================================================
            SEARCH
        ================================================= */}

        <section className="search-panel">

          <div>

            <span>
              QUICK SEARCH
            </span>

            <h2>
              Find a Resident
            </h2>

            <p>
              Search residents by name, occupation,
              skills or other information.
            </p>

          </div>

          <div className="dashboard-search">

            <span>
              🔍
            </span>

            <input
              type="text"
              placeholder="Search resident, occupation, skill..."
            />

          </div>

        </section>

        {/* =================================================
            RECENT ACTIVITY
        ================================================= */}

        <section className="dashboard-section">

  <div className="section-heading">

    <div>
      <span>
        RECORDS
      </span>

      <h2>
        Recent Census Activity
      </h2>
    </div>

    <p>
      Recently submitted household census records.
    </p>

  </div>

  {safeRecords.length === 0 ? (

    <div className="empty-state">

      <div className="empty-icon">
        📋
      </div>

      <h3>
        No census records yet
      </h3>

      <p>
        Start by adding your first household
        census record.
      </p>

      <button
        onClick={onNewCensus}
        className="empty-action"
      >
        ＋ Add First Census
      </button>

    </div>

  ) : (

    <div className="recent-records">
        console.log("RECENT ACTIVITY COUNT:", safeRecords.length);
console.log("RECENT ACTIVITY DATA:", safeRecords);
      {safeRecords.map(
        (record: any, index: number) => {

          const household =
            record?.household || {};

          const families =
            Array.isArray(record?.families)
              ? record.families
              : [];

          const residents =
            families.reduce(
              (
                total: number,
                family: any
              ) => {

                const members =
                  Array.isArray(
                    family?.members
                  )
                    ? family.members
                    : [];

                return (
                  total + members.length
                );
              },
              0
            );

          return (

            <div
              className="recent-record-card"
              key={
                record?.householdNumber ||
                index
              }
            >

              <div className="recent-record-icon">
                🏠
              </div>

              <div className="recent-record-main">

                <div className="recent-record-title">

                  <strong>
                    {record?.householdNumber ||
                      "HOUSEHOLD"}
                  </strong>

                  <span>
                    Household Record
                  </span>

                </div>

                <div className="recent-record-location">

                  {household?.houseNumber && (
                    <span>
                      House No.{" "}
                      {household.houseNumber}
                    </span>
                  )}

                  {household?.street && (
                    <span>
                      {household.street}
                    </span>
                  )}

                  {household?.purok && (
                    <span>
                      {household.purok}
                    </span>
                  )}

                </div>

                <div className="recent-record-stats">

                  <span>
                    👨‍👩‍👧 {families.length} Family
                    {families.length !== 1
                      ? "ies"
                      : ""}
                  </span>

                  <span>
                    👥 {residents} Resident
                    {residents !== 1
                      ? "s"
                      : ""}
                  </span>

                </div>

              </div>

            </div>

          );
        }
      )}

    </div>

  )}

</section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="dashboard-footer">

          <span>
            Barangay Digital Census System
          </span>

          <span>
            Official Barangay Census Management
          </span>

        </footer>

      </main>

    </div>
  );
}

export default MainDashboard;