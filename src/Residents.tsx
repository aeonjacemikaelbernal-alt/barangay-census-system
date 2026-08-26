import { useState } from "react";
import "./dashboard.css";
import { UserRound, Cake, Vote, Search, X } from "lucide-react";
import type {
  CensusData,
  Family,
  Resident,
} from "./types/census";


type ResidentRow = {
  resident_id: string;
  household_id: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  sex: string | null;
  birth_date: string | null;
  civil_status: string | null;
  relationship: string | null;
  resident_type: string | null;
  has_own_family: boolean | null;
};

 type ResidentsProps = {
  censusRecords: CensusData[];
};

function Residents({
  censusRecords,
}: ResidentsProps) {

 

  // =========================
  // SEARCH & FILTER STATES
  // =========================

  const [searchTerm, setSearchTerm] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [civilStatusFilter, setCivilStatusFilter] = useState("");
  const [residentTypeFilter, setResidentTypeFilter] = useState("");

 const residents: ResidentRow[] = (
  Array.isArray(censusRecords)
    ? censusRecords
    : []
).flatMap((record: CensusData, recordIndex: number) => {
  const families = Array.isArray(record?.families)
    ? record.families
    : [];

  return families.flatMap(
   (family: Family, familyIndex: number) => {
      const members = Array.isArray(family?.members)
        ? family.members
        : [];

      return members.map(
       (member: Resident, memberIndex: number) => ({
          resident_id:
            `${recordIndex}-${familyIndex}-${memberIndex}`,

         household_id:
  record.householdNumber || null,

          first_name: member?.firstName || null,
          middle_name: member?.middleName || null,
          last_name: member?.lastName || null,
          suffix: member?.suffix || null,

          sex: member?.sex || null,
          birth_date: member?.birthDate || null,
          civil_status: member?.civilStatus || null,

          relationship:
            member?.familyRelationship || null,

          resident_type:
            member?.familyRelationship === "Family Head"
              ? "Family Head"
              : "Family Member",

          has_own_family:
            member?.hasOwnFamily === "Yes"
              ? true
              : member?.hasOwnFamily === "No"
              ? false
              : null,
        })
      );
    }
  );
});

  // =========================
  // FILTER RESIDENTS
  // =========================

  const filteredResidents = residents.filter((resident) => {
    const fullName = [
      resident.first_name,
      resident.middle_name,
      resident.last_name,
      resident.suffix,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      search === "" ||
      fullName.includes(search);

    const matchesSex =
      sexFilter === "" ||
      resident.sex === sexFilter;

    const matchesCivilStatus =
      civilStatusFilter === "" ||
      resident.civil_status === civilStatusFilter;

    const matchesResidentType =
      residentTypeFilter === "" ||
      resident.resident_type === residentTypeFilter;

    return (
      matchesSearch &&
      matchesSex &&
      matchesCivilStatus &&
      matchesResidentType
    );
  });

  // =========================
  // CLEAR FILTERS
  // =========================

  function clearFilters() {
    setSearchTerm("");
    setSexFilter("");
    setCivilStatusFilter("");
    setResidentTypeFilter("");
  }

  const hasActiveFilters =
    searchTerm !== "" ||
    sexFilter !== "" ||
    civilStatusFilter !== "" ||
    residentTypeFilter !== "";

  return (
    <main className="dashboard-main">

      <header className="dashboard-header">

        <div>
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1>
            Residents
          </h1>

          <p className="dashboard-description">
            View all registered residents from census records.
          </p>
        </div>

      </header>

      <section className="dashboard-section">

        {/* =========================
            SECTION HEADING
        ========================= */}

        <div className="section-heading">
          <div>
            <span>
              RESIDENT RECORDS
            </span>

            <h2>
              All Residents
            </h2>
          </div>

          <p>
           {`${filteredResidents.length} of ${
  residents.length
} resident${
  residents.length !== 1 ? "s" : ""
}`}
          </p>
        </div>

        {/* =========================
            SEARCH & FILTERS
        ========================= */}

        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "20px",
            marginBottom: "20px",
          }}
        >

          {/* SEARCH */}

          <div
            style={{
              position: "relative",
              marginBottom: "16px",
            }}
          >

            <Search
              size={18}
              strokeWidth={1.8}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8993a5",
              }}
            />

            <input
              type="text"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search resident by name..."
              style={{
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid #dfe4eb",
                borderRadius: "10px",
                padding: "12px 14px 12px 42px",
                fontSize: "14px",
                outline: "none",
              }}
            />

          </div>

          {/* FILTERS */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(3, minmax(0, 1fr))",
              gap: "12px",
            }}
          >

            {/* SEX */}

            <select
              value={sexFilter}
              onChange={(event) =>
                setSexFilter(event.target.value)
              }
              style={{
                border: "1px solid #dfe4eb",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="">
                All Sex
              </option>

              <option value="Male">
                Male
              </option>

              <option value="Female">
                Female
              </option>
            </select>

            {/* CIVIL STATUS */}

            <select
              value={civilStatusFilter}
              onChange={(event) =>
                setCivilStatusFilter(event.target.value)
              }
              style={{
                border: "1px solid #dfe4eb",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="">
                All Civil Status
              </option>

              {Array.from(
                new Set(
                  residents
                    .map(
                      (resident) =>
                        resident.civil_status
                    )
                    .filter(Boolean)
                )
              ).map((status) => (
                <option
                  key={status}
                  value={status || ""}
                >
                  {status}
                </option>
              ))}
            </select>

            {/* RESIDENT TYPE */}

            <select
              value={residentTypeFilter}
              onChange={(event) =>
                setResidentTypeFilter(
                  event.target.value
                )
              }
              style={{
                border: "1px solid #dfe4eb",
                borderRadius: "10px",
                padding: "12px 14px",
                fontSize: "14px",
                background: "white",
              }}
            >
              <option value="">
                All Resident Types
              </option>

              {Array.from(
                new Set(
                  residents
                    .map(
                      (resident) =>
                        resident.resident_type
                    )
                    .filter(Boolean)
                )
              ).map((type) => (
                <option
                  key={type}
                  value={type || ""}
                >
                  {type}
                </option>
              ))}
            </select>

          </div>

          {/* CLEAR */}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={{
                marginTop: "14px",
                border: "1px solid #dfe4eb",
                background: "white",
                borderRadius: "9px",
                padding: "9px 14px",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <X
                size={15}
                strokeWidth={1.8}
              />

              Clear Filters
            </button>
          )}

        </div>

        {/* =========================
            RECORDS
        ========================= */}

       <div className="recent-records">

  {filteredResidents.length === 0 ? (

            <div className="recent-record-card">
              <div className="recent-record-main">

                <strong>
                  No residents found.
                </strong>

                <p>
                  {hasActiveFilters
                    ? "No residents match the current search or filters."
                    : "There are currently no residents in the resident overview."}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    style={{
                      marginTop: "10px",
                      border: "1px solid #dfe4eb",
                      background: "white",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Clear Filters
                  </button>
                )}

              </div>
            </div>

          ) : (

            filteredResidents.map((resident) => (

              <div
                className="recent-record-card"
                key={resident.resident_id}
              >

                <div className="recent-record-icon">

                  <UserRound
                    size={22}
                    strokeWidth={1.8}
                  />

                </div>

                <div className="recent-record-main">

                  <div className="recent-record-title">

                    <strong>

                      {resident.first_name || ""}
                      {" "}
                      {resident.middle_name || ""}
                      {" "}
                      {resident.last_name || ""}

                      {resident.suffix
                        ? ` ${resident.suffix}`
                        : ""}

                    </strong>

                    <span>
                      {resident.sex || "—"}
                    </span>

                  </div>

                  <div className="recent-record-location">

                    <span>
                      Relationship:{" "}
                      {resident.relationship || "—"}
                    </span>

                    <span>
                      Resident Type:{" "}
                      {resident.resident_type || "—"}
                    </span>

                    <span>
                      Civil Status:{" "}
                      {resident.civil_status || "—"}
                    </span>

                  </div>

                  <div className="recent-record-stats">

                    <span>

                      <Cake
                        size={16}
                        strokeWidth={1.8}
                      />

                      {resident.birth_date || "—"}

                    </span>

                    <span>

                      <Vote
                        size={16}
                        strokeWidth={1.8}
                      />

                      {resident.has_own_family === true
                        ? "Has Own Family"
                        : resident.has_own_family === false
                        ? "No Own Family"
                        : "—"}

                    </span>

                  </div>

                </div>

              </div>

            ))

          )}

        </div>

      </section>

    </main>
  );
}

export default Residents;