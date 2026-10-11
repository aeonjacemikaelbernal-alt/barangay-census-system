import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  BriefcaseBusiness,
  Eye,
  List,
  Printer,
  Search,
  X,
} from "lucide-react";

import type { CensusData, Family, Resident } from "../../types/census";
import { compareResidentNames } from "../../utils/nameFormatter";
import OccupationDemographics from "./OccupationDemographics";
import { formatResidentName, getResidentOccupations, toProperCase, type OccupationResident } from "./occupationUtils";
import barangayLogo from "../../assets/barangay-pambuhan-logo.png";
import "./occupation.css";
import "./occupationPrint.css";

function formatIncome(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount) ? `₱${amount.toLocaleString()}` : "—";
}

type OccupationProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

function Occupation({ censusRecords, onBackToDashboard }: OccupationProps) {
  const [activeView, setActiveView] = useState<"records" | "demographics">("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [occupationFilter, setOccupationFilter] = useState("ALL");
  const [employmentStatusFilter, setEmploymentStatusFilter] = useState("ALL");
  const [purokFilter, setPurokFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"AZ" | "ZA">("AZ");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResident, setSelectedResident] = useState<OccupationResident | null>(null);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const recordsPerPage = 8;

  const allResidents = useMemo<OccupationResident[]>(() => {
    const safeRecords = Array.isArray(censusRecords) ? censusRecords.filter(Boolean) : [];

    return safeRecords
      .flatMap((record: CensusData) => {
        const families = Array.isArray(record?.families) ? record.families : [];
        return families.flatMap((family: Family) => {
          const members = Array.isArray(family?.members) ? family.members : [];
          return members.map((member: Resident) => ({
            ...member,
            householdNumber: record?.householdNumber || "—",
            familyName: family?.familyName || "Unnamed Family",
            purok: record?.household?.purok || "Not Specified",
          }));
        });
      })
      .sort(compareResidentNames);
  }, [censusRecords]);

  const occupationOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allResidents.flatMap((resident) =>
            getResidentOccupations(resident).map(toProperCase)
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allResidents]
  );

  const employmentStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allResidents.map(
            (resident) => toProperCase(resident.employmentStatus) || "Not Specified"
          )
        )
      ).sort((a, b) => a.localeCompare(b)),
    [allResidents]
  );

  const purokOptions = useMemo(
    () =>
      Array.from(new Set(allResidents.map((resident) => resident.purok).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    [allResidents]
  );

  const filteredResidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = allResidents.filter((resident) => {
      const occupations = getResidentOccupations(resident).map(toProperCase);
      const employmentStatus =
        toProperCase(resident.employmentStatus) || "Not Specified";

      const searchable = [
        formatResidentName(resident),
        resident.familyName,
        resident.householdNumber,
        resident.purok,
        occupations.join(", "),
        employmentStatus,
        resident.employer,
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!query || searchable.includes(query)) &&
        (occupationFilter === "ALL" || occupations.includes(occupationFilter)) &&
        (employmentStatusFilter === "ALL" ||
          employmentStatus === employmentStatusFilter) &&
        (purokFilter === "ALL" || resident.purok === purokFilter)
      );
    });

    return [...result].sort((a, b) =>
      sortOrder === "AZ" ? compareResidentNames(a, b) : compareResidentNames(b, a)
    );
  }, [
    allResidents,
    searchTerm,
    occupationFilter,
    employmentStatusFilter,
    purokFilter,
    sortOrder,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / recordsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedResidents = filteredResidents.slice(
    (effectivePage - 1) * recordsPerPage,
    effectivePage * recordsPerPage
  );

  const resetFilters = () => {
    setSearchTerm("");
    setOccupationFilter("ALL");
    setEmploymentStatusFilter("ALL");
    setPurokFilter("ALL");
    setSortOrder("AZ");
    setCurrentPage(1);
  };

  const printScope = [
    occupationFilter !== "ALL" ? `Occupation: ${occupationFilter}` : "",
    employmentStatusFilter !== "ALL"
      ? `Employment: ${employmentStatusFilter}`
      : "",
    purokFilter !== "ALL" ? `Purok: ${purokFilter}` : "",
    searchTerm.trim() ? `Search: ${searchTerm.trim()}` : "",
  ]
    .filter(Boolean)
    .join(" • ") || "All registered residents";

  return (
    <main className="occupation-page records-page-shell records-page-occupation">
      <header className="occupation-header records-page-header">
        <div>
          <span className="occupation-eyebrow">BARANGAY MANAGEMENT SYSTEM</span>
          <h1>Occupation</h1>
          <p>View, filter, analyze, and print occupation and employment information.</p>
        </div>

        <button className="occupation-back" type="button" onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </header>

      <div className="occupation-view-tabs records-page-tabs">
        <button
          type="button"
          className={activeView === "records" ? "active" : ""}
          onClick={() => setActiveView("records")}
        >
          <List size={15} /> Occupation Records
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
        <OccupationDemographics residents={allResidents} />
      ) : (
        <>
          <section className="occupation-directory-head records-directory-head">
            <div>
              <span>OCCUPATION DIRECTORY</span>
              <h2>Resident Occupation Records</h2>
              <p>{filteredResidents.length} of {allResidents.length} registered residents</p>
            </div>

            <div className="occupation-directory-actions">
              <span>{printScope}</span>
              <button type="button" onClick={() => setShowPrintDialog(true)}>
                <Printer size={15} /> Print List
              </button>
            </div>
          </section>

          {allResidents.length > 0 && (
            <section className="occupation-filters records-filter-panel">
              <div className="occupation-search">
                <Search size={15} />
                <input
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search resident, occupation, employer, family..."
                />
              </div>

              <select
                value={occupationFilter}
                onChange={(event) => {
                  setOccupationFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">ALL OCCUPATIONS</option>
                {occupationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                value={employmentStatusFilter}
                onChange={(event) => {
                  setEmploymentStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">ALL EMPLOYMENT STATUS</option>
                {employmentStatusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                value={purokFilter}
                onChange={(event) => {
                  setPurokFilter(event.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">ALL PUROKS</option>
                {purokOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                value={sortOrder}
                onChange={(event) => {
                  setSortOrder(event.target.value as "AZ" | "ZA");
                  setCurrentPage(1);
                }}
              >
                <option value="AZ">NAME: A–Z</option>
                <option value="ZA">NAME: Z–A</option>
              </select>

              <button className="occupation-clear" type="button" onClick={resetFilters}>
                Clear Filters
              </button>
            </section>
          )}

          {allResidents.length === 0 ? (
            <div className="occupation-empty">
              <BriefcaseBusiness size={34} />
              <h3>No occupation records yet</h3>
              <p>Occupation information will appear after a census is submitted.</p>
            </div>
          ) : filteredResidents.length === 0 ? (
            <div className="occupation-empty">
              <h3>No matching records</h3>
              <p>No residents match the selected occupation filters.</p>
            </div>
          ) : (
            <>
              <div className="occupation-card-grid records-card-grid">
                {paginatedResidents.map((resident, index) => {
                  const fullName = formatResidentName(resident);
                  const occupations =
                    getResidentOccupations(resident).map(toProperCase).join(", ") ||
                    "Not Specified";
                  const employmentStatus =
                    toProperCase(resident.employmentStatus) || "Not Specified";

                  return (
                    <article
                      className="occupation-record-card records-record-card"
                      key={`${resident.householdNumber}-${resident.residentId}-${index}`}
                    >
                      <div className="occupation-record-title">
                        <div className="occupation-icon">
                          <BriefcaseBusiness size={18} />
                        </div>
                        <div>
                          <h3 title={fullName}>{fullName || "Unnamed Resident"}</h3>
                          <span>
                            {toProperCase(resident.familyName)} · {resident.householdNumber}
                          </span>
                        </div>
                      </div>

                      <div className="occupation-record-data">
                        <div>
                          <span>Occupation</span>
                          <strong>{occupations}</strong>
                        </div>
                        <div>
                          <span>Employment Status</span>
                          <strong>{employmentStatus}</strong>
                        </div>
                        <div>
                          <span>Employer</span>
                          <strong>{toProperCase(resident.employer) || "—"}</strong>
                        </div>
                        <div>
                          <span>Purok</span>
                          <strong>{resident.purok || "—"}</strong>
                        </div>
                      </div>

                      <button
                        className="occupation-details-button"
                        type="button"
                        onClick={() => setSelectedResident(resident)}
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </article>
                  );
                })}
              </div>

              <div className="occupation-pagination records-pagination">
                <span>
                  Page {effectivePage} of {totalPages} · {filteredResidents.length} records
                </span>
                <div>
                  <button
                    type="button"
                    disabled={effectivePage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    ← Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={page === effectivePage ? "active" : ""}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={effectivePage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {selectedResident && (
        <div
          className="occupation-modal-backdrop"
          onClick={() => setSelectedResident(null)}
        >
          <div
            className="occupation-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="occupation-modal-head">
              <div>
                <span>OCCUPATION DETAILS</span>
                <h2>{formatResidentName(selectedResident)}</h2>
                <p>
                  Family: {toProperCase(selectedResident.familyName)} · Household:{" "}
                  {selectedResident.householdNumber}
                </p>
              </div>
              <button type="button" onClick={() => setSelectedResident(null)}>
                <X size={17} />
              </button>
            </div>

            <div className="occupation-detail-grid">
              <div>
                <span>Primary Occupation</span>
                <strong>{toProperCase(selectedResident.primaryOccupation) || "—"}</strong>
              </div>
              <div>
                <span>Secondary Occupation(s)</span>
                <strong>
                  {Array.isArray(selectedResident.secondaryOccupations) &&
                  selectedResident.secondaryOccupations.length
                    ? selectedResident.secondaryOccupations.map(toProperCase).join(", ")
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Employment Status</span>
                <strong>{toProperCase(selectedResident.employmentStatus) || "Not Specified"}</strong>
              </div>
              <div>
                <span>Employer</span>
                <strong>{toProperCase(selectedResident.employer) || "—"}</strong>
              </div>
              <div>
                <span>Monthly Income</span>
                <strong>{formatIncome(selectedResident.monthlyIncome)}</strong>
              </div>
              <div>
                <span>Purok</span>
                <strong>{selectedResident.purok || "—"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintDialog && (
        <div
          className="occupation-modal-backdrop"
          onClick={() => setShowPrintDialog(false)}
        >
          <div
            className="occupation-print-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <span>PRINT OCCUPATION RECORDS</span>
            <h2>Occupation Records Masterlist</h2>
            <p>
              The report will include all {filteredResidents.length} records matching
              the current filters, not only the current page.
            </p>
            <div className="occupation-print-scope">
              <strong>Current scope</strong>
              <span>{printScope}</span>
            </div>
            <div className="occupation-dialog-actions">
              <button type="button" onClick={() => setShowPrintDialog(false)}>
                Cancel
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => window.print()}
              >
                <Printer size={15} /> Print Masterlist
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="occupation-print-sheet" aria-hidden="true">
        <div className="occupation-print-header">
          <img src={barangayLogo} alt="" />
          <div>
            <span>Republic of the Philippines</span>
            <span>Province of Camarines Norte</span>
            <span>Municipality of Mercedes</span>
            <strong>BARANGAY PAMBUHAN</strong>
            <h1>OCCUPATION RECORDS MASTERLIST</h1>
          </div>
        </div>
        <div className="occupation-print-filter">{printScope}</div>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Resident Name</th>
              <th>Occupation(s)</th>
              <th>Employment Status</th>
              <th>Employer</th>
              <th>Purok</th>
            </tr>
          </thead>
          <tbody>
            {filteredResidents.map((resident, index) => (
              <tr key={`print-${resident.residentId}-${index}`}>
                <td>{index + 1}</td>
                <td>{formatResidentName(resident)}</td>
                <td>
                  {getResidentOccupations(resident).map(toProperCase).join(", ") ||
                    "Not Specified"}
                </td>
                <td>{toProperCase(resident.employmentStatus) || "Not Specified"}</td>
                <td>{toProperCase(resident.employer) || "—"}</td>
                <td>{resident.purok || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="occupation-print-signature">
          <span>Prepared by:</span>
          <strong>BARANGAY SECRETARY</strong>
        </div>
      </section>
    </main>
  );
}

export default Occupation;



