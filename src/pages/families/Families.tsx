import { useState } from "react";

import {
  UsersRound,
  Pencil,
  Trash2,
  X,
  Printer,
  List,
  BarChart3,
} from "lucide-react";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";

import {
  updateFamily,
  deleteFamilyToRecycleBin,
  getExternalFamilyMembers,
} from "../../services/censusStorage";

import type {
  ExternalFamilyMember,
} from "../../services/censusStorage";
import { formatResidentRecordName, compareResidentNames, toProperNameCase } from "../../utils/nameFormatter";
import FamiliesDemographics from "./FamiliesDemographics";
import barangayLogo from "../../assets/barangay-pambuhan-logo.png";
import "./families.css";

type SelectedResident = Resident & {
  fullName: string;
  familyName: string;
  householdNumber: string;
};

type FamiliesProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
  onDataChanged?: () => Promise<void> | void;
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


function formatResidentName(resident?: Resident | null): string {
  return formatResidentRecordName(resident);
}

function Families({
  censusRecords,
  onBackToDashboard,
  onDataChanged,
}: FamiliesProps) {

 

const [selectedFamily, setSelectedFamily] =
  useState<FamilyWithHousehold | null>(null);

const [selectedResident, setSelectedResident] =
  useState<SelectedResident | null>(null);

const [editTarget, setEditTarget] =
  useState<FamilyWithHousehold | null>(null);
const [editFamilyName, setEditFamilyName] = useState("");
const [deleteTarget, setDeleteTarget] =
  useState<FamilyWithHousehold | null>(null);
const [deleteReason, setDeleteReason] = useState("");
const [saving, setSaving] = useState(false);
const [, setActionError] = useState("");
const [, setActionSuccess] = useState("");

const [externalMembers, setExternalMembers] =
  useState<ExternalFamilyMember[]>([]);
const [externalLoading, setExternalLoading] =
  useState(false);

const [selectedExternalMember, setSelectedExternalMember] =
  useState<ExternalFamilyMember | null>(null);

const [searchTerm, setSearchTerm] = useState("");
const [purokFilter, setPurokFilter] = useState("");
const [familySizeFilter, setFamilySizeFilter] = useState("");
const [filtersApplied, setFiltersApplied] = useState(false);
const [currentPage, setCurrentPage] = useState(1);
const [activeView, setActiveView] = useState<"list" | "demographics">("list");
const [showPrintOptions, setShowPrintOptions] = useState(false);
const [printType, setPrintType] = useState<"registry" | "members">("registry");
const [printPurpose, setPrintPurpose] = useState("");
const ITEMS_PER_PAGE = 5;

const purokOptions = [
  "PUROK 1",
  "PUROK 2",
  "PUROK 3",
  "PUROK 4A",
  "PUROK 4B",
  "PUROK 5",
  "PUROK 6",
];

  type FamilyWithHousehold = Family & {
  householdNumber: string;
  household: CensusData["household"];
};

  const safeRecords = Array.isArray(censusRecords)
    ? censusRecords.filter(Boolean)
    : [];

 const allFamilies: FamilyWithHousehold[] =
  safeRecords.flatMap(
    (record: CensusData) =>
      Array.isArray(record.families)
        ? record.families.map((family: Family) => ({
          
            ...family,
            householdNumber:
              record?.householdNumber || "—",
            household:
              record?.household || {},
          }))
        : []
  );

  const normalizedSearch =
    searchTerm.trim().toLowerCase();

  const filteredFamilies = allFamilies.filter((family) => {
        const members =
          Array.isArray(family.members)
            ? family.members
            : [];

        const memberNames =
          members
            .map((member) =>
              formatResidentName(member)
            )
            .join(" ")
            .toLowerCase();

        const searchable = [
          family.familyName,
          family.householdNumber,
          family.household?.purok,
          family.household?.street,
          memberNames,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          normalizedSearch === "" ||
          searchable.includes(
            normalizedSearch
          );

        const matchesPurok =
          purokFilter === "" ||
          String(
            family.household?.purok || ""
          )
            .trim()
            .toUpperCase() ===
            purokFilter.toUpperCase();

        const memberCount =
          members.length;

        const matchesFamilySize =
          familySizeFilter === "" ||
          (familySizeFilter === "1" &&
            memberCount === 1) ||
          (familySizeFilter === "2-3" &&
            memberCount >= 2 &&
            memberCount <= 3) ||
          (familySizeFilter === "4-5" &&
            memberCount >= 4 &&
            memberCount <= 5) ||
          (familySizeFilter === "6+" &&
            memberCount >= 6);

        return (
          matchesSearch &&
          matchesPurok &&
          matchesFamilySize
        );
      }).sort((a, b) =>
        toProperNameCase(a.familyName).localeCompare(
          toProperNameCase(b.familyName),
          "en",
          { sensitivity: "base" }
        )
      );

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredFamilies.length /
        ITEMS_PER_PAGE
    )
  );

  const effectivePage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedFamilies =
    filteredFamilies.slice(
      (effectivePage - 1) *
        ITEMS_PER_PAGE,
      effectivePage * ITEMS_PER_PAGE
    );

  function clearFamilyFilters() {
    setSearchTerm("");
    setPurokFilter("");
    setFamilySizeFilter("");
    setFiltersApplied(false);
    setCurrentPage(1);
  }

  async function handleSaveFamilyEdit() {
    if (!editTarget || saving) return;

    setSaving(true);
    setActionError("");
    setActionSuccess("");

    try {
      await updateFamily({
        householdNumber: editTarget.householdNumber,
        familyId: String(editTarget.id),
        familyName: editFamilyName,
      });

      setEditTarget(null);
      setActionSuccess("Family updated successfully.");

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to update the family."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteFamily() {
    if (!deleteTarget || saving) return;

    if (!deleteReason.trim()) {
      setActionError("Please enter a reason for deleting this family.");
      return;
    }

    setSaving(true);
    setActionError("");
    setActionSuccess("");

    try {
      await deleteFamilyToRecycleBin(
        deleteTarget.householdNumber,
        String(deleteTarget.id),
        deleteReason
      );

      setDeleteTarget(null);
      setDeleteReason("");
      setActionSuccess(
        "Family moved to the Recycle Bin. Its residents remain active."
      );

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to delete the family."
      );
    } finally {
      setSaving(false);
    }
  }


  async function openFamilyDetails(
    family: FamilyWithHousehold
  ) {
    setSelectedFamily(family);
    setExternalMembers([]);
    setExternalLoading(true);
    setActionError("");

    try {
      const linkedMembers =
        await getExternalFamilyMembers(
          family.householdNumber,
          String(family.id)
        );

      setExternalMembers(linkedMembers);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Unable to load linked family members."
      );
    } finally {
      setExternalLoading(false);
    }
  }

  function escapeHtml(value: unknown) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function familyDisplayName(value?: string | null) {
    return toProperCase(value) || "Unnamed Family";
  }

  function printFamilyList() {
    const rows = [...filteredFamilies].sort((a, b) =>
      familyDisplayName(a.familyName).localeCompare(familyDisplayName(b.familyName), "en", {
        sensitivity: "base",
      })
    );

    const popup = window.open("", "_blank", "width=1100,height=800");
    if (!popup) return;

    const coverage = purokFilter ? toProperCase(purokFilter) : "ALL PUROK";
    const logoUrl = barangayLogo.startsWith("http")
      ? barangayLogo
      : `${window.location.origin}${barangayLogo.startsWith("/") ? "" : "/"}${barangayLogo}`;

    const registryRows = rows
      .map((family, index) => {
        const members = Array.isArray(family.members) ? family.members : [];
        const address = [
          family.household?.street,
          family.household?.purok,
        ].filter(Boolean).map(toProperCase).join(", ") || "—";

        return `<tr>
          <td>${index + 1}</td>
          <td class="name">${escapeHtml(familyDisplayName(family.familyName))}</td>
          <td>${escapeHtml(toProperCase(family.household?.purok || "—"))}</td>
          <td>${escapeHtml(address)}</td>
          <td>${members.length}</td>
        </tr>`;
      })
      .join("");

    let memberNo = 0;
    const memberRows = rows
      .flatMap((family) => {
        const members = Array.isArray(family.members) ? [...family.members].sort(compareResidentNames) : [];
        return members.map((member) => {
          memberNo += 1;
          return `<tr>
            <td>${memberNo}</td>
            <td class="name">${escapeHtml(familyDisplayName(family.familyName))}</td>
            <td>${escapeHtml(formatResidentName(member) || "Unnamed Resident")}</td>
            <td>${escapeHtml(toProperCase(member.familyRelationship || "Family Member"))}</td>
            <td>${escapeHtml(toProperCase(family.household?.purok || "—"))}</td>
          </tr>`;
        });
      })
      .join("");

    const title =
      printType === "members"
        ? "FAMILY MEMBERS LIST"
        : "REGISTERED FAMILIES MASTERLIST";

    const table =
      printType === "members"
        ? `<table>
            <thead><tr><th>NO.</th><th>FAMILY NAME</th><th>MEMBER NAME</th><th>RELATIONSHIP</th><th>PUROK</th></tr></thead>
            <tbody>${memberRows || `<tr><td colspan="5">No records found.</td></tr>`}</tbody>
          </table>`
        : `<table>
            <thead><tr><th>NO.</th><th>FAMILY NAME</th><th>PUROK</th><th>ADDRESS</th><th>MEMBERS</th></tr></thead>
            <tbody>${registryRows || `<tr><td colspan="5">No records found.</td></tr>`}</tbody>
          </table>`;

    popup.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
@page{size:A4 portrait;margin:12mm 10mm}
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#111;margin:0;font-size:10pt}
.header{position:relative;min-height:78px;text-align:center;border-bottom:2px solid #1f2937;padding:2px 82px 10px}
.header img{position:absolute;left:8px;top:0;width:68px;height:68px;object-fit:contain}
.header .republic{font-size:10pt}.header .barangay{font-size:14pt;font-weight:700;margin-top:2px}
.header .office{font-size:10pt;font-weight:700;margin-top:2px}
h1{text-align:center;font-size:14pt;margin:14px 0 4px}
.purpose{text-align:center;min-height:16px;margin-bottom:10px;font-size:9pt}
.meta{display:flex;justify-content:space-between;margin:8px 0 10px;font-size:9pt}
table{width:100%;border-collapse:collapse;table-layout:fixed}
th,td{border:1px solid #344054;padding:6px 7px;vertical-align:middle}
th{background:#edf2f7;font-size:8.5pt}
th:first-child,td:first-child{width:9mm;text-align:center}
td.name{font-weight:700}
.footer{display:flex;justify-content:space-between;align-items:flex-start;margin-top:18px}
.total{font-weight:700}.sign{text-align:center;width:65mm;margin-left:auto;padding-top:22px}
.sign .line{border-top:1px solid #111;padding-top:5px;font-weight:700}
.small{font-size:8pt;font-weight:400}
@media print{.no-print{display:none}}
</style>
</head>
<body>
<div class="header">
  <img src="${logoUrl}" alt="Barangay Pambuhan Logo" />
  <div class="republic">Republic of the Philippines</div>
  <div>Province of Camarines Norte</div>
  <div>Municipality of Mercedes</div>
  <div class="barangay">BARANGAY PAMBUHAN</div>
  <div class="office">Office of the Barangay</div>
</div>
<h1>${title}</h1>
<div class="purpose">${escapeHtml(printPurpose.trim())}</div>
<div class="meta"><span><b>Coverage:</b> ${escapeHtml(coverage)}</span><span><b>Date:</b> ${new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</span></div>
${table}
<div class="footer">
  <div class="total">Total Listed ${printType === "members" ? "Members" : "Families"}: ${printType === "members" ? memberNo : rows.length}</div>
  <div class="sign"><div class="line">Barangay Secretary</div><div class="small">Prepared by</div></div>
</div>
</body>
</html>`);
    popup.document.close();
    popup.focus();
  }

  return (
    <main
      className="records-page-shell records-page-families"
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <div className="records-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
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
              lineHeight: 1.15,
              fontWeight: 700,
              color: "#172033",
            }}
          >
            Families
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            View and manage registered family census records.
          </p>
        </div>

        <button
          onClick={onBackToDashboard}
          style={{
            border: "1px solid #dfe4eb",
            background: "white",
            borderRadius: "10px",
            padding: "11px 18px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="families-view-tabs records-page-tabs">
        <button
          type="button"
          className={activeView === "list" ? "active" : ""}
          onClick={() => setActiveView("list")}
        >
          <List size={14} /> Family List
        </button>
        <button
          type="button"
          className={activeView === "demographics" ? "active" : ""}
          onClick={() => setActiveView("demographics")}
        >
          <BarChart3 size={14} /> Demographics
        </button>
      </div>

      {activeView === "demographics" ? (
        <FamiliesDemographics censusRecords={safeRecords} />
      ) : (
      <>
      <div className="records-filter-panel"
        style={{
          marginBottom: "14px",
          padding: "10px",
          background: "white",
          border: "1px solid #e7eaf0",
          borderRadius: "12px",
        }}
      >
        <div className="records-card-grid families-record-grid"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <select
            value={purokFilter}
            onChange={(event) => {
              setPurokFilter(
                event.target.value
              );
              setCurrentPage(1);
            }}
            style={{
              width: "210px",
              border: "1px solid #dfe4eb",
              borderRadius: "8px",
              padding: "8px 10px",
              background: "white",
              fontSize: "12px",
            }}
          >
            <option value="">
              ALL PUROK
            </option>

            {purokOptions.map((purok) => (
              <option
                key={purok}
                value={purok}
              >
                {purok}
              </option>
            ))}
          </select>

          <select
            value={familySizeFilter}
            onChange={(event) => {
              setFamilySizeFilter(
                event.target.value
              );
              setCurrentPage(1);
            }}
            style={{
              width: "200px",
              border: "1px solid #dfe4eb",
              borderRadius: "8px",
              padding: "8px 10px",
              background: "white",
              fontSize: "12px",
            }}
          >
            <option value="">
              ALL FAMILY SIZES
            </option>
            <option value="1">
              1 MEMBER
            </option>
            <option value="2-3">
              2–3 MEMBERS
            </option>
            <option value="4-5">
              4–5 MEMBERS
            </option>
            <option value="6+">
              6+ MEMBERS
            </option>
          </select>

          <button
            type="button"
            onClick={() => {
              setFiltersApplied(true);
              setCurrentPage(1);
            }}
            style={{
              border: "1px solid #bfd3ee",
              background: "#f7fbff",
              color: "#2458a6",
              borderRadius: "8px",
              padding: "7px 11px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "12px",
            }}
          >
            Apply Filters
          </button>

          {(filtersApplied ||
            purokFilter ||
            familySizeFilter ||
            searchTerm) && (
            <button
              type="button"
              onClick={clearFamilyFilters}
              style={{
                border: "1px solid #dfe4eb",
                background: "white",
                borderRadius: "8px",
                padding: "7px 10px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              Clear
            </button>
          )}

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(
                event.target.value
              );
              setCurrentPage(1);
            }}
            placeholder="Search specific family or member..."
            style={{
              marginLeft: "auto",
              width: "260px",
              border: "1px solid #dfe4eb",
              borderRadius: "8px",
              padding: "8px 10px",
              fontSize: "12px",
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            marginTop: "7px",
            color: "#758094",
            fontSize: "11px",
          }}
        >
          {`${filteredFamilies.length} family record${
            filteredFamilies.length !== 1 ? "s" : ""
          } shown`}
        </div>
      </div>

      <div className="families-directory-bar records-directory-head">
        <div>
          <span>FAMILY DIRECTORY</span>
          <strong>{filteredFamilies.length} Registered {filteredFamilies.length === 1 ? "Family" : "Families"}</strong>
        </div>
        <button type="button" onClick={() => setShowPrintOptions(true)}>
          <Printer size={14} /> Print List
        </button>
      </div>

      {allFamilies.length === 0 ? (
        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "50px",
            textAlign: "center",
          }}
        >
          <h3>No family records yet</h3>

          <p>
            Family records will appear here after a census
            is submitted.
          </p>
        </div>
      ) : filteredFamilies.length === 0 ? (
        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "12px",
            padding: "30px",
            textAlign: "center",
            color: "#758094",
          }}
        >
          No families match your search.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {paginatedFamilies.map(
            (family: FamilyWithHousehold, index: number) => {
              const members = Array.isArray(
                family?.members
              )
                ? family.members
                : [];

              return (
                <div className="records-record-card"
                  key={`${family?.householdNumber || "household"}-${family?.id || "family"}-${index}`}
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
                    borderRadius: "12px",
                    padding: "13px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "9px",
                        background: "#f0f4f9",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <UsersRound
                        size={18}
                        strokeWidth={1.8}
                      />
                    </div>

                    <div
                      style={{
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: "15px",
                          color: "#172033",
                        }}
                      >
                        {toProperCase(
                          family?.familyName
                        ) || "Unnamed Family"}
                      </h3>

                      <span
                        style={{
                          display: "block",
                          marginTop: "3px",
                          color: "#8993a5",
                          fontSize: "11px",
                        }}
                      >
                        Household{" "}
                        {family?.householdNumber}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: "11px",
                      paddingTop: "10px",
                      borderTop:
                        "1px solid #eef0f4",
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "space-between",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "11px",
                      }}
                    >
                      {members.length} member
                      {members.length !== 1
                        ? "s"
                        : ""}
                    </span>

                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          void openFamilyDetails(
                            family
                          );
                        }}
                        style={{
                          border:
                            "1px solid #dfe4eb",
                          background: "white",
                          color: "#475569",
                          borderRadius: "8px",
                          padding: "6px 9px",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        View Details
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionError("");
                          setActionSuccess("");
                          setEditTarget(family);
                          setEditFamilyName(
                            family?.familyName ||
                              ""
                          );
                        }}
                        style={{
                          border:
                            "1px solid #dfe4eb",
                          background: "white",
                          borderRadius: "8px",
                          padding: "6px 8px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        <Pencil size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActionError("");
                          setActionSuccess("");
                          setDeleteTarget(
                            family
                          );
                          setDeleteReason("");
                        }}
                        style={{
                          border:
                            "1px solid #fecdd3",
                          background: "#fff1f2",
                          color: "#b42318",
                          borderRadius: "8px",
                          padding: "6px 8px",
                          cursor: "pointer",
                          fontSize: "11px",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="records-pagination"
          style={{
            marginTop: "16px",
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
            Page {effectivePage} of {totalPages} · {`${filteredFamilies.length} famil${filteredFamilies.length !== 1 ? "ies" : "y"}`}
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
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
                fontSize: "12px",
                cursor:
                  effectivePage <= 1
                    ? "not-allowed"
                    : "pointer",
                opacity: effectivePage <= 1 ? 0.5 : 1,
              }}
            >
              ← Previous
            </button>

            {Array.from(
              { length: totalPages },
              (_, index) => index + 1
            )
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - effectivePage) <= 1
              )
              .map((page, index, visiblePages) => (
                <span
                  key={page}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {index > 0 &&
                    page - visiblePages[index - 1] > 1 && (
                      <span style={{ color: "#94a3b8" }}>
                        …
                      </span>
                    )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      minWidth: "32px",
                      height: "32px",
                      border:
                        page === effectivePage
                          ? "1px solid #2563eb"
                          : "1px solid #dfe4eb",
                      background:
                        page === effectivePage
                          ? "#eff6ff"
                          : "white",
                      color:
                        page === effectivePage
                          ? "#1d4ed8"
                          : "#475569",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "12px",
                    }}
                  >
                    {page}
                  </button>
                </span>
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
                fontSize: "12px",
                cursor:
                  effectivePage >= totalPages
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  effectivePage >= totalPages
                    ? 0.5
                    : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}


      </>
      )}

      {showPrintOptions && (
        <div className="families-print-backdrop" onMouseDown={(e) => {
          if (e.currentTarget === e.target) setShowPrintOptions(false);
        }}>
          <div className="families-print-modal">
            <div className="families-print-head">
              <div>
                <span>PRINT FAMILY RECORDS</span>
                <h2>Choose Report Format</h2>
                <p>The current search and Purok/family-size filters will be used.</p>
              </div>
              <button type="button" onClick={() => setShowPrintOptions(false)}><X size={17}/></button>
            </div>

            <div className="families-print-options">
              <button type="button" className={printType === "registry" ? "selected" : ""} onClick={() => setPrintType("registry")}>
                <strong>Registered Families Masterlist</strong>
                <span>Family name, Purok, address and number of members.</span>
              </button>
              <button type="button" className={printType === "members" ? "selected" : ""} onClick={() => setPrintType("members")}>
                <strong>Family Members List</strong>
                <span>Family-by-family list of residents and relationships.</span>
              </button>
            </div>

            <label className="families-print-label">Purpose / Remarks (optional)</label>
            <input
              className="families-print-input"
              value={printPurpose}
              onChange={(e) => setPrintPurpose(e.target.value)}
              placeholder="Example: Barangay family profiling"
            />

            <div className="families-print-summary">
              <span><b>{filteredFamilies.length}</b> families included</span>
              <span>{purokFilter ? toProperCase(purokFilter) : "All Purok"}</span>
            </div>

            <div className="families-print-actions">
              <button type="button" className="secondary" onClick={() => setShowPrintOptions(false)}>Cancel</button>
              <button type="button" className="primary" onClick={printFamilyList}><Printer size={14}/> Preview & Print</button>
            </div>
          </div>
        </div>
      )}

      {selectedFamily && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Family details"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1100,
            background: "rgba(15,23,42,.55)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedFamily(null);
              setSelectedResident(null);
              setSelectedExternalMember(null);
            }
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              maxHeight: "86vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 24px 70px rgba(15,23,42,.28)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 5px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.13em",
                    color: "#7e8a9f",
                  }}
                >
                  FAMILY DETAILS
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "24px",
                    lineHeight: 1.2,
                    color: "#172033",
                  }}
                >
                  {toProperCase(selectedFamily.familyName) ||
                    "Unnamed Family"}
                </h2>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#758094",
                    fontSize: "12px",
                  }}
                >
                  Household {selectedFamily.householdNumber || "—"}
                  {selectedFamily.household?.purok
                    ? ` · ${toProperCase(selectedFamily.household.purok)}`
                    : ""}
                  {" · "}
                  {Array.isArray(selectedFamily.members)
                    ? selectedFamily.members.length
                    : 0}{" "}
                  member
                  {Array.isArray(selectedFamily.members) &&
                  selectedFamily.members.length !== 1
                    ? "s"
                    : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedFamily(null);
                  setSelectedResident(null);
                  setSelectedExternalMember(null);
                }}
                style={{
                  border: 0,
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  background: "#f2f4f7",
                  cursor: "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                paddingTop: "16px",
                borderTop: "1px solid #eef0f4",
              }}
            >
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: "15px",
                  color: "#172033",
                }}
              >
                Family Members
              </h3>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "11px",
                  color: "#8993a5",
                }}
              >
                Members living in this household.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "8px",
                }}
              >
                {(Array.isArray(selectedFamily.members)
                  ? [...selectedFamily.members].sort(compareResidentNames)
                  : []
                ).map((member: Resident, index: number) => {
                  const fullName =
                    formatResidentName(member) ||
                    "Unnamed Resident";

                  return (
                    <div
                      key={`${fullName}-${index}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "10px 12px",
                        border: "1px solid #e7eaf0",
                        borderRadius: "9px",
                        background: "#fff",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#172033",
                          }}
                        >
                          {fullName}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            marginTop: "3px",
                            fontSize: "11px",
                            color: "#8993a5",
                          }}
                        >
                          {toProperCase(
                            member.familyRelationship ||
                              "Family Member"
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedResident({
                            ...member,
                            fullName,
                            familyName:
                              selectedFamily.familyName ||
                              "Unnamed Family",
                            householdNumber:
                              selectedFamily.householdNumber,
                          })
                        }
                        style={{
                          border: "1px solid #bfd3ee",
                          background: "#f7fbff",
                          color: "#2458a6",
                          borderRadius: "8px",
                          padding: "6px 9px",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                marginTop: "18px",
                paddingTop: "16px",
                borderTop: "1px solid #eef0f4",
              }}
            >
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: "15px",
                  color: "#172033",
                }}
              >
                Children Living in Another Household
              </h3>
              <p
                style={{
                  margin: "0 0 10px",
                  fontSize: "11px",
                  color: "#8993a5",
                }}
              >
                Direct child links only. They are not counted in this household.
              </p>

              {externalLoading ? (
                <div
                  style={{
                    padding: "10px 12px",
                    color: "#758094",
                    fontSize: "12px",
                  }}
                >
                  Loading linked children...
                </div>
              ) : externalMembers.length === 0 ? (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: "9px",
                    color: "#758094",
                    fontSize: "12px",
                  }}
                >
                  No linked children living in another household.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "8px" }}>
                  {externalMembers.map((member) => (
                    <div
                      key={`${member.residentUuid}-${member.relationship}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "10px 12px",
                        border: "1px solid #e7eaf0",
                        borderRadius: "9px",
                        background: "#fff",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong
                          style={{
                            display: "block",
                            fontSize: "13px",
                            color: "#172033",
                          }}
                        >
                          {member.fullName}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            marginTop: "3px",
                            fontSize: "11px",
                            color: "#8993a5",
                          }}
                        >
                          {toProperCase(member.relationship) || "Child"}
                          {" · "}
                          Household {member.householdNumber || "—"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedExternalMember(member)
                        }
                        style={{
                          border: "1px solid #bfd3ee",
                          background: "#f7fbff",
                          color: "#2458a6",
                          borderRadius: "8px",
                          padding: "6px 9px",
                          cursor: "pointer",
                          fontWeight: 700,
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedResident && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Resident details"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15,23,42,.62)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedResident(null);
            }
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              maxHeight: "86vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 24px 70px rgba(15,23,42,.3)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 5px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.13em",
                    color: "#7e8a9f",
                  }}
                >
                  RESIDENT DETAILS
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    color: "#172033",
                  }}
                >
                  {selectedResident.fullName ||
                    "Unnamed Resident"}
                </h2>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#758094",
                    fontSize: "12px",
                  }}
                >
                  {toProperCase(selectedResident.familyName)}
                  {" · "}
                  Household {selectedResident.householdNumber || "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedResident(null)}
                style={{
                  border: 0,
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  background: "#f2f4f7",
                  cursor: "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr))",
                gap: "9px",
              }}
            >
              {[
                ["Relationship", selectedResident.familyRelationship || "—"],
                ["Sex", selectedResident.sex || "—"],
                ["Birth Date", selectedResident.birthDate || "—"],
                ["Civil Status", selectedResident.civilStatus || "—"],
                ["Occupation", selectedResident.primaryOccupation || "—"],
                ["Employment Status", selectedResident.employmentStatus || "—"],
                [
                  "Monthly Income",
                  selectedResident.monthlyIncome
                    ? `₱${selectedResident.monthlyIncome}`
                    : "—",
                ],
                ["Voter Status", selectedResident.voterStatus || "—"],
                ["4Ps Member", selectedResident.fourPsMember || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: "9px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#8993a5",
                      letterSpacing: ".05em",
                    }}
                  >
                    {label}
                  </span>
                  <strong
                    style={{
                      fontSize: "12px",
                      color: "#172033",
                    }}
                  >
                    {String(value)}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedExternalMember && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Linked child details"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15,23,42,.62)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedExternalMember(null);
            }
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "white",
              borderRadius: "16px",
              padding: "22px",
              boxShadow: "0 24px 70px rgba(15,23,42,.3)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 5px",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.13em",
                    color: "#7e8a9f",
                  }}
                >
                  LINKED CHILD DETAILS
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: "22px",
                    color: "#172033",
                  }}
                >
                  {selectedExternalMember.fullName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedExternalMember(null)}
                style={{
                  border: 0,
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  background: "#f2f4f7",
                  cursor: "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                display: "grid",
                gap: "9px",
              }}
            >
              {[
                ["Relationship", selectedExternalMember.relationship || "Child"],
                ["Household", selectedExternalMember.householdNumber || "—"],
                ["Purok", selectedExternalMember.purok || "—"],
                ["Street", selectedExternalMember.street || "—"],
                ["Resident ID", selectedExternalMember.residentId || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: "10px 12px",
                    background: "#f8fafc",
                    borderRadius: "9px",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "#8993a5",
                    }}
                  >
                    {label}
                  </span>
                  <strong
                    style={{
                      fontSize: "12px",
                      color: "#172033",
                    }}
                  >
                    {toProperCase(String(value))}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.48)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => !saving && setEditTarget(null)}
        >
          <div
            style={{
              width: "min(480px,100%)",
              background: "white",
              borderRadius: "14px",
              padding: "22px",
              boxShadow: "0 24px 60px rgba(15,23,42,.22)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"center"}}>
              <div>
                <h2 style={{margin:0,fontSize:"20px",color:"#172033"}}>Edit Family</h2>
                <p style={{margin:"6px 0 0",fontSize:"13px",color:"#758094"}}>
                  Household {editTarget.householdNumber}
                </p>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} disabled={saving}
                style={{border:0,background:"#f2f4f7",width:"34px",height:"34px",borderRadius:"8px",cursor:"pointer"}}>
                <X size={17}/>
              </button>
            </div>

            <label style={{display:"block",marginTop:"20px",fontSize:"12px",fontWeight:700,color:"#475467"}}>
              Family Name
            </label>
            <input
              value={editFamilyName}
              onChange={(event) => setEditFamilyName(event.target.value)}
              style={{width:"100%",boxSizing:"border-box",marginTop:"7px",padding:"11px 12px",border:"1px solid #d0d5dd",borderRadius:"9px"}}
            />

            <div style={{display:"flex",justifyContent:"flex-end",gap:"9px",marginTop:"20px"}}>
              <button type="button" onClick={() => setEditTarget(null)} disabled={saving}
                style={{padding:"10px 14px",border:"1px solid #d0d5dd",background:"white",borderRadius:"9px",cursor:"pointer"}}>
                Cancel
              </button>
              <button type="button" onClick={() => void handleSaveFamilyEdit()} disabled={saving || !editFamilyName.trim()}
                style={{padding:"10px 14px",border:0,background:"#2563eb",color:"white",borderRadius:"9px",cursor:"pointer",fontWeight:700}}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,.48)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => !saving && setDeleteTarget(null)}
        >
          <div
            style={{
              width: "min(500px,100%)",
              background: "white",
              borderRadius: "14px",
              padding: "22px",
              boxShadow: "0 24px 60px rgba(15,23,42,.22)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{display:"flex",justifyContent:"space-between",gap:"12px",alignItems:"center"}}>
              <div>
                <h2 style={{margin:0,fontSize:"20px",color:"#172033"}}>Move Family to Recycle Bin?</h2>
                <p style={{margin:"6px 0 0",fontSize:"13px",color:"#758094"}}>
                  {toProperCase(deleteTarget.familyName) || "Unnamed Family"} · Household {deleteTarget.householdNumber}
                </p>
              </div>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving}
                style={{border:0,background:"#f2f4f7",width:"34px",height:"34px",borderRadius:"8px",cursor:"pointer"}}>
                <X size={17}/>
              </button>
            </div>

            <div style={{marginTop:"16px",padding:"12px",background:"#fff7ed",borderRadius:"9px",fontSize:"13px",color:"#9a3412"}}>
              The family record and its memberships will be removed. The residents themselves will remain active in the household.
            </div>

            <label style={{display:"block",marginTop:"18px",fontSize:"12px",fontWeight:700,color:"#475467"}}>
              Reason for deletion
            </label>
            <textarea
              value={deleteReason}
              onChange={(event) => setDeleteReason(event.target.value)}
              rows={3}
              placeholder="Enter the reason..."
              style={{width:"100%",boxSizing:"border-box",marginTop:"7px",padding:"11px 12px",border:"1px solid #d0d5dd",borderRadius:"9px",resize:"vertical"}}
            />

            <div style={{display:"flex",justifyContent:"flex-end",gap:"9px",marginTop:"20px"}}>
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={saving}
                style={{padding:"10px 14px",border:"1px solid #d0d5dd",background:"white",borderRadius:"9px",cursor:"pointer"}}>
                Cancel
              </button>
              <button type="button" onClick={() => void handleDeleteFamily()} disabled={saving || !deleteReason.trim()}
                style={{padding:"10px 14px",border:0,background:"#dc2626",color:"white",borderRadius:"9px",cursor:"pointer",fontWeight:700}}>
                {saving ? "Deleting..." : "Move to Recycle Bin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Families;



