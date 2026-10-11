import { supabase } from "../../services/supabaseClient";

import {
  useEffect,
  useState,
} from "react";

import barangayLogo from "../../assets/barangay-pambuhan-logo.png";

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
  LogOut,
  FileText,
  History,
  Trash2,
  ClipboardCheck,
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
  | "documents"
  | "auditTrail"
  | "recycleBin"
  | "census"
  | "encoderUpdates";

type SidebarProps = {
  page: Page;
  onNavigate: (page: Page) => void;
  onNewCensus: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  role: string;
};

function Sidebar({
  page,
  onNavigate,
  onNewCensus,
  collapsed,
  onCollapsedChange,
  role,
}: SidebarProps) {

  const isSecretary = role === "secretary";

const [censusOpen, setCensusOpen] = useState(false);
const [dataOpen, setDataOpen] = useState(false);
const [socialOpen, setSocialOpen] = useState(false);
const [showLogoutConfirm, setShowLogoutConfirm] =
  useState(false);

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
    // Keep the active navigation group expanded when the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCensusOpen(true);
  }

  if (dataGroupActive) {
    // Keep the active navigation group expanded when the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDataOpen(true);
  }

  if (socialGroupActive) {
    // Keep the active navigation group expanded when the route changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

const handleSidebarLogout = async () => {
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

  window.location.reload();
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

        {role === "encoder" && (
          <button
            type="button"
            className={`nav-item ${
              page === "encoderUpdates" ? "active" : ""
            }`}
            onClick={() => handleNavigate("encoderUpdates")}
            title="Household Updates"
            aria-label="Household Updates"
          >
            <span className="nav-icon sidebar-icon-residents">
              <ClipboardCheck size={18} strokeWidth={1.8} />
            </span>
            <span className="nav-text">Household Updates</span>
          </button>
        )}

        {isSecretary && (
          <>
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

          </>
        )}

{isSecretary && (
  <button
    type="button"
    className={`nav-item ${
      page === "documents" ? "active" : ""
    }`}
    onClick={() =>
      handleNavigate("documents")
    }
  >
    <span className="nav-icon sidebar-icon-documents">
      <FileText
        size={18}
        strokeWidth={1.8}
      />
    </span>

    <span className="nav-text">
      Documents & Certificates
    </span>
  </button>
)}


{(isSecretary || role === "encoder") && (
  <button
    type="button"
    className={`nav-item ${
      page === "auditTrail" ? "active" : ""
    }`}
    onClick={() => handleNavigate("auditTrail")}
  >
    <span className="nav-icon sidebar-icon-audit">
      <History size={18} strokeWidth={1.8} />
    </span>
    <span className="nav-text">Audit Trail</span>
  </button>
)}

{isSecretary && (
  <button
    type="button"
    className={`nav-item ${
      page === "recycleBin" ? "active" : ""
    }`}
    onClick={() => handleNavigate("recycleBin")}
  >
    <span className="nav-icon sidebar-icon-recycle">
      <Trash2 size={18} strokeWidth={1.8} />
    </span>
    <span className="nav-text">Recycle Bin</span>
  </button>
)}

{isSecretary && (
  <button
    type="button"
    className={`nav-item ${
      page === "settings" ? "active" : ""
    }`}
    onClick={() =>
      handleNavigate("settings")
    }
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
)}

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

{role === "encoder" && (
  <button
    type="button"
    className="nav-item sidebar-logout-button"
    onClick={() =>
      setShowLogoutConfirm(true)
    }
  >
    <span className="nav-icon">
      <LogOut
        size={18}
        strokeWidth={1.8}
      />
    </span>

    <span className="nav-text">
      Logout
    </span>
  </button>
)}

</div>
{showLogoutConfirm && (
  <div className="logout-modal-overlay">
    <div className="logout-modal-card">

      <div className="logout-modal-icon">
        <LogOut size={26} strokeWidth={2} />
      </div>

      <h3>Confirm Logout</h3>

      <p>
        Are you sure you want to log out
        from your account?
      </p>

      <div className="logout-modal-actions">

        <button
          type="button"
          className="logout-cancel-button"
          onClick={() =>
            setShowLogoutConfirm(false)
          }
        >
          Cancel
        </button>

        <button
          type="button"
          className="logout-confirm-button"
          onClick={async () => {
            setShowLogoutConfirm(false);
            await handleSidebarLogout();
          }}
        >
          <LogOut size={16} strokeWidth={2} />
          Logout
        </button>

      </div>

    </div>
  </div>
)}

    </aside>
  );
}

export default Sidebar;

