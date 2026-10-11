import {
  useEffect,
  useState,
} from "react";
import "./dashboard.css";
import Sidebar from "../../components/sidebar/Sidebar";
import barangayLogo from "../../assets/barangay-pambuhan-logo.png";

import type { Page } from "../../components/sidebar/Sidebar";
import {
  Users,
  House,
  UsersRound,
  GraduationCap,
  BriefcaseBusiness,
  Wrench,
  WalletCards,
  Vote,
  UserRound,
  ClipboardList,
  Search,
  SearchX,
  FilePenLine,
} from "lucide-react";

import {
  searchResidents,
  type ResidentSearchResult,
} from "../../services/residentSearchService";
import {
  getCensusActivityForDate,
  type RecentActivityItem,
} from "../../services/dashboardService";
import {
  getLocalDateInputValue,
  millisecondsUntilNextLocalDay,
} from "../../utils/localDate";

import { formatResidentRecordName, compareResidentNames } from "../../utils/nameFormatter";

import type {
  CensusData,
  Resident,
} from "../../types/census";
type MainDashboardProps = {
  censusRecords: CensusData[];

  dashboardSummary: {
    totalHouseholds: number;
    totalResidents: number;
    totalFamilies: number;
    largestHouseholdCount: number;
    totalFamilyHeads: number;
    totalRegisteredVoters: number;

    householdTrend: {
      label: string;
      value: number;
    }[];

    recentActivity: {
      id: number;
      createdAt: string;
      householdNumber: string;
      houseNumber: string;
      street: string;
      purok: string;
      familyCount: number;
      residentCount: number;
    }[];

    totalChildren: number;

    maleCount: number;
    femaleCount: number;

    childrenAgeCount: number;
    adolescentCount: number;
    adultCount: number;
    seniorCount: number;

    educationData: {
      label: string;
      count: number;
    }[];

    occupationData: {
      label: string;
      count: number;
    }[];

    skillsData: {
      label: string;
      count: number;
    }[];
  };

  onNewCensus: () => void;
  onNavigate: (page: Page) => void;

  sidebarCollapsed: boolean;
onSidebarCollapsedChange: (
  collapsed: boolean
) => void;

role: string;
};

type ResidentWithIdentity = Resident & {
  residentId?: string;
};

const getResidentIdentity = (
  record: CensusData,
  member: Resident
): string => {
  const residentId = String(
    (member as ResidentWithIdentity).residentId || ""
  ).trim();

  if (residentId) {
    return residentId;
  }

  const fallbackName = [
    member.firstName,
    member.middleName,
    member.lastName,
    member.suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();

  return [
    record.householdNumber || "NO-HOUSEHOLD-ID",
    fallbackName,
    member.birthDate || "",
    member.sex || "",
  ].join("|");
};

const getUniqueResidentsForRecord = (record: CensusData): Resident[] => {
  const unique = new Map<string, Resident>();
  const families = Array.isArray(record.families)
    ? record.families
    : [];

  families.forEach((family) => {
    const members = Array.isArray(family.members)
      ? family.members
      : [];

    members.forEach((member) => {
      const identity = getResidentIdentity(record, member);

      if (!unique.has(identity)) {
        unique.set(identity, member);
      }
    });
  });

  return Array.from(unique.values());
};

function MainDashboard({
  censusRecords,
  dashboardSummary,
  onNewCensus,
  onNavigate,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  role,
}: MainDashboardProps) {

  const [searchQuery, setSearchQuery] = useState("");

  const [
  searchResults,
  setSearchResults,
] = useState<ResidentSearchResult[]>([]);

const [
  searchLoading,
  setSearchLoading,
] = useState(false);

  const [showAllActivity, setShowAllActivity] =
  useState(false);
  const [activityDate, setActivityDate] = useState(
    getLocalDateInputValue()
  );
  const [recentActivityRecords, setRecentActivityRecords] = useState<
    RecentActivityItem[]
  >([]);
  const [activityLoading, setActivityLoading] = useState(role === "secretary");
  const [activityError, setActivityError] = useState("");

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setActivityDate(getLocalDateInputValue());
      setShowAllActivity(false);
    }, millisecondsUntilNextLocalDay());

    return () => window.clearTimeout(timeoutId);
  }, [activityDate]);

  useEffect(() => {
  const query = searchQuery.trim();

  if (!query) return;

  const timeoutId = window.setTimeout(async () => {
    try {
      setSearchLoading(true);

      const results = await searchResidents(query);

      setSearchResults(results);
    } catch (error) {
      console.error("QUICK SEARCH FAILED:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, 350);

  return () => {
    window.clearTimeout(timeoutId);
  };
}, [searchQuery]);

  useEffect(() => {
    if (role !== "secretary") return;

    let cancelled = false;

    void getCensusActivityForDate(activityDate)
      .then((records) => {
        if (!cancelled) setRecentActivityRecords(records);
      })
      .catch((error) => {
        console.error("RECENT ACTIVITY LOAD FAILED:", error);
        if (!cancelled) {
          setRecentActivityRecords([]);
          setActivityError("Could not load activity for this date.");
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activityDate, role]);

const safeRecords: CensusData[] =
  Array.isArray(censusRecords)
    ? censusRecords.filter(
        (record): record is CensusData =>
          Boolean(record)
      )
    : [];

const totalHouseholds =
  dashboardSummary.totalHouseholds;

const uniqueMemberMap = new Map<string, Resident>();

safeRecords.forEach((record: CensusData) => {
  const uniqueResidents = getUniqueResidentsForRecord(record);

  uniqueResidents.forEach((member) => {
    const identity = getResidentIdentity(record, member);

    if (!uniqueMemberMap.has(identity)) {
      uniqueMemberMap.set(identity, member);
    }
  });
});

const totalFamilies =
  dashboardSummary.totalFamilies;

const totalResidents =
  dashboardSummary.totalResidents;

const totalPopulation =
  dashboardSummary.totalResidents;

const totalFamilyHeads =
  dashboardSummary.totalFamilyHeads;

const totalRegisteredVoters =
  dashboardSummary.totalRegisteredVoters;

const totalChildren =
  dashboardSummary.totalChildren;

const educationChartData =
  dashboardSummary.educationData;

const occupationChartData =
  dashboardSummary.occupationData;

const skillsChartData =
  dashboardSummary.skillsData;
// =====================================================
// VOTER STATUS CHART DATA
// =====================================================

const registeredVoters =
  dashboardSummary.totalRegisteredVoters;

const nonRegisteredVoters =
  Math.max(
    dashboardSummary.totalResidents -
      dashboardSummary.totalRegisteredVoters,
    0
  );

// =====================================================
// SEX CHART DATA
// =====================================================

const maleCount =
  dashboardSummary.maleCount;

const femaleCount =
  dashboardSummary.femaleCount;



/* =====================================================
   DASHBOARD CHART DATA
===================================================== */

/* =========================
   AGE DISTRIBUTION
========================= */

const childrenCount =
  dashboardSummary.childrenAgeCount;

const adolescentCount =
  dashboardSummary.adolescentCount;

const adultCount =
  dashboardSummary.adultCount;

const seniorCount =
  dashboardSummary.seniorCount;

/* =========================
   HOUSEHOLD OVERVIEW
========================= */

const averageResidentsPerHousehold =
  totalHouseholds > 0
    ? (
        totalResidents /
        totalHouseholds
      ).toFixed(1)
    : "0.0";


const largestHouseholdCount =
  dashboardSummary.largestHouseholdCount;
const filteredMembers = [...searchResults].sort((a, b) =>
  compareResidentNames(a, b)
);

 return (
  <div
    className="dashboard-page dashboard-page-fullscreen"
    style={{
      "--barangay-logo": `url(${barangayLogo})`,
    } as React.CSSProperties}
  >
    <Sidebar
      page="dashboard"
      onNavigate={onNavigate}
      onNewCensus={onNewCensus}
      collapsed={sidebarCollapsed}
      onCollapsedChange={onSidebarCollapsedChange}
      role={role}
    />

    <main className="dashboard-main dashboard-main-compact">
      <header className="dashboard-header dashboard-header-compact">
        <div className="dashboard-header-copy">
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1>Main Dashboard</h1>

          <p className="dashboard-description">
            Overview of residents, households, families and barangay census data.
          </p>
        </div>

        <div className="dashboard-header-actions">
          <div className="dashboard-date-card">
            <span>TODAY</span>

            <strong>
              {new Date().toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </strong>

            <small>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
              })}
            </small>
          </div>

          <button
            className="new-census-button"
            onClick={onNewCensus}
          >
            <span>＋</span>
            New Census
          </button>
        </div>
      </header>

      {/* =================================================
          COMPACT SUMMARY
          Same dashboard values; presentation only changed.
      ================================================= */}
      <section className="stats-grid compact-stats-grid dashboard-animated-section dashboard-stats-seven">
        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon residents-icon">
            <Users size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>TOTAL RESIDENTS</span>
            <strong>{totalResidents}</strong>
            <small>Population: {totalPopulation}</small>
          </div>
        </div>

        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon households-icon">
            <House size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>TOTAL HOUSEHOLDS</span>
            <strong>{totalHouseholds}</strong>
            <small>Average: {averageResidentsPerHousehold} residents</small>
          </div>
        </div>

        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon families-icon">
            <UsersRound size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>TOTAL FAMILIES</span>
            <strong>{totalFamilies}</strong>
            <small>{totalFamilyHeads} registered family heads</small>
          </div>
        </div>

        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon voters-icon">
            <Vote size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>REGISTERED VOTERS</span>
            <strong>{totalRegisteredVoters}</strong>
            <small>{nonRegisteredVoters} not registered</small>
          </div>
        </div>

        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon children-icon">
            <UserRound size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>CHILDREN (0–12)</span>
            <strong>{totalChildren}</strong>
            <small>
              {totalResidents > 0
                ? `${((totalChildren / totalResidents) * 100).toFixed(1)}% of residents`
                : "0.0% of residents"}
            </small>
          </div>
        </div>

        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon family-heads-icon">
            <UserRound size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>SENIOR CITIZENS (60+)</span>
            <strong>{seniorCount}</strong>
            <small>
              {totalResidents > 0
                ? `${((seniorCount / totalResidents) * 100).toFixed(1)}% of residents`
                : "0.0% of residents"}
            </small>
          </div>
        </div>

        <div className="stat-card compact-stat-card dashboard-animate-card">
          <div className="stat-icon family-heads-icon">
            <UserRound size={25} strokeWidth={1.8} />
          </div>
          <div className="stat-content">
            <span>FAMILY HEADS</span>
            <strong>{totalFamilyHeads}</strong>
            <small>
              {totalResidents > 0
                ? `${((totalFamilyHeads / totalResidents) * 100).toFixed(1)}% of residents`
                : "0.0% of residents"}
            </small>
          </div>
        </div>
      </section>

      {/* =================================================
          MAIN DASHBOARD BODY
      ================================================= */}
      <section className="dashboard-primary-grid dashboard-primary-grid-v4">
        <div className="dashboard-left-column-v4">
          <div className="dashboard-overview-panel dashboard-overview-panel-v4">
            <div className="demographic-grid-v4">
              {/* SEX DISTRIBUTION */}
              <div className="demographic-card-v4">
                <div className="v4-card-title">
                  <div className="v4-title-icon residents-icon">
                    <Users size={18} strokeWidth={1.8} />
                  </div>
                  <h3>Sex Distribution</h3>
                </div>

                <div className="v4-donut-row">
                  <div
                    className="donut-chart v4-donut"
                    style={{
                      background:
                        totalResidents > 0
                          ? `conic-gradient(
                              #ef476f 0deg ${(femaleCount / totalResidents) * 360}deg,
                              #4361ee ${(femaleCount / totalResidents) * 360}deg 360deg
                            )`
                          : undefined,
                    }}
                  >
                    <div className="donut-chart-center">
                      <strong>{totalResidents}</strong>
                      <span>Total</span>
                    </div>
                  </div>

                  <div className="v4-stat-list">
                    <div>
                      <span className="legend-dot female-dot" />
                      <span>Female</span>
                      <strong>
                        {femaleCount}
                        {totalResidents > 0
                          ? ` (${((femaleCount / totalResidents) * 100).toFixed(1)}%)`
                          : ""}
                      </strong>
                    </div>

                    <div>
                      <span className="legend-dot male-dot" />
                      <span>Male</span>
                      <strong>
                        {maleCount}
                        {totalResidents > 0
                          ? ` (${((maleCount / totalResidents) * 100).toFixed(1)}%)`
                          : ""}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* AGE GROUPS */}
              <div className="demographic-card-v4">
                <div className="v4-card-title">
                  <div className="v4-title-icon age-icon-v4">
                    <UserRound size={18} strokeWidth={1.8} />
                  </div>
                  <h3>Resident Age Groups</h3>
                </div>

                <div className="v4-bar-list">
                  {[
                    { label: "Children", range: "0–12", value: childrenCount, className: "children-bar" },
                    { label: "Adolescents", range: "13–17", value: adolescentCount, className: "adolescent-bar" },
                    { label: "Adults", range: "18–59", value: adultCount, className: "adult-bar" },
                    { label: "Seniors", range: "60+", value: seniorCount, className: "senior-bar" },
                  ].map((item) => {
                    const percentage =
                      totalResidents > 0 ? (item.value / totalResidents) * 100 : 0;

                    return (
                      <div className="v4-bar-item" key={item.label}>
                        <div className="v4-bar-head">
                          <div>
                            <strong>{item.label}</strong>
                            <span>({item.range})</span>
                          </div>

                          <strong>
                            {item.value} of {totalResidents} ({percentage.toFixed(1)}%)
                          </strong>
                        </div>

                        <div className="age-bar-track">
                          <div
                            className={`age-bar ${item.className}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* VOTERS */}
              <div className="demographic-card-v4">
                <div className="v4-card-title">
                  <div className="v4-title-icon voters-icon">
                    <Vote size={18} strokeWidth={1.8} />
                  </div>
                  <h3>Voter Registration</h3>
                </div>

                <div className="v4-donut-row">
                  <div
                    className="donut-chart v4-donut"
                    style={{
                      background:
                        totalResidents > 0
                          ? `conic-gradient(
                              #168aad 0deg ${(registeredVoters / totalResidents) * 360}deg,
                              #e9ecef ${(registeredVoters / totalResidents) * 360}deg 360deg
                            )`
                          : undefined,
                    }}
                  >
                    <div className="donut-chart-center">
                      <strong>{registeredVoters}</strong>
                      <span>Registered</span>
                    </div>
                  </div>

                  <div className="v4-stat-list">
                    <div>
                      <span className="legend-dot registered-dot" />
                      <span>Registered</span>
                      <strong>
                        {registeredVoters}
                        {totalResidents > 0
                          ? ` (${((registeredVoters / totalResidents) * 100).toFixed(1)}%)`
                          : ""}
                      </strong>
                    </div>

                    <div>
                      <span className="legend-dot not-registered-dot" />
                      <span>Not Registered</span>
                      <strong>
                        {nonRegisteredVoters}
                        {totalResidents > 0
                          ? ` (${((nonRegisteredVoters / totalResidents) * 100).toFixed(1)}%)`
                          : ""}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* EDUCATION */}
              <div className="demographic-card-v4">
                <div className="v4-card-title">
                  <div className="v4-title-icon education-icon-v4">
                    <GraduationCap size={18} strokeWidth={1.8} />
                  </div>
                  <h3>Education Attainment</h3>
                </div>

                <div className="v4-category-list">
                  {(educationChartData ?? []).slice(0, 4).map((item) => {
                    const percentage =
                      totalResidents > 0 ? (item.count / totalResidents) * 100 : 0;

                    return (
                      <div className="v4-category-item" key={item.label}>
                        <div className="v4-category-head">
                          <span>{item.label}</span>
                          <strong>
                            {item.count} ({percentage.toFixed(1)}%)
                          </strong>
                        </div>
                        <div className="v4-track">
                          <div
                            className="v4-fill v4-fill-education"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {(educationChartData ?? []).length === 0 && (
                    <div className="v4-empty-data">
                      No education data available.
                    </div>
                  )}
                </div>
              </div>

              {/* OCCUPATION */}
              <div className="demographic-card-v4">
                <div className="v4-card-title">
                  <div className="v4-title-icon occupation-icon-v4">
                    <BriefcaseBusiness size={18} strokeWidth={1.8} />
                  </div>
                  <h3>Occupation</h3>
                </div>

                <div className="v4-category-list">
                  {(occupationChartData ?? []).slice(0, 4).map((item) => {
                    const percentage =
                      totalResidents > 0 ? (item.count / totalResidents) * 100 : 0;

                    return (
                      <div className="v4-category-item" key={item.label}>
                        <div className="v4-category-head">
                          <span>{item.label}</span>
                          <strong>
                            {item.count} ({percentage.toFixed(1)}%)
                          </strong>
                        </div>
                        <div className="v4-track">
                          <div
                            className="v4-fill v4-fill-occupation"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {(occupationChartData ?? []).length === 0 && (
                    <div className="v4-empty-data">
                      No occupation data available.
                    </div>
                  )}
                </div>
              </div>

              {/* SKILLS */}
              <div className="demographic-card-v4">
                <div className="v4-card-title">
                  <div className="v4-title-icon skills-icon-v4">
                    <Wrench size={18} strokeWidth={1.8} />
                  </div>
                  <h3>Skills / Livelihood</h3>
                </div>

                <div className="v4-category-list">
                  {(skillsChartData ?? []).slice(0, 4).map((item) => {
                    const percentage =
                      totalResidents > 0 ? (item.count / totalResidents) * 100 : 0;

                    return (
                      <div className="v4-category-item" key={item.label}>
                        <div className="v4-category-head">
                          <span>{item.label}</span>
                          <strong>
                            {item.count} ({percentage.toFixed(1)}%)
                          </strong>
                        </div>
                        <div className="v4-track">
                          <div
                            className="v4-fill v4-fill-skills"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {(skillsChartData ?? []).length === 0 && (
                    <div className="v4-empty-data">
                      No skills data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-overview-strip-v4">
            <div className="overview-strip-item-v4">
              <span>Avg. Residents / Household</span>
              <strong>{averageResidentsPerHousehold}</strong>
            </div>

            <div className="overview-strip-item-v4">
              <span>Family Heads</span>
              <strong>{totalFamilyHeads}</strong>
            </div>

            <div className="overview-strip-item-v4">
              <span>Children</span>
              <strong>{totalChildren}</strong>
            </div>

            <div className="overview-strip-item-v4">
              <span>Seniors</span>
              <strong>{seniorCount}</strong>
            </div>

            <div className="overview-strip-item-v4">
              <span>Registered Voters</span>
              <strong>
                {totalResidents > 0
                  ? `${((registeredVoters / totalResidents) * 100).toFixed(1)}%`
                  : "0.0%"}
              </strong>
            </div>

            <div className="overview-strip-item-v4">
              <span>Largest Household</span>
              <strong>{largestHouseholdCount}</strong>
            </div>
          </div>
        </div>

        <div className="dashboard-right-column-v4">
          {role === "secretary" && (
            <div className="dashboard-search-panel-compact dashboard-search-panel-v4 dashboard-search-top-v4">
              <div className="compact-panel-heading compact-panel-heading-inline">
                <div>
                  <span>QUICK SEARCH</span>
                  <h2>Find a Resident</h2>
                </div>
              </div>

              <div className="dashboard-search compact-dashboard-search">
                <span>
                  <Search size={17} strokeWidth={1.8} />
                </span>

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    if (!value.trim()) { setSearchResults([]); setSearchLoading(false); }
                  }}
                  placeholder="Search resident, occupation, skill..."
                />

                {searchQuery.trim() && (
                  <button
                    type="button"
                    className="search-clear-button"
                    onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchLoading(false); }}
                    aria-label="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>

              {searchQuery.trim() && (
                <div className="compact-search-results">
                  {searchLoading ? (
                    <div className="compact-search-message">
                      Searching...
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="compact-search-message">
                      <SearchX size={17} strokeWidth={1.8} />
                      No matching residents found.
                    </div>
                  ) : (
                    filteredMembers.slice(0, 4).map((member, index) => {
                      const fullName =
                        formatResidentRecordName(member) || "Unnamed Resident";

                      return (
                        <div
                          className="compact-search-result"
                          key={`${fullName}-${index}`}
                        >
                          <UserRound size={16} strokeWidth={1.8} />

                          <div>
                            <strong>{fullName}</strong>

                            {member?.primaryOccupation && (
                              <span>{member.primaryOccupation}</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}
          {role === "secretary" ? (
            <aside className="dashboard-recent-panel dashboard-recent-panel-v4">
              <div className="compact-panel-heading recent-panel-heading">
                <div>
                  <span>RECORDS</span>
                  <h2>Recent Activity</h2>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <input
                    type="date"
                    aria-label="Choose Recent Activity date"
                    title="Choose a date to view its census activity"
                    value={activityDate}
                    max={getLocalDateInputValue()}
                    onChange={(event) => {
                      if (!event.target.value) return;
                      setActivityLoading(true);
                      setActivityError("");
                      setActivityDate(event.target.value);
                      setShowAllActivity(false);
                    }}
                    style={{
                      width: 132,
                      minWidth: 0,
                      border: "1px solid #dfe4eb",
                      borderRadius: 8,
                      padding: "6px 7px",
                      background: "white",
                      color: "#334155",
                      fontSize: 11,
                    }}
                  />
                  {(recentActivityRecords ?? []).length > 5 && (
                    <button
                      type="button"
                      className="compact-text-button"
                      onClick={() =>
                        setShowAllActivity((current) => !current)
                      }
                    >
                      {showAllActivity ? "Show less" : "View all"}
                    </button>
                  )}
                </div>
              </div>

              {activityLoading ? (
                <div className="compact-empty-state compact-empty-state-v4">
                  <ClipboardList size={24} strokeWidth={1.8} />
                  <strong>Loading activity...</strong>
                  <span>Retrieving census records for the selected date.</span>
                </div>
              ) : activityError ? (
                <div className="compact-empty-state compact-empty-state-v4">
                  <ClipboardList size={24} strokeWidth={1.8} />
                  <strong>Activity unavailable</strong>
                  <span>{activityError}</span>
                </div>
              ) : (recentActivityRecords ?? []).length === 0 ? (
                <div className="compact-empty-state compact-empty-state-v4">
                  <ClipboardList size={24} strokeWidth={1.8} />
                  <strong>No census records on this date</strong>
                  <span>Choose another date to view its saved activity.</span>
                </div>
              ) : (
                <div
                  className={`compact-activity-list compact-activity-list-v4 ${
                    showAllActivity ? "show-all" : ""
                  }`}
                >
                  {(
                    showAllActivity
                      ? recentActivityRecords
                      : recentActivityRecords.slice(0, 5)
                  ).map((record, index) => (
                    <div
                      className="compact-activity-item compact-activity-item-v4"
                      key={`${record.householdNumber}-${index}`}
                    >
                      <div className="compact-activity-icon">
                        <House size={17} strokeWidth={1.8} />
                      </div>

                      <div className="compact-activity-copy">
                        <strong>
                          {record.householdNumber || "HOUSEHOLD"}
                        </strong>

                        <span>
                          {[record.street, record.purok]
                            .filter(Boolean)
                            .join(" • ") || "Household Record"}
                        </span>

                        <small>
                          {record.familyCount} family
                          {record.familyCount !== 1 ? "ies" : ""} •{" "}
                          {record.residentCount} resident
                          {record.residentCount !== 1 ? "s" : ""}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          ) : (
            <aside className="dashboard-recent-panel dashboard-recent-panel-v4 dashboard-encoder-panel">
              <div className="compact-panel-heading">
                <div>
                  <span>CENSUS</span>
                  <h2>Encoder Workspace</h2>
                </div>
              </div>

              <div className="compact-empty-state compact-empty-state-v4">
                <ClipboardList size={28} strokeWidth={1.8} />
                <strong>Ready for census encoding</strong>
                <span>
                  Use New Census to register household and resident information.
                </span>

                <button
                  type="button"
                  className="empty-action"
                  onClick={onNewCensus}
                >
                  ＋ New Census
                </button>
                <button
                  type="button"
                  className="empty-action encoder-update-action"
                  onClick={() => onNavigate("encoderUpdates")}
                >
                  <FilePenLine size={15} /> Update Existing Resident
                </button>
              </div>
            </aside>
          )}


        </div>
      </section>

      {role === "secretary" && (
        <section className="dashboard-bottom-grid dashboard-bottom-grid-v4">
          <div className="dashboard-quick-panel dashboard-quick-panel-v4">
            <div className="compact-panel-heading compact-panel-heading-inline">
              <div>
                <span>QUICK ACCESS</span>
                <h2>Census Data</h2>
              </div>
            </div>

            <div className="compact-category-grid compact-category-grid-v4">
              <button
                type="button"
                className="compact-category-card quick-residents"
                onClick={() => onNavigate("residents")}
              >
                <Users size={19} strokeWidth={1.8} />
                <span>Residents</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-households"
                onClick={() => onNavigate("households")}
              >
                <House size={19} strokeWidth={1.8} />
                <span>Households</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-families"
                onClick={() => onNavigate("families")}
              >
                <UsersRound size={19} strokeWidth={1.8} />
                <span>Families</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-education"
                onClick={() => onNavigate("education")}
              >
                <GraduationCap size={19} strokeWidth={1.8} />
                <span>Education</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-occupation"
                onClick={() => onNavigate("occupation")}
              >
                <BriefcaseBusiness size={19} strokeWidth={1.8} />
                <span>Occupation</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-skills"
                onClick={() => onNavigate("skills")}
              >
                <Wrench size={19} strokeWidth={1.8} />
                <span>Skills</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-income"
                onClick={() => onNavigate("income")}
              >
                <WalletCards size={19} strokeWidth={1.8} />
                <span>Income</span>
              </button>

              <button
                type="button"
                className="compact-category-card quick-voters"
                onClick={() => onNavigate("voters")}
              >
                <Vote size={19} strokeWidth={1.8} />
                <span>Voters</span>
              </button>
            </div>
          </div>


        </section>
      )}

      <footer className="dashboard-footer compact-dashboard-footer">
        <span>Barangay Digital Census System</span>
        <span>Official Barangay Census Management</span>
      </footer>
    </main>
  </div>
);
}

export default MainDashboard;



