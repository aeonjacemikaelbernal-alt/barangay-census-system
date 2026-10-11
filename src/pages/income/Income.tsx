import { useMemo, useState } from "react";
import {
  WalletCards,
  ArrowLeft,
  BarChart3,
  Eye,
  List,
  Search,
  X,
  Printer,
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

type IncomeProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type IncomeResident = Resident & {
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

function formatResidentName(member: IncomeResident): string {
  return formatResidentRecordName(member);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getIncomeRange(value: number): string {
  if (value < 10000) return "Below ₱10,000";
  if (value < 20000) return "₱10,000 – ₱19,999";
  if (value < 30000) return "₱20,000 – ₱29,999";
  if (value < 50000) return "₱30,000 – ₱49,999";
  return "₱50,000 and above";
}

function Income({
  censusRecords,
  onBackToDashboard,
}: IncomeProps) {
  const [activeView, setActiveView] = useState<"records" | "demographics">("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [incomeFilter, setIncomeFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"AZ" | "ZA">("AZ");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResident, setSelectedResident] =
    useState<IncomeResident | null>(null);

  const recordsPerPage = 8;

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

  const allResidents: IncomeResident[] = safeRecords
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

  const membersWithIncome = allResidents.filter(
    (resident: IncomeResident) => {
      const income = Number(resident.monthlyIncome);
      return Number.isFinite(income) && income > 0;
    }
  );

  const incomeOptions = [
    "Below ₱10,000",
    "₱10,000 – ₱19,999",
    "₱20,000 – ₱29,999",
    "₱30,000 – ₱49,999",
    "₱50,000 and above",
  ];

  const filteredResidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = membersWithIncome.filter(
      (resident: IncomeResident) => {
        const income = Number(resident.monthlyIncome || 0);
        const range = getIncomeRange(income);

        const searchable = [
          formatResidentName(resident),
          resident.familyName,
          resident.householdNumber,
          resident.primaryOccupation,
          range,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (!query || searchable.includes(query)) &&
          (incomeFilter === "ALL" || range === incomeFilter)
        );
      }
    );

    return [...result].sort((a, b) =>
      sortOrder === "AZ"
        ? compareResidentNames(a, b)
        : compareResidentNames(b, a)
    );
  }, [membersWithIncome, searchTerm, incomeFilter, sortOrder]);

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
    setIncomeFilter("ALL");
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

  function printIncomeList() {
    if (filteredResidents.length === 0) {
      window.alert("There are no income records to print for the current filters.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      window.alert("The print preview could not be opened. Please allow pop-ups for this site.");
      return;
    }

    const rows = filteredResidents.map((resident, index) => {
      const income = Number(resident.monthlyIncome || 0);
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapePrintHtml(formatResidentName(resident) || "Unnamed Resident")}</td>
        <td>${escapePrintHtml(resident.familyName)}</td>
        <td>${escapePrintHtml(resident.householdNumber)}</td>
        <td>${escapePrintHtml(formatCurrency(income))}</td>
        <td>${escapePrintHtml(getIncomeRange(income))}</td>
        <td>${escapePrintHtml(resident.primaryOccupation || "—")}</td>
      </tr>`;
    }).join("");

    const filterSummary = [
      incomeFilter === "ALL" ? "All income ranges" : `Income range: ${incomeFilter}`,
      searchTerm.trim() ? `Search: ${searchTerm.trim()}` : "",
      `Name: ${sortOrder}`,
    ].filter(Boolean).join(" · ");

    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8" /><title>Income Masterlist</title>
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
        <header><div class="eyebrow">BARANGAY MANAGEMENT SYSTEM</div><h1>Resident Income Masterlist</h1><p>Barangay Pambuhan, Mercedes, Camarines Norte</p></header>
        <div class="summary">${filteredResidents.length} residents · ${escapePrintHtml(filterSummary)} · Printed ${new Date().toLocaleDateString()}</div>
        <table><thead><tr><th>No.</th><th>Resident Name</th><th>Family</th><th>Household No.</th><th>Monthly Income</th><th>Income Range</th><th>Occupation</th></tr></thead><tbody>${rows}</tbody></table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <main
      className="records-page-shell records-page-income"
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
            Income
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
            }}
          >
            View resident monthly income information.
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
          <List size={15} /> Income Records
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
        <ResidentCategoryDemographics category="income" residents={allResidents} />
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
              INCOME RECORDS
            </span>

            <h2 style={{ margin: 0, color: "#172033" }}>
              Resident Income Information
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ color: "#758094", fontSize: "13px" }}>
              {`${filteredResidents.length} of ${membersWithIncome.length} residents`}
            </span>
            <button
              type="button"
              onClick={printIncomeList}
              disabled={filteredResidents.length === 0}
              style={{ border: "1px solid #b9cfe7", background: "#f7fbff", color: "#245b96", borderRadius: "8px", padding: "7px 10px", display: "inline-flex", alignItems: "center", gap: "7px", fontSize: "11px", fontWeight: 800, cursor: filteredResidents.length === 0 ? "not-allowed" : "pointer", opacity: filteredResidents.length === 0 ? 0.5 : 1 }}
            >
              <Printer size={15} />
              Print List
            </button>
          </div>
        </div>

        {membersWithIncome.length > 0 && (
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
                placeholder="Search resident, family, household, or occupation..."
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
              value={incomeFilter}
              onChange={(event) => {
                setIncomeFilter(event.target.value);
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
              <option value="ALL">All Income Ranges</option>
              {incomeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
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

        {membersWithIncome.length === 0 ? (
          <div
            style={{
              background: "white",
              border: "1px solid #e7eaf0",
              borderRadius: "14px",
              padding: "50px",
              textAlign: "center",
            }}
          >
            <WalletCards size={34} strokeWidth={1.5} />
            <h3>No income records yet</h3>
            <p>
              Income information will appear here once resident income data is
              available.
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
            No residents match the selected income filters.
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
                (resident: IncomeResident, index: number) => {
                  const fullName = formatResidentName(resident);
                  const income = Number(resident.monthlyIncome || 0);

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
                          <WalletCards size={18} strokeWidth={1.8} />
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
                          <strong>Monthly Income:</strong>{" "}
                          {formatCurrency(income)}
                        </div>

                        <div>
                          <strong>Income Range:</strong>{" "}
                          {getIncomeRange(income)}
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
                  {filteredResidents.length} income record
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
                  INCOME DETAILS
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
                aria-label="Close income details"
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
                  "Monthly Income",
                  formatCurrency(
                    Number(selectedResident.monthlyIncome || 0)
                  ),
                ],
                [
                  "Income Range",
                  getIncomeRange(
                    Number(selectedResident.monthlyIncome || 0)
                  ),
                ],
                [
                  "Occupation",
                  toProperCase(selectedResident.primaryOccupation) ||
                    "Not Specified",
                ],
                [
                  "Employment Status",
                  toProperCase(selectedResident.employmentStatus) ||
                    "Not Specified",
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

export default Income;
