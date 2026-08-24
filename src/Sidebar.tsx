import { useState } from "react";

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
};

function Sidebar({
  page,
  onNavigate,
  onNewCensus,
}: SidebarProps) {

  const [collapsed, setCollapsed] = useState(false);

  const handleNavigate = (nextPage: Page) => {
    console.log("SIDEBAR CLICKED:", nextPage);
    onNavigate(nextPage);
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
          LOGO
        </div>

        <div>
          <h2>Barangay</h2>
          <span>Digital Census</span>
        </div>

      </div>

      <button
  type="button"
  className="sidebar-toggle"
  onClick={() => setCollapsed(!collapsed)}
  aria-label="Toggle sidebar"
>
  {collapsed ? (
    <Menu size={22} strokeWidth={2} />
  ) : (
    <X size={22} strokeWidth={2} />
  )}
</button>

      {/* NAVIGATION */}

      <nav className="dashboard-nav">

        <button
          type="button"
          className={`nav-item ${
            page === "dashboard" ? "active" : ""
          }`}
          onClick={() => handleNavigate("dashboard")}
        >
         <span>
  <Home size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Dashboard
  </span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            page === "residents" ? "active" : ""
          }`}
          onClick={() => handleNavigate("residents")}
        >
          <span>
  <Users size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Residents
  </span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            page === "households" ? "active" : ""
          }`}
          onClick={() => handleNavigate("households")}
        >
         <span>
  <House size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Households
  </span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            page === "families" ? "active" : ""
          }`}
          onClick={() => handleNavigate("families")}
        >
         <span>
  <UsersRound size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Families
  </span>
        </button>

        <div className="nav-label">
          DATA CATEGORIES
        </div>

        {/* EDUCATION */}

        <button
          type="button"
          className={`nav-item ${
            page === "education" ? "active" : ""
          }`}
           onClick={() => handleNavigate("education")}
        >
         <span>
  <GraduationCap size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Education
  </span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => handleNavigate("occupation")}
        >
         <span>
  <BriefcaseBusiness size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Occupation
  </span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => handleNavigate("skills")}
        >
         <span>
  <Wrench size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Skills
  </span>
        </button>

        <button
          type="button"
          className="nav-item"
          onClick={() => handleNavigate("income")}
        >
         <span>
  <WalletCards size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Income
  </span>
        </button>

        <button
          type="button"
          className="nav-item"
         onClick={() => handleNavigate("voters")}
        >
          <span>
  <Vote size={18} strokeWidth={1.8} />
</span>
<span className="nav-text">
    Voters
  </span>
        </button>

        <button
  type="button"
  className={`nav-item ${
    page === "settings" ? "active" : ""
  }`}
  onClick={() => handleNavigate("settings")}
>
  <span>
    <Settings size={18} strokeWidth={1.8} />
  </span>

  <span className="nav-text">
    Settings
  </span>
</button>

<button
  type="button"
  className={`nav-item ${
    page === "fourPs" ? "active" : ""
  }`}
  onClick={() => handleNavigate("fourPs")}
>
  <span>
    <HeartHandshake
      size={18}
      strokeWidth={1.8}
    />
  </span>

  <span className="nav-text">
    4Ps
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