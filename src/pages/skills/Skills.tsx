import { useMemo, useState } from "react";
import {
  Wrench,
  ArrowLeft,
  BarChart3,
  Eye,
  List,
  Printer,
  Search,
  X,
} from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";
import {
  formatResidentRecordName,
  compareResidentNames,
} from "../../utils/nameFormatter";
import ResidentCategoryDemographics from "../../components/ResidentCategoryDemographics";

type SkillsProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type SkillsResident = Resident & {
  householdNumber: string;
  familyName: string;
  purok: string;
};

function toProperCase(value?: string | null): string {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/(^|[\s.'’-])([a-zà-ÿ])/g, (_, separator, letter) =>
      `${separator}${letter.toUpperCase()}`
    );
}

function formatResidentName(resident: SkillsResident): string {
  return formatResidentRecordName(resident);
}

function getSkillLabels(resident: SkillsResident): string[] {
  return resident.skills
    ? resident.skills
        .split(",")
        .map((skill) => toProperCase(skill))
        .filter(Boolean)
    : [];
}

function Skills({
  censusRecords,
  onBackToDashboard,
}: SkillsProps) {
  const [activeView, setActiveView] = useState<"records" | "demographics">("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [skillFilter, setSkillFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"AZ" | "ZA">("AZ");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResident, setSelectedResident] =
    useState<SkillsResident | null>(null);

  const recordsPerPage = 8;

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allResidents: SkillsResident[] = safeRecords
    .flatMap((record: CensusData) => {
      const families = Array.isArray(record.families)
        ? record.families
        : [];

      return families.flatMap((family: Family) => {
        const members = Array.isArray(family.members)
          ? family.members
          : [];

        return members.map((member: Resident) => ({
          ...member,
          householdNumber: record.householdNumber || "—",
          familyName: family.familyName || "Unnamed Family",
          purok: record.household?.purok || "Not Specified",
        }));
      });
    })
    .sort(compareResidentNames);

  const skillOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allResidents.flatMap((resident: SkillsResident) =>
            getSkillLabels(resident)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allResidents]
  );

  const filteredResidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = allResidents.filter(
      (resident: SkillsResident) => {
        const skills = getSkillLabels(resident);

        const searchable = [
          formatResidentName(resident),
          resident.familyName,
          resident.householdNumber,
          ...skills,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !query || searchable.includes(query);

        const matchesSkill =
          skillFilter === "ALL" || skills.includes(skillFilter);

        return matchesSearch && matchesSkill;
      }
    );

    return [...result].sort((a, b) =>
      sortOrder === "AZ"
        ? compareResidentNames(a, b)
        : compareResidentNames(b, a)
    );
  }, [allResidents, searchTerm, skillFilter, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResidents.length / recordsPerPage)
  );

  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedResidents = filteredResidents.slice(
    (effectivePage - 1) * recordsPerPage,
    effectivePage * recordsPerPage
  );

  const applyFilters = () => {
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setSkillFilter("ALL");
    setSortOrder("AZ");
    setCurrentPage(1);
  };

  function escapePrintHtml(value: unknown): string {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function printSkillsList() {
    if (filteredResidents.length === 0) {
      window.alert("There are no skills records to print for the current filters.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      window.alert("The print preview could not be opened. Please allow pop-ups for this site.");
      return;
    }

    const rows = filteredResidents
      .map((resident, index) => {
        const skills = getSkillLabels(resident).join(", ") || "Not Specified";

        return `<tr>
          <td>${index + 1}</td>
          <td>${escapePrintHtml(formatResidentName(resident) || "Unnamed Resident")}</td>
          <td>${escapePrintHtml(resident.familyName)}</td>
          <td>${escapePrintHtml(resident.householdNumber)}</td>
          <td>${escapePrintHtml(skills)}</td>
        </tr>`;
      })
      .join("");

    const filterSummary = [
      skillFilter === "ALL" ? "All skills" : `Skill: ${skillFilter}`,
      searchTerm.trim() ? `Search: ${searchTerm.trim()}` : "",
      `Name: ${sortOrder}`,
    ]
      .filter(Boolean)
      .join(" · ");

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Skills Masterlist</title>
          <style>
            @page { size: A4 landscape; margin: 16mm; }
            body { color: #172033; font: 12px Arial, sans-serif; }
            header { border-bottom: 2px solid #176b57; margin-bottom: 18px; padding-bottom: 10px; text-align: center; }
            h1 { margin: 4px 0; font-size: 20px; }
            p { margin: 4px 0; color: #526174; }
            .eyebrow { color: #176b57; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
            .summary { margin: 12px 0; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 8px; text-align: left; vertical-align: top; }
            th { background: #eaf2f8; color: #17345c; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .number { width: 34px; text-align: center; }
          </style>
        </head>
        <body>
          <header>
            <div class="eyebrow">BARANGAY MANAGEMENT SYSTEM</div>
            <h1>Resident Skills Masterlist</h1>
            <p>Barangay Pambuhan, Mercedes, Camarines Norte</p>
          </header>
          <div class="summary">${filteredResidents.length} residents · ${escapePrintHtml(filterSummary)} · Printed ${new Date().toLocaleDateString()}</div>
          <table>
            <thead><tr><th class="number">No.</th><th>Resident Name</th><th>Family</th><th>Household No.</th><th>Skills</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <main
      className="records-page-shell records-page-skills"
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      {/* HEADER */}
      <div className="records-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 7px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#7e8a9f",
            }}
          >
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              color: "#172033",
            }}
          >
            Skills
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View resident skills and specialties.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          style={{
            border: "1px solid #dfe4eb",
            background: "white",
            borderRadius: "10px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ArrowLeft size={16} strokeWidth={1.8} />
          Back to Dashboard
        </button>
      </div>

      <div className="resident-category-view-tabs records-page-tabs">
        <button
          type="button"
          className={activeView === "records" ? "active" : ""}
          onClick={() => setActiveView("records")}
        >
          <List size={15} /> Skills Records
        </button>
        <button
          type="button"
          className={activeView === "demographics" ? "active" : ""}
          onClick={() => setActiveView("demographics")}
        >
          <BarChart3 size={15} /> Demographics
        </button>
      </div>

      {activeView === "demographics" ? (
        <ResidentCategoryDemographics category="skills" residents={allResidents} />
      ) : (
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#8993a5",
                marginBottom: "4px",
              }}
            >
              SKILLS RECORDS
            </span>

            <h2 style={{ margin: 0, color: "#172033" }}>
              Resident Skills Information
            </h2>
          </div>

          <div className="records-directory-head"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "#758094", fontSize: "13px" }}>
              {`${filteredResidents.length} of ${allResidents.length} residents`}
            </span>

            <button
              type="button"
              onClick={printSkillsList}
              disabled={filteredResidents.length === 0}
              style={{
                border: "1px solid #b9cfe7",
                background: "#f7fbff",
                color: "#245b96",
                borderRadius: "8px",
                padding: "7px 10px",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                fontSize: "11px",
                fontWeight: 800,
                cursor: filteredResidents.length === 0 ? "not-allowed" : "pointer",
                opacity: filteredResidents.length === 0 ? 0.5 : 1,
              }}
            >
              <Printer size={15} />
              Print List
            </button>
          </div>
        </div>

        {allResidents.length > 0 && (
          <div className="records-filter-panel"
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(165px, 1fr))",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: "11px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#8993a5",
                }}
              />

              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search resident, family, household, or skill..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  border: "1px solid #dfe4eb",
                  borderRadius: "9px",
                  padding: "9px 10px 9px 34px",
                  outline: "none",
                  fontSize: "12px",
                }}
              />
            </div>

            <select
              value={skillFilter}
              onChange={(event) => {
                setSkillFilter(event.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: "1px solid #dfe4eb",
                borderRadius: "9px",
                padding: "9px 10px",
                background: "white",
                fontSize: "12px",
              }}
            >
              <option value="ALL">All Skills</option>
              {skillOptions.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>

            <select
              value={sortOrder}
              onChange={(event) => {
                setSortOrder(event.target.value as "AZ" | "ZA");
                setCurrentPage(1);
              }}
              style={{
                border: "1px solid #dfe4eb",
                borderRadius: "9px",
                padding: "9px 10px",
                background: "white",
                fontSize: "12px",
              }}
            >
              <option value="AZ">Name: A–Z</option>
              <option value="ZA">Name: Z–A</option>
            </select>

            <button
              type="button"
              onClick={applyFilters}
              style={{
                border: "1px solid #2563eb",
                background: "#eff6ff",
                color: "#1d4ed8",
                borderRadius: "9px",
                padding: "9px 12px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              Apply Filters
            </button>

            <button
              type="button"
              onClick={resetFilters}
              style={{
                border: "1px solid #dfe4eb",
                background: "white",
                borderRadius: "9px",
                padding: "9px 12px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Clear
            </button>
          </div>
        )}

        {allResidents.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "14px",
              padding: "50px",
              textAlign: "center",
            }}
          >
            <Wrench size={34} strokeWidth={1.5} />
            <h3>No skills records yet</h3>
            <p>
              Skills information will appear here after a census is submitted.
            </p>
          </div>
        ) : filteredResidents.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "12px",
              padding: "34px",
              textAlign: "center",
              color: "#758094",
            }}
          >
            No residents match the selected skills filters.
          </div>
        ) : (
          <>
            <div className="records-card-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(270px, 1fr))",
                gap: "14px",
              }}
            >
              {paginatedResidents.map(
                (resident: SkillsResident, index: number) => {
                  const fullName = formatResidentName(resident);
                  const skillLabels = getSkillLabels(resident);

                  return (
                    <div className="records-record-card"
                      key={`${resident.householdNumber}-${fullName}-${index}`}
                      style={{
                        background: "white",
                        border: "1px solid #e7eaf0",
                        borderRadius: "12px",
                        padding: "15px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "11px",
                        }}
                      >
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            flexShrink: 0,
                            borderRadius: "10px",
                            background: "#f0f4f9",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Wrench size={18} strokeWidth={1.8} />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <h3
                            title={fullName}
                            style={{
                              margin: "0 0 3px",
                              fontSize: "15px",
                              color: "#172033",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fullName || "Unnamed Resident"}
                          </h3>

                          <span
                            style={{
                              fontSize: "11px",
                              color: "#8993a5",
                            }}
                          >
                            {toProperCase(resident.familyName)} ·{" "}
                            {resident.householdNumber}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          borderTop: "1px solid #eef0f4",
                          paddingTop: "10px",
                          fontSize: "12px",
                          color: "#475569",
                        }}
                      >
                        <strong>Skills:</strong>{" "}
                        {skillLabels.length > 0
                          ? skillLabels.slice(0, 2).join(", ")
                          : "Not Specified"}
                        {skillLabels.length > 2
                          ? ` +${skillLabels.length - 2} more`
                          : ""}
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedResident(resident)}
                        style={{
                          marginTop: "12px",
                          width: "100%",
                          border: "1px solid #dbe3ef",
                          background: "#f8fafc",
                          color: "#334155",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Eye size={14} />
                        View Details
                      </button>
                    </div>
                  );
                }
              )}
            </div>

            {totalPages > 1 && (
              <div className="records-pagination"
                style={{
                  marginTop: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                  padding: "10px 12px",
                  background: "white",
                  border: "1px solid #e7eaf0",
                  borderRadius: "10px",
                }}
              >
                <span style={{ fontSize: "12px", color: "#758094" }}>
                  Page {effectivePage} of {totalPages} ·{" "}
                  {filteredResidents.length} skills record
                  {filteredResidents.length !== 1 ? "s" : ""}
                </span>

                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    disabled={effectivePage <= 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    style={{
                      border: "1px solid #dfe4eb",
                      background: "white",
                      borderRadius: "8px",
                      padding: "6px 9px",
                      cursor:
                        effectivePage <= 1 ? "not-allowed" : "pointer",
                      opacity: effectivePage <= 1 ? 0.5 : 1,
                    }}
                  >
                    ← Previous
                  </button>

                  {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1
                  ).map((page) => (
                    <button
                      type="button"
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      style={{
                        minWidth: "32px",
                        height: "32px",
                        border:
                          page === effectivePage
                            ? "1px solid #2563eb"
                            : "1px solid #dfe4eb",
                        background:
                          page === effectivePage ? "#eff6ff" : "white",
                        color:
                          page === effectivePage ? "#1d4ed8" : "#475569",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={effectivePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                    style={{
                      border: "1px solid #dfe4eb",
                      background: "white",
                      borderRadius: "8px",
                      padding: "6px 9px",
                      cursor:
                        effectivePage >= totalPages
                          ? "not-allowed"
                          : "pointer",
                      opacity: effectivePage >= totalPages ? 0.5 : 1,
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      )}

      {/* VIEW DETAILS */}
      {selectedResident && (
        <div
          onClick={() => setSelectedResident(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.48)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(680px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              border: "1px solid #e7eaf0",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                padding: "20px 22px",
                borderBottom: "1px solid #eef0f4",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    color: "#8993a5",
                  }}
                >
                  SKILLS DETAILS
                </span>

                <h2
                  style={{
                    margin: "5px 0 4px",
                    color: "#172033",
                    fontSize: "21px",
                  }}
                >
                  {formatResidentName(selectedResident)}
                </h2>

                <div style={{ color: "#758094", fontSize: "12px" }}>
                  Family: {toProperCase(selectedResident.familyName)} ·
                  Household: {selectedResident.householdNumber}
                </div>
              </div>

              <button
                type="button"
                aria-label="Close skills details"
                onClick={() => setSelectedResident(null)}
                style={{
                  border: "1px solid #e2e8f0",
                  background: "white",
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div style={{ padding: "20px 22px" }}>
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "#8993a5",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  marginBottom: "10px",
                }}
              >
                REGISTERED SKILLS / SPECIALTIES
              </span>

              {getSkillLabels(selectedResident).length === 0 ? (
                <div
                  style={{
                    border: "1px solid #eef0f4",
                    borderRadius: "10px",
                    padding: "14px",
                    color: "#758094",
                    fontSize: "13px",
                  }}
                >
                  No skills specified.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {getSkillLabels(selectedResident).map(
                    (skill, index) => (
                      <span
                        key={`${skill}-${index}`}
                        style={{
                          display: "inline-block",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          background: "#f0f4f9",
                          color: "#3d4a60",
                          fontSize: "12px",
                          fontWeight: 600,
                        }}
                      >
                        {skill}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Skills;
