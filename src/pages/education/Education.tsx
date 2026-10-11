import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Eye,
  GraduationCap,
  List,
  Printer,
  Search,
  X,
} from "lucide-react";

import type { CensusData, Family, Resident } from "../../types/census";
import {
  compareResidentNames,
  formatResidentRecordName,
} from "../../utils/nameFormatter";
import EducationDemographics from "./EducationDemographics";
import { toFormalText, type EducationResident } from "./educationUtils";
import barangayLogo from "../../assets/barangay-pambuhan-logo.png";
import "./education.css";
import "./educationPrint.css";

type EducationProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

// Shared with education demographics.

function formatResidentName(resident: Resident): string {
  return formatResidentRecordName(resident);
}

function getSchoolEntries(resident: EducationResident) {
  return [
    { level: "Elementary", school: resident.elementarySchool },
    { level: "Junior High / Old High School", school: resident.juniorHighSchool },
    { level: "Senior High School", school: resident.seniorHighSchool },
    { level: "College / University", school: resident.collegeUniversity },
    { level: "Postgraduate", school: resident.postgraduateSchool },
  ].filter(
    (item) =>
      String(item.school || "").trim() &&
      String(item.school || "").trim() !== "Not Applicable - Pre-K-12 Curriculum" &&
      String(item.school || "").trim() !== "__SHS_APPLICABLE__"
  );
}

function getCurrentSchool(resident: EducationResident): string {
  if (resident.schoolStatus !== "Currently Studying") return "";
  switch (resident.schoolLevel) {
    case "Elementary": return resident.elementarySchool || "";
    case "Junior High School": return resident.juniorHighSchool || "";
    case "Senior High School":
      return resident.seniorHighSchool === "__SHS_APPLICABLE__" ? "" : resident.seniorHighSchool || "";
    case "College": return resident.collegeUniversity || "";
    case "Vocational / Technical": return resident.collegeUniversity || "";
    case "Postgraduate": return resident.postgraduateSchool || resident.collegeUniversity || "";
    default: return "";
  }
}

function Education({ censusRecords, onBackToDashboard }: EducationProps) {
  const [activeView, setActiveView] = useState<"records" | "demographics">("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [educationFilter, setEducationFilter] = useState("ALL");
  const [schoolStatusFilter, setSchoolStatusFilter] = useState("ALL");
  const [schoolLevelFilter, setSchoolLevelFilter] = useState("ALL");
  const [schoolFilter, setSchoolFilter] = useState("ALL");
  const [purokFilter, setPurokFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"AZ" | "ZA">("AZ");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedResident, setSelectedResident] = useState<EducationResident | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const recordsPerPage = 8;

  const safeRecords = Array.isArray(censusRecords) ? censusRecords.filter(Boolean) : [];

  const allResidents = useMemo(() => safeRecords.flatMap((record: CensusData) => {
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
  }).sort(compareResidentNames), [censusRecords]);

  const uniqueOptions = (values: string[]) =>
    Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const educationOptions = useMemo(() => uniqueOptions(allResidents.map(r =>
    toFormalText(String(r.education || "Not Specified")) || "Not Specified"
  )), [allResidents]);

  const schoolStatusOptions = useMemo(() => uniqueOptions(allResidents.map(r =>
    toFormalText(r.schoolStatus) || "Not Specified"
  )), [allResidents]);

  const schoolLevelOptions = useMemo(() => uniqueOptions(allResidents.map(r =>
    toFormalText(r.schoolLevel) || "Not Specified"
  )), [allResidents]);

  const purokOptions = useMemo(() => uniqueOptions(allResidents.map(r =>
    toFormalText(r.purok) || "Not Specified"
  )), [allResidents]);

  const schoolOptions = useMemo(() => uniqueOptions(allResidents.flatMap(r =>
    getSchoolEntries(r).map(item => toFormalText(item.school))
  )), [allResidents]);

  const filteredResidents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const result = allResidents.filter((resident) => {
      const education = toFormalText(String(resident.education || "Not Specified")) || "Not Specified";
      const status = toFormalText(resident.schoolStatus) || "Not Specified";
      const level = toFormalText(resident.schoolLevel) || "Not Specified";
      const purok = toFormalText(resident.purok) || "Not Specified";
      const schools = getSchoolEntries(resident).map(item => toFormalText(item.school));
      const searchable = [
        formatResidentName(resident), resident.familyName, resident.householdNumber,
        resident.purok, resident.education, resident.schoolStatus, resident.schoolLevel,
        ...schools, resident.course, resident.shsStrand,
      ].join(" ").toLowerCase();

      return (!query || searchable.includes(query)) &&
        (educationFilter === "ALL" || education === educationFilter) &&
        (schoolStatusFilter === "ALL" || status === schoolStatusFilter) &&
        (schoolLevelFilter === "ALL" || level === schoolLevelFilter) &&
        (schoolFilter === "ALL" || schools.includes(schoolFilter)) &&
        (purokFilter === "ALL" || purok === purokFilter);
    });
    return [...result].sort((a, b) =>
      sortOrder === "AZ" ? compareResidentNames(a, b) : compareResidentNames(b, a)
    );
  }, [allResidents, searchTerm, educationFilter, schoolStatusFilter, schoolLevelFilter, schoolFilter, purokFilter, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredResidents.length / recordsPerPage));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedResidents = filteredResidents.slice(
    (effectivePage - 1) * recordsPerPage,
    effectivePage * recordsPerPage
  );

  const resetFilters = () => {
    setSearchTerm(""); setEducationFilter("ALL"); setSchoolStatusFilter("ALL");
    setSchoolLevelFilter("ALL"); setSchoolFilter("ALL"); setPurokFilter("ALL");
    setSortOrder("AZ"); setCurrentPage(1);
  };

  const filterSummary = [
    schoolStatusFilter !== "ALL" ? `Status: ${schoolStatusFilter}` : "",
    schoolLevelFilter !== "ALL" ? `Level: ${schoolLevelFilter}` : "",
    educationFilter !== "ALL" ? `Attainment: ${educationFilter}` : "",
    schoolFilter !== "ALL" ? `School: ${schoolFilter}` : "",
    purokFilter !== "ALL" ? `Purok: ${purokFilter}` : "",
  ].filter(Boolean).join(" • ") || "All registered residents";

  const printRecords = () => {
    setShowPrintModal(false);
    window.setTimeout(() => window.print(), 100);
  };

  return (
    <main className="education-page records-page-shell records-page-education">
      <header className="education-header records-page-header">
        <div>
          <p className="education-eyebrow">BARANGAY MANAGEMENT SYSTEM</p>
          <h1>Education</h1>
          <p>View, filter, analyze, and print educational information of registered residents.</p>
        </div>
        <button className="education-back" type="button" onClick={onBackToDashboard}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </header>

      <div className="education-view-tabs records-page-tabs">
        <button className={activeView === "records" ? "active" : ""} onClick={() => setActiveView("records")}>
          <List size={16}/> Education Records
        </button>
        <button className={activeView === "demographics" ? "active" : ""} onClick={() => setActiveView("demographics")}>
          <BarChart3 size={16}/> Demographics
        </button>
      </div>

      {activeView === "demographics" ? (
        <EducationDemographics residents={allResidents} />
      ) : (
        <section>
          <div className="education-directory-head records-directory-head">
            <div>
              <span>EDUCATION DIRECTORY</span>
              <h2>Resident Education Records</h2>
              <p>{filteredResidents.length} of {allResidents.length} registered residents</p>
            </div>
            <div className="education-directory-actions">
              <span>{filterSummary}</span>
              <button type="button" onClick={() => setShowPrintModal(true)} disabled={!filteredResidents.length}>
                <Printer size={15}/> Print List
              </button>
            </div>
          </div>

          {!!allResidents.length && (
            <div className="education-filters records-filter-panel">
              <div className="education-search">
                <Search size={15}/>
                <input value={searchTerm} onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                  placeholder="Search resident, school, course, family..." />
              </div>
              <select value={schoolStatusFilter} onChange={e => {setSchoolStatusFilter(e.target.value);setCurrentPage(1);}}>
                <option value="ALL">All School Status</option>
                {schoolStatusOptions.map(x => <option key={x}>{x}</option>)}
              </select>
              <select value={schoolLevelFilter} onChange={e => {setSchoolLevelFilter(e.target.value);setCurrentPage(1);}}>
                <option value="ALL">All Current School Levels</option>
                {schoolLevelOptions.map(x => <option key={x}>{x}</option>)}
              </select>
              <select value={educationFilter} onChange={e => {setEducationFilter(e.target.value);setCurrentPage(1);}}>
                <option value="ALL">All Educational Attainment</option>
                {educationOptions.map(x => <option key={x}>{x}</option>)}
              </select>
              <select value={schoolFilter} onChange={e => {setSchoolFilter(e.target.value);setCurrentPage(1);}}>
                <option value="ALL">All Schools / Institutions</option>
                {schoolOptions.map(x => <option key={x}>{x}</option>)}
              </select>
              <select value={purokFilter} onChange={e => {setPurokFilter(e.target.value);setCurrentPage(1);}}>
                <option value="ALL">All Puroks</option>
                {purokOptions.map(x => <option key={x}>{x}</option>)}
              </select>
              <select value={sortOrder} onChange={e => {setSortOrder(e.target.value as "AZ"|"ZA");setCurrentPage(1);}}>
                <option value="AZ">Name: A–Z</option><option value="ZA">Name: Z–A</option>
              </select>
              <button className="education-clear" type="button" onClick={resetFilters}>Clear Filters</button>
            </div>
          )}

          {!allResidents.length ? (
            <div className="education-empty"><GraduationCap size={36}/><h3>No education records yet</h3><p>Education information will appear here after a census is submitted.</p></div>
          ) : !filteredResidents.length ? (
            <div className="education-empty"><Search size={32}/><h3>No matching education records</h3><p>Try changing or clearing the selected filters.</p></div>
          ) : (
            <>
              <div className="education-card-grid records-card-grid">
                {paginatedResidents.map((resident, index) => {
                  const currentSchool = getCurrentSchool(resident);
                  return (
                    <article className="education-record-card records-record-card" key={`${resident.householdNumber}-${formatResidentName(resident)}-${index}`}>
                      <div className="education-record-title">
                        <div className="education-icon"><GraduationCap size={19}/></div>
                        <div>
                          <h3>{formatResidentName(resident) || "Unnamed Resident"}</h3>
                          <span>{toFormalText(resident.familyName)} · {resident.householdNumber}</span>
                        </div>
                      </div>
                      <div className="education-record-data">
                        <div><span>Educational Attainment</span><strong>{toFormalText(String(resident.education || "Not Specified")) || "Not Specified"}</strong></div>
                        <div><span>School Status</span><strong>{toFormalText(resident.schoolStatus) || "Not Specified"}</strong></div>
                        <div><span>Current Level</span><strong>{toFormalText(resident.schoolLevel) || "—"}</strong></div>
                        <div><span>{currentSchool ? "Current School" : "Purok"}</span><strong>{currentSchool ? toFormalText(currentSchool) : toFormalText(resident.purok)}</strong></div>
                      </div>
                      <button className="education-details-button" onClick={() => setSelectedResident(resident)}>
                        <Eye size={14}/> View Details
                      </button>
                    </article>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="education-pagination records-pagination">
                  <span>Page {effectivePage} of {totalPages} · {filteredResidents.length} records</span>
                  <div>
                    <button disabled={effectivePage <= 1} onClick={() => setCurrentPage(p => Math.max(1,p-1))}>← Previous</button>
                    {Array.from({length: totalPages},(_,i)=>i+1).map(page =>
                      <button className={page === effectivePage ? "active" : ""} key={page} onClick={() => setCurrentPage(page)}>{page}</button>
                    )}
                    <button disabled={effectivePage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages,p+1))}>Next →</button>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="education-print-sheet">
            <div className="education-print-header">
              <img src={barangayLogo} alt="Barangay Pambuhan logo"/>
              <div>
                <small>Republic of the Philippines</small>
                <strong>BARANGAY PAMBUHAN</strong>
                <span>Municipality of Mercedes, Camarines Norte</span>
                <h1>EDUCATION RECORDS MASTERLIST</h1>
              </div>
            </div>
            <p className="education-print-filter">{filterSummary}</p>
            <table>
              <thead><tr><th>No.</th><th>Resident Name</th><th>Purok</th><th>School Status</th><th>Current Level</th><th>Educational Attainment</th><th>School / Institution</th></tr></thead>
              <tbody>
                {filteredResidents.map((r,i) => (
                  <tr key={`${r.householdNumber}-${i}`}>
                    <td>{i+1}</td><td>{formatResidentName(r)}</td><td>{toFormalText(r.purok)}</td>
                    <td>{toFormalText(r.schoolStatus)||"—"}</td><td>{toFormalText(r.schoolLevel)||"—"}</td>
                    <td>{toFormalText(String(r.education||""))||"—"}</td>
                    <td>{toFormalText(getCurrentSchool(r)) || getSchoolEntries(r).map(x=>toFormalText(x.school)).join("; ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="education-print-signature"><span>Prepared by:</span><strong>Barangay Secretary</strong></div>
          </div>
        </section>
      )}

      {selectedResident && (
        <div className="education-modal-backdrop" onClick={() => setSelectedResident(null)}>
          <div className="education-modal" onClick={e=>e.stopPropagation()}>
            <div className="education-modal-head">
              <div><span>EDUCATION DETAILS</span><h2>{formatResidentName(selectedResident)}</h2><p>Family: {toFormalText(selectedResident.familyName)} · Household: {selectedResident.householdNumber}</p></div>
              <button onClick={()=>setSelectedResident(null)}><X size={17}/></button>
            </div>
            <div className="education-detail-grid">
              {[
                ["Educational Attainment", toFormalText(String(selectedResident.education || "Not Specified"))],
                ["School Status", toFormalText(selectedResident.schoolStatus)||"—"],
                ["Current School Level", toFormalText(selectedResident.schoolLevel)||"—"],
                ["Elementary School", toFormalText(selectedResident.elementarySchool)||"—"],
                ["Junior High / Old High School", toFormalText(selectedResident.juniorHighSchool)||"—"],
                ["Senior High School", selectedResident.seniorHighSchool === "Not Applicable - Pre-K-12 Curriculum" ? "Not Applicable — Pre-K-12 / Old Curriculum" : toFormalText(selectedResident.seniorHighSchool)||"—"],
                ["SHS Strand", toFormalText(selectedResident.shsStrand)||"—"],
                ["College / University", toFormalText(selectedResident.collegeUniversity)||"—"],
                ["Postgraduate School", toFormalText(selectedResident.postgraduateSchool)||"—"],
                ["Course", toFormalText(selectedResident.course)||"—"],
                ["Specialization", toFormalText(selectedResident.specialization)||"—"],
                ["Purok", toFormalText(selectedResident.purok)||"—"],
              ].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>
          </div>
        </div>
      )}

      {showPrintModal && (
        <div className="education-modal-backdrop" onClick={()=>setShowPrintModal(false)}>
          <div className="education-print-dialog" onClick={e=>e.stopPropagation()}>
            <div><span>PRINT EDUCATION RECORDS</span><h2>Education Records Masterlist</h2><p>The report will include all {filteredResidents.length} records matching the current filters, not only the current page.</p></div>
            <div className="education-print-scope"><strong>Current scope</strong><span>{filterSummary}</span></div>
            <div className="education-dialog-actions"><button onClick={()=>setShowPrintModal(false)}>Cancel</button><button className="primary" onClick={printRecords}><Printer size={15}/> Print Masterlist</button></div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Education;
