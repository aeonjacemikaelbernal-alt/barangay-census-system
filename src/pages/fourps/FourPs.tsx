import { useMemo, useState } from "react";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";
import {
  formatResidentRecordName,
  compareResidentNames,
} from "../../utils/nameFormatter";

import {
  HeartHandshake,
  ArrowLeft,
  BarChart3,
  List,
  UserRound,
  Search,
  Eye,
  X,
  Printer,
} from "lucide-react";
import ResidentCategoryDemographics from "../../components/ResidentCategoryDemographics";

type FourPsProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type FourPsResident = Resident & {
  householdNumber: string;
  familyName: string;
  purok: string;
};

type FourPsRecord = {
  resident: FourPsResident;
  status: "4Ps Member" | "Not a 4Ps Member";
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

function formatResidentName(resident: FourPsResident): string {
  return formatResidentRecordName(resident);
}

function isFourPsMember(member: FourPsResident): boolean {
  const value = String(member.fourPsMember || "")
    .trim()
    .toLowerCase();

  return (
    value === "yes" ||
    value === "member" ||
    value === "4ps member" ||
    value === "4ps"
  );
}

function FourPs({
  censusRecords,
  onBackToDashboard,
}: FourPsProps) {
  const [activeView, setActiveView] = useState<"records" | "demographics">("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("all");
  const [sexFilter, setSexFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"AZ" | "ZA">("AZ");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResident, setSelectedResident] =
    useState<FourPsResident | null>(null);

  const recordsPerPage = 8;

  const safeRecords: CensusData[] = Array.isArray(censusRecords)
    ? censusRecords.filter(
        (record): record is CensusData => Boolean(record)
      )
    : [];

  const allResidents: FourPsResident[] = safeRecords.flatMap(
    (record: CensusData) => {
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
    }
  );

  const fourPsRecords: FourPsRecord[] = allResidents.map(
    (resident: FourPsResident) => ({
      resident,
      status: isFourPsMember(resident)
        ? "4Ps Member"
        : "Not a 4Ps Member",
    })
  );

  const filteredRecords = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    const result = fourPsRecords.filter((record: FourPsRecord) => {
      const resident = record.resident;

      const searchable = [
        formatResidentName(resident),
        resident.familyName,
        resident.householdNumber,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        search === "" || searchable.includes(search);

      const matchesMembership =
        membershipFilter === "all" ||
        (membershipFilter === "member" &&
          record.status === "4Ps Member") ||
        (membershipFilter === "not_member" &&
          record.status === "Not a 4Ps Member");

      const sex = String(resident.sex || "")
        .trim()
        .toLowerCase();

      const matchesSex =
        sexFilter === "all" || sex === sexFilter;

      return matchesSearch && matchesMembership && matchesSex;
    });

    return [...result].sort((a, b) =>
      sortOrder === "AZ"
        ? compareResidentNames(a.resident, b.resident)
        : compareResidentNames(b.resident, a.resident)
    );
  }, [
    fourPsRecords,
    searchTerm,
    membershipFilter,
    sexFilter,
    sortOrder,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / recordsPerPage)
  );

  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedRecords = filteredRecords.slice(
    (effectivePage - 1) * recordsPerPage,
    effectivePage * recordsPerPage
  );

  const applyFilters = () => {
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setMembershipFilter("all");
    setSexFilter("all");
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

  function printFourPsList() {
    if (filteredRecords.length === 0) {
      window.alert("There are no 4Ps records to print for the current filters.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      window.alert("The print preview could not be opened. Please allow pop-ups for this site.");
      return;
    }

    const rows = filteredRecords.map((record, index) => {
      const resident = record.resident;
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapePrintHtml(formatResidentName(resident) || "Unnamed Resident")}</td>
        <td>${escapePrintHtml(resident.familyName)}</td>
        <td>${escapePrintHtml(resident.householdNumber)}</td>
        <td>${escapePrintHtml(toProperCase(resident.sex) || "—")}</td>
        <td>${escapePrintHtml(record.status)}</td>
      </tr>`;
    }).join("");

    const filterSummary = [
      membershipFilter === "all" ? "All 4Ps statuses" : membershipFilter === "member" ? "4Ps members" : "Not 4Ps members",
      sexFilter === "all" ? "All sex" : `Sex: ${toProperCase(sexFilter)}`,
      searchTerm.trim() ? `Search: ${searchTerm.trim()}` : "",
      `Name: ${sortOrder}`,
    ].filter(Boolean).join(" · ");

    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8" /><title>4Ps Membership Masterlist</title>
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
      </style></head><body>
        <header><div class="eyebrow">BARANGAY MANAGEMENT SYSTEM</div><h1>4Ps Membership Masterlist</h1><p>Barangay Pambuhan, Mercedes, Camarines Norte</p></header>
        <div class="summary">${filteredRecords.length} residents · ${escapePrintHtml(filterSummary)} · Printed ${new Date().toLocaleDateString()}</div>
        <table><thead><tr><th>No.</th><th>Resident Name</th><th>Family</th><th>Household No.</th><th>Sex</th><th>4Ps Status</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <main
      className="records-page-shell records-page-fourps"
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
            4Ps
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View residents registered under the Pantawid Pamilyang Pilipino
            Program.
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
          <List size={15} /> 4Ps Records
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
        <ResidentCategoryDemographics category="fourps" residents={allResidents} />
      ) : (
      <section>
        <div className="records-directory-head"
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
              4PS RECORDS
            </span>

            <h2 style={{ margin: 0, color: "#172033" }}>
              4Ps Membership Information
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ color: "#758094", fontSize: "13px" }}>
              {`${filteredRecords.length} of ${fourPsRecords.length} residents`}
            </span>
            <button
              type="button"
              onClick={printFourPsList}
              disabled={filteredRecords.length === 0}
              style={{ border: "1px solid #b9cfe7", background: "#f7fbff", color: "#245b96", borderRadius: "8px", padding: "7px 10px", display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 800, cursor: filteredRecords.length === 0 ? "not-allowed" : "pointer", opacity: filteredRecords.length === 0 ? 0.5 : 1 }}
            >
              <Printer size={15} />
              Print List
            </button>
          </div>
        </div>

        {fourPsRecords.length > 0 && (
          <div className="records-filter-panel"
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "16px",
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(155px, 1fr))",
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
                type="text"
                placeholder="Search resident, family, or household..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }}
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
              value={membershipFilter}
              onChange={(event) => {
                setMembershipFilter(event.target.value);
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
              <option value="all">All 4Ps Status</option>
              <option value="member">4Ps Member</option>
              <option value="not_member">Not a 4Ps Member</option>
            </select>

            <select
              value={sexFilter}
              onChange={(event) => {
                setSexFilter(event.target.value);
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
              <option value="all">All Sex</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
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

        {fourPsRecords.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "14px",
              padding: "50px",
              textAlign: "center",
            }}
          >
            <HeartHandshake size={34} strokeWidth={1.5} />
            <h3>No 4Ps records yet</h3>
            <p>
              4Ps information will appear here after a census is submitted.
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
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
            No residents match the selected 4Ps filters.
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
              {paginatedRecords.map(
                (record: FourPsRecord, index: number) => {
                  const resident = record.resident;
                  const fullName = formatResidentName(resident);
                  const member = record.status === "4Ps Member";

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
                          {member ? (
                            <HeartHandshake
                              size={18}
                              strokeWidth={1.8}
                            />
                          ) : (
                            <UserRound size={18} strokeWidth={1.8} />
                          )}
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
                          display: "grid",
                          gap: "6px",
                          fontSize: "12px",
                          color: "#475569",
                        }}
                      >
                        <div>
                          <strong>4Ps Status:</strong>{" "}
                          <span
                            style={{
                              fontWeight: 600,
                              color: member ? "#168aad" : "#64748b",
                            }}
                          >
                            {record.status}
                          </span>
                        </div>

                        <div>
                          <strong>Sex:</strong>{" "}
                          {toProperCase(resident.sex) || "Not Specified"}
                        </div>
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
                  {filteredRecords.length} 4Ps record
                  {filteredRecords.length !== 1 ? "s" : ""}
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
                  4PS DETAILS
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
                aria-label="Close 4Ps details"
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

            <div
              style={{
                padding: "20px 22px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              {[
                [
                  "4Ps Status",
                  isFourPsMember(selectedResident)
                    ? "4Ps Member"
                    : "Not a 4Ps Member",
                ],
                [
                  "Sex",
                  toProperCase(selectedResident.sex) || "Not Specified",
                ],
                [
                  "Civil Status",
                  toProperCase(selectedResident.civilStatus) ||
                    "Not Specified",
                ],
                [
                  "Birth Date",
                  selectedResident.birthDate || "Not Specified",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    border: "1px solid #eef0f4",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    minHeight: "58px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: "10px",
                      color: "#8993a5",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      marginBottom: "5px",
                    }}
                  >
                    {label}
                  </span>

                  <strong
                    style={{
                      fontSize: "13px",
                      color: "#172033",
                      fontWeight: 600,
                    }}
                  >
                    {value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default FourPs;
