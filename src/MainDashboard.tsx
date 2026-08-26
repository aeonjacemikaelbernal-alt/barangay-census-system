import { useState } from "react";
import "./dashboard.css";
import Sidebar from "./Sidebar";
import barangayLogo from "./assets/barangay-pambuhan-logo.png";

import type { Page } from "./Sidebar";
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
  Baby,
  Globe2,
  BarChart3,
  ClipboardList,
  Search,
  SearchX,
} from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "./types/census";

type MainDashboardProps = {
  onNewCensus: () => void;
  onNavigate: (page: Page) => void;

  sidebarCollapsed: boolean;
onSidebarCollapsedChange: (
  collapsed: boolean
) => void;

  censusRecords: CensusData[];
};

type LargestHousehold = {
  record: CensusData;
  residentCount: number;
};

type HouseholdTrendItem = {
  label: string;
  value: number;
};

function MainDashboard({
  onNewCensus,
  onNavigate,
  sidebarCollapsed,
  onSidebarCollapsedChange,
  censusRecords,
}: MainDashboardProps) {

  const [searchQuery, setSearchQuery] = useState("");

  const [showAllActivity, setShowAllActivity] =
  useState(false);

const safeRecords: CensusData[] =
  Array.isArray(censusRecords)
    ? censusRecords.filter(
        (record): record is CensusData =>
          Boolean(record)
      )
    : [];

const totalHouseholds = safeRecords.length;

const allFamilies: Family[] =
  safeRecords.flatMap(
    (record: CensusData) =>
      Array.isArray(record.families)
        ? record.families
        : []
  );

const allMembers: Resident[] =
  allFamilies.flatMap(
    (family: Family) =>
      Array.isArray(family.members)
        ? family.members
        : []
  );

const totalFamilies = allFamilies.length;

const totalResidents = allMembers.length;

const totalPopulation = totalResidents;

const totalFamilyHeads = allFamilies.reduce(
  (total: number, family: Family) => {
    const members = Array.isArray(family?.members)
      ? family.members
      : [];

    return total + (members.length > 0 ? 1 : 0);
  },
  0
);

const totalRegisteredVoters = allMembers.filter(
 (member: Resident) =>
    String(member?.voterStatus || "")
      .trim()
      .toLowerCase() === "registered voter"
).length;

const totalChildren = allFamilies.reduce(
  (total: number, family: Family) => {
    const members = Array.isArray(family?.members)
      ? family.members
      : [];

    return total + Math.max(members.length - 2, 0);
  },
  0
);

// =====================================================
// EDUCATION CHART DATA
// =====================================================

const educationCounts: Record<string, number> = {};

allMembers.forEach((member: Resident) => {
  const education = member.education;

  if (!education) return;

  const educationLabel = String(education).trim();

  if (!educationLabel) return;

  educationCounts[educationLabel] =
    (educationCounts[educationLabel] || 0) + 1;
});

const educationChartData = Object.entries(
  educationCounts
)
  .map(([label, count]) => ({
    label,
    count,
  }))
  .sort((a, b) => b.count - a.count);

const maxEducationCount = Math.max(
  ...educationChartData.map((item) => item.count),
  1
);

// =====================================================
// OCCUPATION CHART DATA
// =====================================================

const occupationCounts: Record<string, number> = {};

allMembers.forEach((member: Resident) => {
  const occupation = member?.primaryOccupation;

  if (!occupation) return;

  const label = String(occupation).trim();

  if (!label) return;

  occupationCounts[label] =
    (occupationCounts[label] || 0) + 1;
});

const occupationChartData = Object.entries(
  occupationCounts
)
  .map(([label, count]) => ({
    label,
    count,
  }))
  .sort((a, b) => b.count - a.count);


// =====================================================
// SKILLS CHART DATA
// =====================================================

const skillCounts: Record<string, number> = {};

allMembers.forEach((member: Resident) => {
  if (!member.skills) return;

  const memberSkills = member.skills
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  memberSkills.forEach((skill) => {
    skillCounts[skill] =
      (skillCounts[skill] || 0) + 1;
  });
});

const skillsChartData = Object.entries(
  skillCounts
)
  .map(([label, count]) => ({
    label,
    count,
  }))
  .sort((a, b) => b.count - a.count);


// =====================================================
// VOTER STATUS CHART DATA
// =====================================================

let registeredVoters = 0;
let nonRegisteredVoters = 0;

allMembers.forEach((member: Resident) => {
  const voterStatus = String(
    member?.voterStatus || ""
  )
    .trim()
    .toLowerCase();

  if (
    voterStatus === "registered voter" ||
    voterStatus === "registered"
  ) {
    registeredVoters++;
  } else {
    nonRegisteredVoters++;
  }
});

// =====================================================
// SEX CHART DATA
// =====================================================

let maleCount = 0;
let femaleCount = 0;

allMembers.forEach((member: Resident) => {
  const sex = String(
    member?.sex || ""
  )
    .trim()
    .toLowerCase();

  if (sex === "male" || sex === "m") {
    maleCount++;
  }

  if (sex === "female" || sex === "f") {
    femaleCount++;
  }
});



/* =====================================================
   DASHBOARD CHART DATA
===================================================== */

const getMemberAge = (
  birthDate: string
): number | null => {
  if (!birthDate) return null;

  const birth = new Date(birthDate);

  if (Number.isNaN(birth.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < birth.getDate()
    )
  ) {
    age--;
  }

  return age >= 0 ? age : null;
};

/* =========================
   AGE DISTRIBUTION
========================= */

const childrenCount = allMembers.filter(
  (member: Resident) => {
    const age = getMemberAge(member.birthDate);
    return age !== null && age <= 12;
  }
).length;

const adolescentCount = allMembers.filter(
  (member: Resident) => {
    const age = getMemberAge(member.birthDate);

    return age !== null &&
      age >= 13 &&
      age <= 17;
  }
).length;

const adultCount = allMembers.filter(
  (member: Resident) => {
    const age = getMemberAge(member.birthDate);

    return age !== null &&
      age >= 18 &&
      age <= 59;
  }
).length;

const seniorCount = allMembers.filter(
  (member: Resident) => {
    const age = getMemberAge(member.birthDate);
    return age !== null && age >= 60;
  }
).length;

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


const largestHousehold =
  safeRecords.reduce<LargestHousehold | null>(
    (
      largest,
      record: CensusData
    ) => {
      const families = Array.isArray(record.families)
        ? record.families
        : [];

      const residentCount = families.reduce(
        (
          total: number,
          family: Family
        ) => {
          const members = Array.isArray(family.members)
            ? family.members
            : [];

          return total + members.length;
        },
        0
      );

      if (
        !largest ||
        residentCount > largest.residentCount
      ) {
        return {
          record,
          residentCount,
        };
      }

      return largest;
    },
    null
  );


/* =========================
   HOUSEHOLD TREND
========================= */

const householdTrend: HouseholdTrendItem[] =
  safeRecords
    .slice()
    .reverse()
    .slice(-6)
    .map(
      (
        record: CensusData,
        index: number
      ) => {
        const families = Array.isArray(record.families)
          ? record.families
          : [];

        const residents = families.reduce(
          (
            total: number,
            family: Family
          ) => {
            const members = Array.isArray(family.members)
              ? family.members
              : [];

            return total + members.length;
          },
          0
        );

        return {
          label:
            record.householdNumber ||
            `Record ${index + 1}`,
          value: residents,
        };
      }
    );

    const recentActivityRecords =
  showAllActivity
    ? safeRecords
    : safeRecords.slice(0, 5);


const filteredMembers = allMembers.filter((member: Resident) => {
  const query = searchQuery.trim().toLowerCase();

  if (!query) return false;

 const searchableText = [
  member?.firstName,
  member?.middleName,
  member?.lastName,
  member.suffix,
  member?.primaryOccupation,
  member?.skills,
]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(query);
});

 return (
  <div
    className="dashboard-page"
    style={{
      "--barangay-logo": `url(${barangayLogo})`,
    } as React.CSSProperties}
  >
<Sidebar
  page="dashboard"
  onNavigate={onNavigate}
  onNewCensus={onNewCensus}
  collapsed={sidebarCollapsed}
  onCollapsedChange={
    onSidebarCollapsedChange
  }
/>

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

        <section className="stats-grid dashboard-animated-section">

          <div className="stat-card population-card">

  <div className="stat-icon population-icon">
    <Globe2 size={34} strokeWidth={1.8} />
  </div>

  <div className="stat-content">

    <span>
      TOTAL POPULATION
    </span>

    <strong>
      {totalPopulation}
    </strong>

    <small>
      Total registered population
    </small>

  </div>

</div>

          <div className="stat-card dashboard-animate-card">

           <div className="stat-icon residents-icon">
  <Users size={34} strokeWidth={1.8} />
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

         <div className="stat-card dashboard-animate-card">

        <div className="stat-icon households-icon">
  <House size={34} strokeWidth={1.8} />
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

         <div className="stat-card dashboard-animate-card">

           <div className="stat-icon families-icon">
  <UsersRound size={34} strokeWidth={1.8} />
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

         <div className="stat-card dashboard-animate-card">

          <div className="stat-icon family-heads-icon">
  <UserRound size={34} strokeWidth={1.8} />
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

         <div className="stat-card dashboard-animate-card">

         <div className="stat-icon voters-icon">
  <Vote size={34} strokeWidth={1.8} />
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

         <div className="stat-card dashboard-animate-card">

           <div className="stat-icon children-icon">
  <Baby size={34} strokeWidth={1.8} />
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
    DEMOGRAPHIC OVERVIEW
================================================= */}

<section className="dashboard-section">

  <div className="section-heading">

    <div>
      <span>
        DEMOGRAPHICS
      </span>

      <h2>
        Demographic Overview
      </h2>
    </div>

    <p>
      Overview of resident demographics.
    </p>

  </div>


  <div className="dashboard-chart-grid">


    {/* =========================
        SEX
    ========================= */}

    <div className="dashboard-chart-card">

      <div className="chart-card-header">

        <div>
          <span>
            RESIDENTS BY SEX
          </span>

          <h3>
            Sex Distribution
          </h3>
        </div>

      </div>


      <div className="donut-chart-layout">

        <div
          className="donut-chart sex-donut"
          style={{
            background:
              totalResidents > 0
                ? `conic-gradient(
                    #ef476f 0deg
                    ${
                      (
                        femaleCount /
                        totalResidents
                      ) * 360
                    }deg,
                    #4361ee ${
                      (
                        femaleCount /
                        totalResidents
                      ) * 360
                    }deg 360deg
                  )`
                : undefined,
          }}
        >
          <div className="donut-chart-center">

            <strong>
              {totalResidents}
            </strong>

            <span>
              Total
            </span>

          </div>
        </div>


        <div className="chart-legend">

          <div className="legend-item">

            <span className="legend-dot female-dot" />

            <span>
              Female
            </span>

            <strong>
              {femaleCount}
            </strong>

          </div>


          <div className="legend-item">

            <span className="legend-dot male-dot" />

            <span>
              Male
            </span>

            <strong>
              {maleCount}
            </strong>

          </div>

        </div>

      </div>

    </div>



    {/* =========================
        AGE
    ========================= */}

    <div className="dashboard-chart-card">

      <div className="chart-card-header">

        <div>
          <span>
            AGE DISTRIBUTION
          </span>

          <h3>
            Resident Age Groups
          </h3>
        </div>

      </div>


      <div className="age-chart">

        <div className="age-bar-row">

          <div className="age-bar-label">
            <span>
              Children
            </span>

            <strong>
              {childrenCount}
            </strong>
          </div>

          <div className="age-bar-track">
            <div
              className="age-bar children-bar"
              style={{
                width:
                  totalResidents > 0
                    ? `${(
                        childrenCount /
                        totalResidents
                      ) * 100}%`
                    : "0%",
              }}
            />
          </div>

        </div>


        <div className="age-bar-row">

          <div className="age-bar-label">
            <span>
              Adolescents
            </span>

            <strong>
              {adolescentCount}
            </strong>
          </div>

          <div className="age-bar-track">
            <div
              className="age-bar adolescent-bar"
              style={{
                width:
                  totalResidents > 0
                    ? `${(
                        adolescentCount /
                        totalResidents
                      ) * 100}%`
                    : "0%",
              }}
            />
          </div>

        </div>


        <div className="age-bar-row">

          <div className="age-bar-label">
            <span>
              Adults
            </span>

            <strong>
              {adultCount}
            </strong>
          </div>

          <div className="age-bar-track">
            <div
              className="age-bar adult-bar"
              style={{
                width:
                  totalResidents > 0
                    ? `${(
                        adultCount /
                        totalResidents
                      ) * 100}%`
                    : "0%",
              }}
            />
          </div>

        </div>


        <div className="age-bar-row">

          <div className="age-bar-label">
            <span>
              Seniors
            </span>

            <strong>
              {seniorCount}
            </strong>
          </div>

          <div className="age-bar-track">
            <div
              className="age-bar senior-bar"
              style={{
                width:
                  totalResidents > 0
                    ? `${(
                        seniorCount /
                        totalResidents
                      ) * 100}%`
                    : "0%",
              }}
            />
          </div>

        </div>

      </div>

    </div>



    {/* =========================
        VOTER STATUS
    ========================= */}

    <div className="dashboard-chart-card">

      <div className="chart-card-header">

        <div>
          <span>
            VOTER STATUS
          </span>

          <h3>
            Voter Registration
          </h3>
        </div>

      </div>


      <div className="donut-chart-layout">

        <div
          className="donut-chart voter-donut"
          style={{
            background:
              totalResidents > 0
                ? `conic-gradient(
                    #168aad 0deg
                    ${
                      (
                        registeredVoters /
                        totalResidents
                      ) * 360
                    }deg,
                    #e9ecef ${
                      (
                        registeredVoters /
                        totalResidents
                      ) * 360
                    }deg 360deg
                  )`
                : undefined,
          }}
        >

          <div className="donut-chart-center">

            <strong>
              {registeredVoters}
            </strong>

            <span>
              Registered
            </span>

          </div>

        </div>


        <div className="chart-legend">

          <div className="legend-item">

            <span className="legend-dot registered-dot" />

            <span>
              Registered
            </span>

            <strong>
              {registeredVoters}
            </strong>

          </div>


          <div className="legend-item">

            <span className="legend-dot not-registered-dot" />

            <span>
              Not Registered
            </span>

            <strong>
              {nonRegisteredVoters}
            </strong>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>



{/* =================================================
    HOUSEHOLD OVERVIEW
================================================= */}

<section className="dashboard-section">

  <div className="section-heading">

    <div>
      <span>
        HOUSEHOLDS
      </span>

      <h2>
        Household Overview
      </h2>
    </div>

    <p>
      Household and resident statistics.
    </p>

  </div>


  <div className="household-overview-grid">


    <div className="household-summary-card">

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


    <div className="household-summary-card">

      <span>
        AVERAGE RESIDENTS
      </span>

      <strong>
        {averageResidentsPerHousehold}
      </strong>

      <small>
        Residents per household
      </small>

    </div>


    <div className="household-summary-card">

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


    <div className="household-summary-card">

      <span>
        LARGEST HOUSEHOLD
      </span>

      <strong>
        {largestHousehold?.residentCount || 0}
      </strong>

      <small>
        Residents
      </small>

    </div>

  </div>


  <div className="household-trend-card">

    <div className="chart-card-header">

      <div>

        <span>
          HOUSEHOLD TREND
        </span>

        <h3>
          Resident Count by Census Record
        </h3>

      </div>

      <span className="chart-period">
        Recent Records
      </span>

    </div>


    <div className="trend-chart">

      {householdTrend.length === 0 ? (

        <div className="chart-empty-state">
          No household data available.
        </div>

      ) : (

        <div className="trend-bars">

          {householdTrend.map(
            (
              item: HouseholdTrendItem,
              index: number
            ) => {

              const maxValue =
                Math.max(
                  ...householdTrend.map(
                    (entry: HouseholdTrendItem) =>
                      entry.value
                  ),
                  1
                );

              const height =
                (
                  item.value /
                  maxValue
                ) * 100;

              return (

                <div
                  className="trend-column"
                  key={`${item.label}-${index}`}
                >

                  <span className="trend-value">
                    {item.value}
                  </span>

                  <div className="trend-bar-track">

                    <div
                      className="trend-bar"
                      style={{
                        height:
                          `${Math.max(
                            height,
                            4
                          )}%`,
                      }}
                    />

                  </div>

                  <span className="trend-label">
                    {item.label}
                  </span>

                </div>

              );
            }
          )}

        </div>

      )}

    </div>

  </div>

</section>


{/* =================================================
    DATA ANALYTICS
================================================= */}

<section className="dashboard-section">

  <div className="section-heading">

    <div>
      <span>
        DATA ANALYTICS
      </span>

      <h2>
        Resident Analytics
      </h2>
    </div>

    <p>
      Education, occupation, and skills overview.
    </p>

  </div>

  <div className="analytics-grid">

    {/* =========================
        EDUCATION
    ========================= */}

    <div className="dashboard-chart-card analytics-card">

      <div className="chart-card-header">
        <div>
          <span>
            EDUCATION
          </span>

          <h3>
            Educational Attainment
          </h3>
        </div>
      </div>

      {educationChartData.length === 0 ? (

        <div className="chart-empty-state">

          <div className="empty-icon">
            <BarChart3
              size={24}
              strokeWidth={1.8}
            />
          </div>

          <h3>
            No education data available
          </h3>

          <p>
            Education statistics will appear here
            once resident data is available.
          </p>

        </div>

      ) : (

        <div className="education-chart">

          {educationChartData
            .slice(0, 6)
            .map((item) => {

              const percentage =
                (item.count /
                  maxEducationCount) * 100;

              return (
                <div
                  className="education-chart-row"
                  key={item.label}
                >
                  <div className="education-chart-label">
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.count}
                    </strong>
                  </div>

                  <div className="education-chart-track">
                    <div
                      className="education-chart-bar"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

        </div>

      )}

    </div>


    {/* =========================
        OCCUPATION
    ========================= */}

    <div className="dashboard-chart-card analytics-card">

      <div className="chart-card-header">
        <div>
          <span>
            OCCUPATION
          </span>

          <h3>
            Occupation Distribution
          </h3>
        </div>
      </div>

      {occupationChartData.length === 0 ? (

        <div className="chart-empty-state">

          <div className="empty-icon">
            <BriefcaseBusiness
              size={24}
              strokeWidth={1.8}
            />
          </div>

          <h3>
            No occupation data available
          </h3>

          <p>
            Occupation statistics will appear here
            once resident data is available.
          </p>

        </div>

      ) : (

        <div className="education-chart">

          {occupationChartData
            .slice(0, 6)
            .map((item) => {

              const maxCount = Math.max(
                ...occupationChartData.map(
                  (entry) => entry.count
                ),
                1
              );

              const percentage =
                (item.count / maxCount) * 100;

              return (
                <div
                  className="education-chart-row"
                  key={item.label}
                >
                  <div className="education-chart-label">
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.count}
                    </strong>
                  </div>

                  <div className="education-chart-track">
                    <div
                      className="education-chart-bar"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

        </div>

      )}

    </div>


    {/* =========================
        SKILLS
    ========================= */}

    <div className="dashboard-chart-card analytics-card">

      <div className="chart-card-header">
        <div>
          <span>
            SKILLS
          </span>

          <h3>
            Resident Skills
          </h3>
        </div>
      </div>

      {skillsChartData.length === 0 ? (

        <div className="chart-empty-state">

          <div className="empty-icon">
            <Wrench
              size={24}
              strokeWidth={1.8}
            />
          </div>

          <h3>
            No skills data available
          </h3>

          <p>
            Skills statistics will appear here
            once resident data is available.
          </p>

        </div>

      ) : (

        <div className="education-chart">

          {skillsChartData
            .slice(0, 6)
            .map((item) => {

              const maxCount = Math.max(
                ...skillsChartData.map(
                  (entry) => entry.count
                ),
                1
              );

              const percentage =
                (item.count / maxCount) * 100;

              return (
                <div
                  className="education-chart-row"
                  key={item.label}
                >
                  <div className="education-chart-label">
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {item.count}
                    </strong>
                  </div>

                  <div className="education-chart-track">
                    <div
                      className="education-chart-bar"
                      style={{
                        width: `${percentage}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}

        </div>

      )}

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

         <div className="category-grid dashboard-animated-section">

           <button
  type="button"
 className="category-card dashboard-animate-card"
  onClick={() => onNavigate("residents")}
>
 <div className="category-icon">
  <Users size={28} strokeWidth={1.8} />
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

           <button
  type="button"
  className="category-card dashboard-animate-card"
  onClick={() => onNavigate("households")}
>
 <div className="category-icon">
  <House size={28} strokeWidth={1.8} />
</div>

  <div>
    <h3>
      Households
    </h3>

    <p>
      View all registered households
    </p>
  </div>

  <span className="category-arrow">
    →
  </span>
</button>

            <button 
            type="button"
  className="category-card dashboard-animate-card"
  onClick={() => onNavigate("families")}
>
             <div className="category-icon">
  <UsersRound size={28} strokeWidth={1.8} />
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

            <button
  type="button"
 className="category-card dashboard-animate-card"
  onClick={() => onNavigate("education")}
>

  <div className="category-icon">
  <GraduationCap size={28} strokeWidth={1.8} />
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

            <button 
            type="button"
  className="category-card dashboard-animate-card"
  onClick={() => onNavigate("occupation")}
>

              <div className="category-icon">
  <BriefcaseBusiness size={28} strokeWidth={1.8} />
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

            <button 
 type="button"
  className="category-card dashboard-animate-card"
  onClick={() => onNavigate("skills")}
>
             <div className="category-icon">
  <Wrench size={28} strokeWidth={1.8} />
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

            <button 
 type="button"
  className="category-card dashboard-animate-card"
  onClick={() => onNavigate("income")}
>
             <div className="category-icon">
  <WalletCards size={28} strokeWidth={1.8} />
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

            <button 
 type="button"
  className="category-card dashboard-animate-card"
  onClick={() => onNavigate("voters")}
>
             <div className="category-icon">
  <Vote size={28} strokeWidth={1.8} />
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
  <Search size={18} strokeWidth={1.8} />
</span>

  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search resident, occupation, skill..."
  />

  {searchQuery.trim() && (
    <button
      type="button"
      className="search-clear-button"
      onClick={() => setSearchQuery("")}
      aria-label="Clear search"
    >
      ×
    </button>
  )}

</div>

{searchQuery.trim() && (
  <div className="search-results">

    <div className="search-results-header">
      <strong>
        Search Results
      </strong>

      <span>
        {filteredMembers.length} found
      </span>
    </div>

    {filteredMembers.length === 0 ? (

      <div className="search-no-results">
        <span>
  <SearchX size={18} strokeWidth={1.8} />
</span>

        <div>
          <strong>
            No matching residents found
          </strong>

          <p>
            Try searching by resident name,
            occupation, or skill.
          </p>
        </div>
      </div>

    ) : (

      <div className="search-result-list">

        {filteredMembers.slice(0, 8).map(
          (member: Resident, index: number) => {

            const fullName =
            [
                member?.firstName,
                member?.middleName,
                member?.lastName,
                member?.suffix,
            ]
                .filter(Boolean)
                .join(" ") ||
              "Unnamed Resident";

            return (
              <div
                className="search-result-card"
                key={`${fullName}-${index}`}
              >

                <div className="search-result-icon">
                  <UserRound
                    size={20}
                    strokeWidth={1.8}
                  />
                </div>

                <div className="search-result-info">

                  <strong>
                    {fullName}
                  </strong>

                 {member?.primaryOccupation && (
  <span>
    {member.primaryOccupation}
  </span>
)} 

                  {member?.skills && (
                    <small>
                      Skills: {Array.isArray(member.skills)
                        ? member.skills.join(", ")
                        : member.skills}
                    </small>
                  )}

                </div>

              </div>
            );
          }
        )}

      </div>

    )}

  </div>
)}

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
  <ClipboardList size={24} strokeWidth={1.8} />
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
      {recentActivityRecords.map(
        (record: CensusData, index: number) => {

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
               family: Family
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
              key={`${record?.householdNumber || "household"}-${index}`}
            >

            <div className="recent-record-icon">
  <House size={20} strokeWidth={1.8} />
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

                  <span
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  }}
>

  <UsersRound size={15} strokeWidth={1.8} />

  {families.length} Family
  {families.length !== 1
    ? "ies"
    : ""}
</span>

                  <span
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  }}
>
  <Users size={15} strokeWidth={1.8} />

  {residents} Resident
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

   {safeRecords.length > 5 && (
    <button
      type="button"
      className="activity-view-all-button"
      onClick={() =>
        setShowAllActivity((current) => !current)
      }
    >
      {showAllActivity
        ? "Show Less"
        : "View All Records"}
    </button>
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