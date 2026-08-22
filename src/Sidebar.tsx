export type Page =
  | "dashboard"
  | "census"
  | "residents"
  | "households"
  | "families"
  | "education"
  | "occupation"
  | "skills"
  | "income"
  | "voters"
  | "education"

  ;

type SidebarProps = {
  page: Page;
  onNavigate: (page: Page) => void;
  onNewCensus: () => void;
};

function Sidebar({
  page,
  onNavigate,
  onNewCensus,
}: SidebarProps) {
  return (
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
          className={`nav-item ${
            page === "dashboard" ? "active" : ""
          }`}
          onClick={() => onNavigate("dashboard")}
        >
          <span>⌂</span>
          Dashboard
        </button>

        <button
          className={`nav-item ${
            page === "residents" ? "active" : ""
          }`}
          onClick={() => onNavigate("residents")}
        >
          <span>👥</span>
          Residents
        </button>

        <button
          className={`nav-item ${
            page === "households" ? "active" : ""
          }`}
          onClick={() => onNavigate("households")}
        >
          <span>🏠</span>
          Households
        </button>

        <button
          className={`nav-item ${
            page === "families" ? "active" : ""
          }`}
          onClick={() => {
            console.log("FAMILIES SIDEBAR CLICKED");
            onNavigate("families");
          }}
        >
          <span>👨‍👩‍👧</span>
          Families
        </button>

        <div className="nav-label">
          DATA CATEGORIES
        </div>

        <button
          className={`nav-item ${
            page === "education" ? "active" : ""
          }`}
          onClick={() => onNavigate("education")}
        >
          <span>🎓</span>
          Education
        </button>

        <button
          className={`nav-item ${
            page === "occupation" ? "active" : ""
          }`}
          onClick={() => onNavigate("occupation")}
        >
          <span>💼</span>
          Occupation
        </button>

        <button
          className={`nav-item ${
            page === "skills" ? "active" : ""
          }`}
          onClick={() => onNavigate("skills")}
        >
          <span>🛠</span>
          Skills
        </button>

        <button
          className={`nav-item ${
            page === "income" ? "active" : ""
          }`}
          onClick={() => onNavigate("income")}
        >
          <span>💰</span>
          Income
        </button>

        <button
          className={`nav-item ${
            page === "voters" ? "active" : ""
          }`}
          onClick={() => onNavigate("voters")}
        >
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
  );
}

export default Sidebar;