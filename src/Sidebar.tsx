import {
  useEffect,
  useState,
} from "react";

import barangayLogo from "./assets/barangay-pambuhan-logo.png";

import {
  Home,
  Users,
  House,
  UsersRound,
  GraduationCap,
  BriefcaseBusiness,
  Wrench,
  WalletCards,
  Vote,
  Settings,
  HeartHandshake,
  Plus,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export type Page =
  | "dashboard"
  | "residents"
  | "households"
  | "families"
  | "education"
  | "occupation"
  | "skills"
  | "income"
  | "voters"
  | "fourPs"
  | "settings"
  | "census";

type SidebarProps = {
  page: Page;
  onNavigate: (page: Page) => void;
  onNewCensus: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

function Sidebar({
  page,
  onNavigate,
  onNewCensus,
  collapsed,
  onCollapsedChange,
}: SidebarProps) {

const [censusOpen, setCensusOpen] = useState(false);
const [dataOpen, setDataOpen] = useState(false);
const [socialOpen, setSocialOpen] = useState(false);

const censusGroupActive =
  page === "residents" ||
  page === "households" ||
  page === "families";

const dataGroupActive =
  page === "education" ||
  page === "occupation" ||
  page === "skills" ||
  page === "income";

const socialGroupActive =
  page === "voters" ||
  page === "fourPs";

useEffect(() => {
  if (collapsed) {
    return;
  }

  if (censusGroupActive) {
    setCensusOpen(true);
  }

  if (dataGroupActive) {
    setDataOpen(true);
  }

  if (socialGroupActive) {
    setSocialOpen(true);
  }
}, [
  page,
  collapsed,
  censusGroupActive,
  dataGroupActive,
  socialGroupActive,
]);

const handleNavigate = (nextPage: Page) => {
  onNavigate(nextPage);
};

const handleGroupClick = (
  group: "census" | "data" | "social"
) => {
  if (collapsed) {
    onCollapsedChange(false);

    if (group === "census") {
      setCensusOpen(true);
    }

    if (group === "data") {
      setDataOpen(true);
    }

    if (group === "social") {
      setSocialOpen(true);
    }

    return;
  }

  if (group === "census") {
    setCensusOpen((current) => !current);
  }

  if (group === "data") {
    setDataOpen((current) => !current);
  }

  if (group === "social") {
    setSocialOpen((current) => !current);
  }
};

  return (

<aside
  className={`dashboard-sidebar ${
    collapsed ? "collapsed" : ""
  }`}
>
      {/* BRAND */}

      <div className="sidebar-brand">

       <div className="sidebar-logo">
  <img
    src={barangayLogo}
    alt="Barangay Pambuhan Logo"
  />
</div>

        <div>
          <h2>Barangay</h2>
          <span>Digital Census</span>
        </div>

      </div>

      <div className="sidebar-toggle-row">
  <button
    type="button"
    className="sidebar-toggle"
    onClick={() =>
  onCollapsedChange(!collapsed)
}
    aria-label={
      collapsed
        ? "Expand sidebar"
        : "Collapse sidebar"
    }
  >
    {collapsed ? (
      <Menu size={21} strokeWidth={2} />
    ) : (
      <X size={21} strokeWidth={2} />
    )}
  </button>
</div>

      {/* NAVIGATION */}

      <nav className="dashboard-nav">

        <button
          type="button"
          className={`nav-item ${
            page === "dashboard" ? "active" : ""
          }`}
          onClick={() => handleNavigate("dashboard")}
        >
         <span className="nav-icon sidebar-icon-dashboard">
  <Home size={18} strokeWidth={2} />
</span>

<span className="nav-text">
    Dashboard
  </span>
        </button>

        {/* =================================================
    CENSUS RECORDS
================================================= */}

<div className="sidebar-group">

  <button
    type="button"
    className={`sidebar-group-toggle ${
  censusGroupActive ? "group-active" : ""
}`}
    onClick={() => handleGroupClick("census")}
  >
    <span className="nav-icon group-census-icon">
      <UsersRound
        size={18}
        strokeWidth={1.8}
      />
    </span>

    <span className="nav-text sidebar-group-title">
      Census Records
    </span>

    {!collapsed && (
      <span className="sidebar-group-chevron">
        {censusOpen ? (
          <ChevronDown
            size={16}
            strokeWidth={1.8}
          />
        ) : (
          <ChevronRight
            size={16}
            strokeWidth={1.8}
          />
        )}
      </span>
    )}

  </button>

  {!collapsed && censusOpen && (

    <div className="sidebar-submenu">

      {/* RESIDENTS */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "residents" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("residents")
        }
      >
        <span className="nav-icon sidebar-icon-residents">
          <Users
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Residents
        </span>
      </button>


      {/* HOUSEHOLDS */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "households" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("households")
        }
      >
        <span className="nav-icon sidebar-icon-households">
          <House
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Households
        </span>
      </button>


      {/* FAMILIES */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "families" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("families")
        }
      >
        <span className="nav-icon sidebar-icon-families">
          <UsersRound
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Families
        </span>
      </button>

    </div>

  )}

</div>

        {/* =================================================
    DATA CATEGORIES
================================================= */}

<div className="sidebar-group">

  <button
    type="button"
    className={`sidebar-group-toggle ${
  dataGroupActive ? "group-active" : ""
}`}
    onClick={() => handleGroupClick("data")}
  >
    <span className="nav-icon group-data-icon">
      <GraduationCap
        size={18}
        strokeWidth={1.8}
      />
    </span>

    <span className="nav-text sidebar-group-title">
      Data Categories
    </span>

    {!collapsed && (
      <span className="sidebar-group-chevron">
        {dataOpen ? (
          <ChevronDown
            size={16}
            strokeWidth={1.8}
          />
        ) : (
          <ChevronRight
            size={16}
            strokeWidth={1.8}
          />
        )}
      </span>
    )}
  </button>

  {!collapsed && dataOpen && (
    <div className="sidebar-submenu">

      {/* EDUCATION */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "education" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("education")
        }
      >
        <span className="nav-icon sidebar-icon-education">
          <GraduationCap
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Education
        </span>
      </button>


      {/* OCCUPATION */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "occupation" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("occupation")
        }
      >
        <span className="nav-icon sidebar-icon-occupation">
          <BriefcaseBusiness
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Occupation
        </span>
      </button>


      {/* SKILLS */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "skills" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("skills")
        }
      >
        <span className="nav-icon sidebar-icon-skills">
          <Wrench
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Skills
        </span>
      </button>


      {/* INCOME */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "income" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("income")
        }
      >
        <span className="nav-icon sidebar-icon-income">
          <WalletCards
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Income
        </span>
      </button>

    </div>
  )}

</div>

      {/* =================================================
    SOCIAL RECORDS
================================================= */}

<div className="sidebar-group">

  <button
    type="button"
   className={`sidebar-group-toggle ${
  socialGroupActive ? "group-active" : ""
}`}
    onClick={() => handleGroupClick("social")}
  >
    <span className="nav-icon group-social-icon">
      <HeartHandshake
        size={18}
        strokeWidth={1.8}
      />
    </span>

    <span className="nav-text sidebar-group-title">
      Social Records
    </span>

    {!collapsed && (
      <span className="sidebar-group-chevron">
        {socialOpen ? (
          <ChevronDown
            size={16}
            strokeWidth={1.8}
          />
        ) : (
          <ChevronRight
            size={16}
            strokeWidth={1.8}
          />
        )}
      </span>
    )}
  </button>

  {!collapsed && socialOpen && (
    <div className="sidebar-submenu">

      {/* VOTERS */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "voters" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("voters")
        }
      >
        <span className="nav-icon sidebar-icon-voters">
          <Vote
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          Voters
        </span>
      </button>


      {/* 4PS */}

      <button
        type="button"
        className={`nav-item sidebar-subitem ${
          page === "fourPs" ? "active" : ""
        }`}
        onClick={() =>
          handleNavigate("fourPs")
        }
      >
        <span className="nav-icon sidebar-icon-fourps">
          <HeartHandshake
            size={17}
            strokeWidth={1.8}
          />
        </span>

        <span className="nav-text">
          4Ps Members
        </span>
      </button>

    </div>
  )}

</div>  

        <button
  type="button"
  className={`nav-item ${
    page === "settings" ? "active" : ""
  }`}
  onClick={() => handleNavigate("settings")}
>
  <span className="nav-icon sidebar-icon-settings">
    <Settings
      size={18}
      strokeWidth={1.8}
    />
  </span>

  <span className="nav-text">
    Settings
  </span>
</button>

      </nav>

      {/* BOTTOM */}

      <div className="sidebar-bottom">

        <button
          type="button"
          className="new-census-sidebar"
          onClick={onNewCensus}
        >
          <span className="nav-icon">
  <Plus size={18} strokeWidth={2} />
</span>

<span className="nav-text">
  New Census
</span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;