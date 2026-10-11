import {
  House,
  ArrowLeft,
  Pencil,
  Save,
  X,
  Trash2,
  AlertTriangle,
  BarChart3,
  List,
  Printer,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  CensusData,
  CensusRecord,
  Family,
} from "../../types/census";
import {
  getCensusRecords,
  updateHousehold,
  deleteHouseholdToRecycleBin,
} from "../../services/censusStorage";
import HouseholdsDemographics from "./HouseholdsDemographics";
import "./households.css";
import "./householdPrint.css";
import barangayLogo from "../../assets/barangay-pambuhan-logo.png";

type HouseholdsProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type HouseholdEditDraft = {
  houseNumber: string;
  street: string;
  purok: string;
  yearsInBarangay: string;
};

function toProperCase(value?: string | null): string {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(
      /(^|[\s.'’-])([a-zà-ÿ])/g,
      (_, separator, letter) =>
        `${separator}${letter.toUpperCase()}`
    );
}

function formalNamePart(value?: string | null): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/(^|[\s.'’-])([a-zà-ÿ])/g, (_, separator, letter) => {
      return `${separator}${letter.toUpperCase()}`;
    });
}

function getHouseholdHead(record: CensusData) {
  const families = Array.isArray(record.families) ? record.families : [];
  const members = families.flatMap((family) =>
    Array.isArray(family.members) ? family.members : []
  );

  const head =
    members.find((member) => {
      const relationship = String(member.familyRelationship || "")
        .trim()
        .toLowerCase();
      return (
        relationship === "family head" ||
        relationship === "household head" ||
        relationship === "head"
      );
    }) || members[0];

  return head || null;
}

function getHouseholdDisplayName(record: CensusData): string {
  const head = getHouseholdHead(record);
  if (!head) return "Unnamed Household";

  const lastName = String(head.lastName || "").trim().toUpperCase();
  const firstName = formalNamePart(head.firstName);
  const middleName = formalNamePart(head.middleName);
  const suffix = formalNamePart(head.suffix);

  const given = [firstName, middleName, suffix].filter(Boolean).join(" ");
  const fullName = lastName
    ? `${lastName}${given ? `, ${given}` : ""}`
    : given;

  return fullName || "Unnamed Household";
}

function escapePrintHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function Households({
  censusRecords,
  onBackToDashboard,
}: HouseholdsProps) {
  const [liveRecords, setLiveRecords] =
    useState<CensusData[]>(
      Array.isArray(censusRecords)
        ? censusRecords
        : []
    );

  const [
    editingRecord,
    setEditingRecord,
  ] = useState<CensusData | null>(null);

  const [
    editDraft,
    setEditDraft,
  ] = useState<HouseholdEditDraft | null>(null);

  const [savingEdit, setSavingEdit] =
    useState(false);
  const [editError, setEditError] =
    useState("");
  const [editSuccess, setEditSuccess] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<CensusData | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  const [selectedHousehold, setSelectedHousehold] =
    useState<CensusData | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [purokFilter, setPurokFilter] = useState("");
  const [residentCountFilter, setResidentCountFilter] = useState("");
  const [familyCountFilter, setFamilyCountFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeView, setActiveView] = useState<"list" | "demographics">("list");
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    // Keep the local list in sync with records refreshed by the parent.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLiveRecords(
      Array.isArray(censusRecords)
        ? censusRecords
        : []
    );

    let active = true;

    const refresh = async () => {
      try {
        const records =
          await getCensusRecords();

        if (active) {
          setLiveRecords(
            records.map(
              (record: CensusRecord) =>
                record.data
            )
          );
        }
      } catch (error) {
        console.error(
          "FAILED TO REFRESH HOUSEHOLD RECORDS:",
          error
        );
      }
    };

    void refresh();

    return () => {
      active = false;
    };
  }, [censusRecords]);

  const safeRecords = useMemo(
    () =>
      Array.isArray(liveRecords)
        ? liveRecords.filter(
            (
              record
            ): record is CensusData =>
              Boolean(record)
          )
        : [],
    [liveRecords]
  );

  function openEditHousehold(
    record: CensusData
  ) {
    setEditingRecord(record);
    setEditDraft({
      houseNumber:
        record.household?.houseNumber ||
        "",
      street:
        record.household?.street || "",
      purok:
        record.household?.purok || "",
      yearsInBarangay:
        record.household
          ?.yearsInBarangay || "",
    });
    setEditError("");
    setEditSuccess("");
  }

  function closeEditHousehold() {
    if (savingEdit) return;

    setEditingRecord(null);
    setEditDraft(null);
    setEditError("");
    setEditSuccess("");
  }

  function updateEditField(
    field: keyof HouseholdEditDraft,
    value: string
  ) {
    setEditDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  }

  async function saveHouseholdEdit() {
    if (
      !editingRecord ||
      !editDraft
    ) {
      return;
    }

    const householdNumber =
      editingRecord.householdNumber;

    if (!householdNumber) {
      setEditError(
        "Household number is missing."
      );
      return;
    }

    if (!editDraft.purok.trim()) {
      setEditError(
        "Purok is required."
      );
      return;
    }

    if (
      editDraft.yearsInBarangay.trim() &&
      !Number.isFinite(
        Number(
          editDraft.yearsInBarangay
        )
      )
    ) {
      setEditError(
        "Years in Barangay must be a valid number."
      );
      return;
    }

    setSavingEdit(true);
    setEditError("");
    setEditSuccess("");

    try {
      const savedRecord =
        await updateHousehold({
          householdNumber,
          houseNumber:
            editDraft.houseNumber,
          street:
            editDraft.street,
          purok:
            editDraft.purok,
          yearsInBarangay:
            editDraft.yearsInBarangay,
        });

      setLiveRecords(
        (current) =>
          current.map((record) =>
            record.householdNumber ===
            householdNumber
              ? savedRecord.data
              : record
          )
      );

      setEditSuccess(
        "Household information updated successfully."
      );

      window.setTimeout(() => {
        setEditingRecord(null);
        setEditDraft(null);
        setEditSuccess("");
      }, 900);
    } catch (error) {
      console.error(
        "FAILED TO UPDATE HOUSEHOLD:",
        error
      );

      setEditError(
        error instanceof Error
          ? error.message
          : "Unable to update household information."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteHousehold() {
    if (!deleteTarget || deleting) return;
    const householdNumber = deleteTarget.householdNumber?.trim();
    if (!householdNumber) {
      setDeleteError("Household number is missing.");
      return;
    }
    if (!deleteReason.trim()) {
      setDeleteError("Please provide a reason for deleting this household.");
      return;
    }

    setDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");
    try {
      await deleteHouseholdToRecycleBin(householdNumber, deleteReason);
      setLiveRecords((current) =>
        current.filter((record) => record.householdNumber !== householdNumber)
      );
      setDeleteTarget(null);
      setDeleteReason("");
      setDeleteSuccess(
        `Household ${householdNumber} was moved to the Recycle Bin successfully.`
      );
    } catch (error) {
      console.error("FAILED TO DELETE HOUSEHOLD:", error);
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete the household."
      );
    } finally {
      setDeleting(false);
    }
  }

  const purokOptions = [
    "PUROK 1",
    "PUROK 2",
    "PUROK 3",
    "PUROK 4A",
    "PUROK 4B",
    "PUROK 5",
    "PUROK 6",
  ];

  const normalizedSearch =
    searchTerm.trim().toLowerCase();

  const filteredRecords = safeRecords.filter((record) => {
        const household = record.household || {};

        const matchesSearch =
          normalizedSearch === "" ||
          [
            getHouseholdDisplayName(record),
            record.householdNumber,
            household.houseNumber,
            household.street,
            household.purok,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

        const matchesPurok =
          purokFilter === "" ||
          String(household.purok || "")
            .trim()
            .toUpperCase() ===
            purokFilter.toUpperCase();

        const families =
          Array.isArray(record.families)
            ? record.families
            : [];

        const residentCount =
          families.reduce(
            (total, family) =>
              total +
              (Array.isArray(family.members)
                ? family.members.length
                : 0),
            0
          );

        const familyCount =
          families.length;

        const matchesResidentCount =
          residentCountFilter === "" ||
          (residentCountFilter === "1" &&
            residentCount === 1) ||
          (residentCountFilter === "2-3" &&
            residentCount >= 2 &&
            residentCount <= 3) ||
          (residentCountFilter === "4-5" &&
            residentCount >= 4 &&
            residentCount <= 5) ||
          (residentCountFilter === "6+" &&
            residentCount >= 6);

        const matchesFamilyCount =
          familyCountFilter === "" ||
          (familyCountFilter === "1" &&
            familyCount === 1) ||
          (familyCountFilter === "2" &&
            familyCount === 2) ||
          (familyCountFilter === "3+" &&
            familyCount >= 3);

        return (
          matchesSearch &&
          matchesPurok &&
          matchesResidentCount &&
          matchesFamilyCount
        );
      });

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredRecords.length /
        ITEMS_PER_PAGE
    )
  );

  const effectivePage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedRecords =
    filteredRecords.slice(
      (effectivePage - 1) *
        ITEMS_PER_PAGE,
      effectivePage * ITEMS_PER_PAGE
    );

  function clearHouseholdFilters() {
    setSearchTerm("");
    setPurokFilter("");
    setResidentCountFilter("");
    setFamilyCountFilter("");
    setCurrentPage(1);
  }

  const filteredResidentTotal =
    filteredRecords.reduce(
      (grandTotal, record) =>
        grandTotal +
        (Array.isArray(record.families)
          ? record.families.reduce(
              (familyTotal, family) =>
                familyTotal +
                (Array.isArray(
                  family.members
                )
                  ? family.members.length
                  : 0),
              0
            )
          : 0),
      0
    );

  const filteredFamilyTotal =
    filteredRecords.reduce(
      (total, record) =>
        total +
        (Array.isArray(record.families)
          ? record.families.length
          : 0),
      0
    );

  function printHouseholdMasterlist() {
    const rows = [...filteredRecords].sort((a, b) =>
      getHouseholdDisplayName(a).localeCompare(getHouseholdDisplayName(b))
    );

    const printWindow = window.open("", "_blank", "width=1100,height=760");
    if (!printWindow) {
      window.alert("Please allow pop-ups so the household print preview can open.");
      return;
    }

    const coverage = purokFilter ? toProperCase(purokFilter) : "ALL PUROK";
    const resolvedLogo = new URL(barangayLogo, window.location.href).href;
    const today = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const tableRows = rows
      .map((record, index) => {
        const household = record.household || {};
        const rawHouseNumber = String(household.houseNumber || "").trim();
        const printableHouseNumber =
          /^HOUSE-/i.test(rawHouseNumber) || /^HH-/i.test(rawHouseNumber)
            ? ""
            : rawHouseNumber;

        const address = [printableHouseNumber, household.street]
          .map((value) => String(value || "").trim())
          .filter(Boolean)
          .join(", ");

        return `
          <tr>
            <td class="number">${index + 1}</td>
            <td class="name">${escapePrintHtml(getHouseholdDisplayName(record))}</td>
            <td>${escapePrintHtml(household.purok ? toProperCase(household.purok) : "—")}</td>
            <td>${escapePrintHtml(address || "—")}</td>
          </tr>
        `;
      })
      .join("");

    const inheritedStyles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((node) => node.outerHTML)
      .join("\n");

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Household Masterlist</title>
  ${inheritedStyles}
</head>
<body class="household-print-document">\n  <div class="print-actions">
    <button onclick="window.close()">Close</button>
    <button class="primary" onclick="window.print()">Print</button>
  </div>

  <main class="sheet">
    <header class="header">
      <img class="header-logo" src="${resolvedLogo}" alt="Barangay Pambuhan Logo" />
      <div class="header-text">
        <div>Republic of the Philippines</div>
        <div>Province of Camarines Norte</div>
        <div>Municipality of Mercedes</div>
        <div class="barangay">BARANGAY PAMBUHAN</div>
        <div>Office of the Barangay</div>
      </div>
    </header>

    <div class="rule"></div>
    <h1>HOUSEHOLD MASTERLIST</h1>

    <section class="report-info">
      <div><strong>Coverage:</strong> ${escapePrintHtml(coverage)}</div>
      <div><strong>Date:</strong> ${escapePrintHtml(today)}</div>
      <div><strong>Total Households:</strong> ${rows.length}</div>
    </section>

    <table>
      <thead>
        <tr>
          <th>No.</th>
          <th>Household Name</th>
          <th>Purok</th>
          <th>Address</th>
        </tr>
      </thead>
      <tbody>${tableRows || `<tr><td colspan="4" class="empty">No household records found.</td></tr>`}</tbody>
    </table>

    <footer class="footer">
      <div class="total">Total Listed Households: ${rows.length}</div>
      <div class="prepared">
        <div class="prepared-line">Barangay Secretary</div>
        <div class="prepared-role">Prepared by</div>
      </div>
    </footer>
  </main>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
  }

  return (
    <main
      className="records-page-shell records-page-households"
      style={{
        flex: 1,
        padding: "34px 42px",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <div className="households-page-header records-page-header">
        <div>
          <p className="households-page-eyebrow">BARANGAY MANAGEMENT SYSTEM</p>
          <h1>Households</h1>
          <p className="households-page-subtitle">
            View and manage registered household census records.
          </p>
        </div>

        <button type="button" onClick={onBackToDashboard} className="households-back-button">
          <ArrowLeft size={17} strokeWidth={1.8} />
          Back to Dashboard
        </button>
      </div>

      <div className="households-view-row records-page-tabs">
        <div className="households-view-tabs" role="tablist" aria-label="Household views">
          <button
            type="button"
            className={`households-view-tab ${activeView === "list" ? "active" : ""}`}
            onClick={() => setActiveView("list")}
          >
            <List size={15} />
            Household List
          </button>
          <button
            type="button"
            className={`households-view-tab ${activeView === "demographics" ? "active" : ""}`}
            onClick={() => setActiveView("demographics")}
          >
            <BarChart3 size={15} />
            Demographics
          </button>
        </div>
      </div>

      {activeView === "demographics" ? (
        <HouseholdsDemographics records={safeRecords} />
      ) : (
        <>
      <div className="households-filter-panel records-filter-panel">
        <div
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
              setPurokFilter(event.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "205px",
              border: "1px solid #dfe4eb",
              borderRadius: "8px",
              padding: "8px 10px",
              background: "white",
              fontSize: "12px",
            }}
          >
            <option value="">ALL PUROK / ENTIRE BARANGAY</option>
            {purokOptions.map((purok) => (
              <option key={purok} value={purok}>
                {toProperCase(purok)}
              </option>
            ))}
          </select>

          <select
            value={residentCountFilter}
            onChange={(event) => {
              setResidentCountFilter(event.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "185px",
              border: "1px solid #dfe4eb",
              borderRadius: "8px",
              padding: "8px 10px",
              background: "white",
              fontSize: "12px",
            }}
          >
            <option value="">ALL HOUSEHOLD SIZES</option>
            <option value="1">1 RESIDENT</option>
            <option value="2-3">2–3 RESIDENTS</option>
            <option value="4-5">4–5 RESIDENTS</option>
            <option value="6+">6+ RESIDENTS</option>
          </select>

          <select
            value={familyCountFilter}
            onChange={(event) => {
              setFamilyCountFilter(event.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: "185px",
              border: "1px solid #dfe4eb",
              borderRadius: "8px",
              padding: "8px 10px",
              background: "white",
              fontSize: "12px",
            }}
          >
            <option value="">ALL FAMILY COUNTS</option>
            <option value="1">1 FAMILY</option>
            <option value="2">2 FAMILIES</option>
            <option value="3+">3+ FAMILIES</option>
          </select>

          <button
            type="button"
            onClick={() => {
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

          {(purokFilter ||
            residentCountFilter ||
            familyCountFilter ||
            searchTerm) && (
            <button
              type="button"
              onClick={clearHouseholdFilters}
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
              setSearchTerm(event.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search specific household..."
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
            lineHeight: 1.4,
          }}
        >
          {`${filteredRecords.length} household record${
            filteredRecords.length !== 1 ? "s" : ""
          } · ${filteredFamilyTotal} families · ${filteredResidentTotal} residents`}
        </div>
      </div>

      <div className="households-directory-toolbar records-directory-head">
        <div className="households-directory-title">
          <span>HOUSEHOLD DIRECTORY</span>
          <strong>{filteredRecords.length} Registered Household{filteredRecords.length !== 1 ? "s" : ""}</strong>
        </div>
        <div className="households-directory-actions">
          <span className="households-scope-badge">
            {purokFilter ? toProperCase(purokFilter) : "All households"}
          </span>
          <button
            type="button"
            className="households-print-button"
            onClick={printHouseholdMasterlist}
            title="Print the filtered household masterlist"
          >
            <Printer size={15} />
            Print List
          </button>
        </div>
      </div>

      {safeRecords.length === 0 ? (
        <div
          style={{
            background: "white",
            border:
              "1px solid #e7eaf0",
            borderRadius: "14px",
            padding: "50px",
            textAlign: "center",
          }}
        >
          <h3>
            No household records yet
          </h3>
          <p>
            Start by adding a household
            census record.
          </p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "12px",
            padding: "26px",
            color: "#758094",
          }}
        >
          No households match the current filter or search.
        </div>
      ) : (
        <div className="households-directory-list">
          {paginatedRecords.map(
            (
              record: CensusData,
              index: number
            ) => {
              const household =
                record?.household || {};

              const families =
                Array.isArray(
                  record?.families
                )
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
                      total +
                      members.length
                    );
                  },
                  0
                );

              return (
                <div
                  key={`${record?.householdNumber || "household"}-${index}`}
                  className="households-directory-card"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "space-between",
                      gap: "10px",
                      marginBottom:
                        "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius:
                            "11px",
                          background:
                            "#f0f4f9",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                        }}
                      >
                        <House
                          size={18}
                          strokeWidth={
                            1.8
                          }
                        />
                      </div>

                      <div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize:
                              "15px",
                          }}
                        >
                          {getHouseholdDisplayName(record)}
                        </h3>

                        <span
                          style={{
                            color:
                              "#8993a5",
                            fontSize:
                              "12px",
                          }}
                        >
                          {record?.householdNumber || "Household Record"}
                        </span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedHousehold(
                            record
                          )
                        }
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
                        onClick={() => openEditHousehold(record)}
                        style={{ border: "1px solid #bfd3ee", background: "#f7fbff", color: "#2458a6", borderRadius: "9px", padding: "6px 9px", fontSize: "11px", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Pencil size={15} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(record);
                          setDeleteReason("");
                          setDeleteError("");
                          setDeleteSuccess("");
                        }}
                        style={{ border: "1px solid #fecaca", background: "#fff7f7", color: "#b42318", borderRadius: "9px", padding: "6px 9px", fontSize: "11px", cursor: "pointer", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop:
                        "1px solid #eef0f4",
                      paddingTop: "8px",
                      display: "grid",
                      gap: "4px",
                      fontSize: "12px",
                      color: "#475569",
                    }}
                  >
                    <div>
                      <strong>Purok:</strong>{" "}
                      {household?.purok
                        ? toProperCase(
                            household.purok
                          )
                        : "—"}
                    </div>

                    <div>
                      <strong>Street:</strong>{" "}
                      {household?.street
                        ? toProperCase(
                            household.street
                          )
                        : "—"}
                    </div>

                    <div
                      style={{
                        marginTop: "4px",
                        display: "flex",
                        gap: "12px",
                        flexWrap: "wrap",
                        color: "#64748b",
                      }}
                    >
                      <span>
                        <strong>
                          {families.length}
                        </strong>{" "}
                        {families.length === 1
                          ? "Family"
                          : "Families"}
                      </span>

                      <span>
                        <strong>
                          {residents}
                        </strong>{" "}
                        Resident
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
            <span
              style={{
                fontSize: "12px",
                color: "#758094",
              }}
            >
              Page {effectivePage} of {totalPages} ·{" "}
              {filteredRecords.length} household record
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
                  setCurrentPage((page) =>
                    Math.max(1, page - 1)
                  )
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
                  opacity:
                    effectivePage <= 1
                      ? 0.5
                      : 1,
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
                    Math.abs(
                      page - effectivePage
                    ) <= 1
                )
                .map(
                  (
                    page,
                    index,
                    visiblePages
                  ) => (
                    <span
                      key={page}
                      style={{
                        display:
                          "inline-flex",
                        alignItems:
                          "center",
                        gap: "6px",
                      }}
                    >
                      {index > 0 &&
                        page -
                          visiblePages[
                            index - 1
                          ] >
                          1 && (
                          <span
                            style={{
                              color:
                                "#94a3b8",
                            }}
                          >
                            …
                          </span>
                        )}

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage(page)
                        }
                        style={{
                          minWidth:
                            "32px",
                          height: "32px",
                          border:
                            page ===
                            effectivePage
                              ? "1px solid #2563eb"
                              : "1px solid #dfe4eb",
                          background:
                            page ===
                            effectivePage
                              ? "#eff6ff"
                              : "white",
                          color:
                            page ===
                            effectivePage
                              ? "#1d4ed8"
                              : "#475569",
                          borderRadius:
                            "8px",
                          cursor:
                            "pointer",
                          fontWeight: 700,
                          fontSize:
                            "12px",
                        }}
                      >
                        {page}
                      </button>
                    </span>
                  )
                )}

              <button
                type="button"
                disabled={
                  effectivePage >= totalPages
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      totalPages,
                      page + 1
                    )
                  )
                }
                style={{
                  border: "1px solid #dfe4eb",
                  background: "white",
                  borderRadius: "8px",
                  padding: "6px 9px",
                  fontSize: "12px",
                  cursor:
                    effectivePage >=
                    totalPages
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    effectivePage >=
                    totalPages
                      ? 0.5
                      : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}

      {deleteSuccess && (
        <div style={{ marginTop: "16px", padding: "13px 15px", borderRadius: "10px", background: "#ecfdf3", color: "#067647", border: "1px solid #abefc6", fontWeight: 700 }}>
          {deleteSuccess}
        </div>
      )}

        </>
      )}

      {selectedHousehold && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Household details"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1190,
            background:
              "rgba(15,23,42,.55)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setSelectedHousehold(null);
            }
          }}
        >
          <div
            style={{
              width:
                "min(620px, 100%)",
              maxHeight: "85vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              boxShadow:
                "0 24px 70px rgba(15,23,42,.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "12px",
                alignItems:
                  "flex-start",
              }}
            >
              <div>
                <p
                  style={{
                    margin:
                      "0 0 5px",
                    color:
                      "#2458a6",
                    fontSize:
                      "11px",
                    fontWeight: 800,
                    letterSpacing:
                      ".08em",
                  }}
                >
                  HOUSEHOLD DETAILS
                </p>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                  }}
                >
                  {selectedHousehold.householdNumber}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedHousehold(null)
                }
                style={{
                  border: 0,
                  background: "#f2f4f7",
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
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
                gap: "12px",
              }}
            >
              {[
                [
                  "House No.",
                  selectedHousehold
                    .household
                    ?.houseNumber || "—",
                ],
                [
                  "Street",
                  selectedHousehold
                    .household
                    ?.street
                    ? toProperCase(
                        selectedHousehold
                          .household
                          .street
                      )
                    : "—",
                ],
                [
                  "Purok",
                  selectedHousehold
                    .household
                    ?.purok
                    ? toProperCase(
                        selectedHousehold
                          .household
                          .purok
                      )
                    : "—",
                ],
                [
                  "Years in Barangay",
                  selectedHousehold
                    .household
                    ?.yearsInBarangay ||
                    "—",
                ],
              ].map(
                ([label, value]) => (
                  <div
                    key={label}
                    style={{
                      padding:
                        "12px",
                      background:
                        "#f8fafc",
                      borderRadius:
                        "9px",
                    }}
                  >
                    <span
                      style={{
                        display:
                          "block",
                        marginBottom:
                          "4px",
                        color:
                          "#8993a5",
                        fontSize:
                          "10px",
                        fontWeight:
                          700,
                      }}
                    >
                      {label}
                    </span>

                    <strong>
                      {value}
                    </strong>
                  </div>
                )
              )}
            </div>

            <div
              style={{
                marginTop: "18px",
                paddingTop: "16px",
                borderTop:
                  "1px solid #eef0f4",
                display: "flex",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <span>
                <strong>
                  {Array.isArray(
                    selectedHousehold.families
                  )
                    ? selectedHousehold
                        .families.length
                    : 0}
                </strong>{" "}
                Families
              </span>

              <span>
                <strong>
                  {Array.isArray(
                    selectedHousehold.families
                  )
                    ? selectedHousehold.families.reduce(
                        (
                          total,
                          family
                        ) =>
                          total +
                          (Array.isArray(
                            family.members
                          )
                            ? family
                                .members
                                .length
                            : 0),
                        0
                      )
                    : 0}
                </strong>{" "}
                Residents
              </span>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1250, background: "rgba(15,23,42,.58)", display: "grid", placeItems: "center", padding: "20px" }}>
          <div style={{ width: "min(540px, 100%)", background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 24px 70px rgba(15,23,42,.3)" }}>
            <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "11px", background: "#fff1f2", color: "#b42318", display: "grid", placeItems: "center", flex: "0 0 42px" }}><AlertTriangle size={21} /></div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: "0 0 6px" }}>Move Household to Recycle Bin?</h2>
                <p style={{ margin: 0, color: "#667085", lineHeight: 1.55 }}>
                  <strong>{deleteTarget.householdNumber}</strong> and its linked families and residents will be removed from active records. A complete recovery snapshot will be kept in the Recycle Bin.
                </p>
              </div>
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} style={{ border: "none", background: "#f2f4f7", width: "34px", height: "34px", borderRadius: "9px", cursor: "pointer" }}><X size={17} /></button>
            </div>
            <label style={{ display: "grid", gap: "7px", marginTop: "18px", color: "#475467", fontSize: "13px", fontWeight: 700 }}>
              Reason for deletion <span style={{ color: "#b42318" }}>*</span>
              <textarea value={deleteReason} disabled={deleting} onChange={(e) => setDeleteReason(e.target.value)} rows={3} placeholder="Example: Duplicate household record" style={{ border: "1px solid #dfe4eb", borderRadius: "9px", padding: "11px 12px", font: "inherit", resize: "vertical" }} />
            </label>
            {deleteError && <div style={{ marginTop: "12px", padding: "11px 12px", borderRadius: "9px", background: "#fff1f2", color: "#b42318", border: "1px solid #fecaca" }}>{deleteError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} style={{ border: "1px solid #dfe4eb", background: "white", borderRadius: "9px", padding: "10px 15px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button type="button" disabled={deleting || !deleteReason.trim()} onClick={() => void confirmDeleteHousehold()} style={{ border: "none", background: !deleting && deleteReason.trim() ? "#b42318" : "#cbd5e1", color: "white", borderRadius: "9px", padding: "10px 16px", fontWeight: 700, cursor: !deleting && deleteReason.trim() ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: "7px" }}>
                <Trash2 size={15} /> {deleting ? "Moving..." : "Move to Recycle Bin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingRecord &&
        editDraft && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Edit household"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              background:
                "rgba(15, 23, 42, 0.55)",
              display: "flex",
              alignItems: "center",
              justifyContent:
                "center",
              padding: "20px",
            }}
            onMouseDown={(
              event
            ) => {
              if (
                event.currentTarget ===
                event.target
              ) {
                closeEditHousehold();
              }
            }}
          >
            <div
              style={{
                width:
                  "min(620px, 100%)",
                background: "white",
                borderRadius:
                  "16px",
                padding: "24px",
                boxShadow:
                  "0 24px 70px rgba(15, 23, 42, 0.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "16px",
                  marginBottom:
                    "20px",
                }}
              >
                <div>
                  <p
                    style={{
                      margin:
                        "0 0 5px",
                      color:
                        "#2458a6",
                      fontSize:
                        "11px",
                      fontWeight: 800,
                      letterSpacing:
                        "0.08em",
                    }}
                  >
                    HOUSEHOLD RECORD
                  </p>

                  <h2
                    style={{
                      margin: 0,
                      fontSize:
                        "21px",
                    }}
                  >
                    Edit Household
                  </h2>

                  <p
                    style={{
                      margin:
                        "6px 0 0",
                      color:
                        "#758094",
                      fontSize:
                        "13px",
                    }}
                  >
                    Household:{" "}
                    <strong>
                      {
                        editingRecord
                          .householdNumber
                      }
                    </strong>
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    savingEdit
                  }
                  onClick={
                    closeEditHousehold
                  }
                  style={{
                    border: "none",
                    background:
                      "#f2f4f7",
                    width: "34px",
                    height: "34px",
                    borderRadius:
                      "9px",
                    cursor:
                      savingEdit
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  <X size={17} />
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "14px",
                }}
              >
                {[
                  [
                    "House No.",
                    "houseNumber",
                  ],
                  [
                    "Street",
                    "street",
                  ],
                  [
                    "Purok",
                    "purok",
                  ],
                  [
                    "Years in Barangay",
                    "yearsInBarangay",
                  ],
                ].map(
                  ([
                    label,
                    field,
                  ]) => (
                    <label
                      key={
                        field
                      }
                      style={{
                        display:
                          "grid",
                        gap: "6px",
                        fontSize:
                          "12px",
                        fontWeight:
                          700,
                        color:
                          "#475467",
                      }}
                    >
                      {label}
                      <input
                        type={
                          field ===
                          "yearsInBarangay"
                            ? "number"
                            : "text"
                        }
                        min={
                          field ===
                          "yearsInBarangay"
                            ? "0"
                            : undefined
                        }
                        value={
                          editDraft[
                            field as keyof HouseholdEditDraft
                          ]
                        }
                        onChange={(
                          event
                        ) =>
                          updateEditField(
                            field as keyof HouseholdEditDraft,
                            event
                              .target
                              .value
                          )
                        }
                        style={{
                          border:
                            "1px solid #dfe4eb",
                          borderRadius:
                            "9px",
                          padding:
                            "11px 12px",
                          fontSize:
                            "14px",
                        }}
                      />
                    </label>
                  )
                )}
              </div>

              {editError && (
                <div
                  style={{
                    marginTop:
                      "14px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "9px",
                    background:
                      "#fff1f2",
                    color:
                      "#b42318",
                    fontSize:
                      "13px",
                    fontWeight:
                      600,
                  }}
                >
                  {editError}
                </div>
              )}

              {editSuccess && (
                <div
                  style={{
                    marginTop:
                      "14px",
                    padding:
                      "10px 12px",
                    borderRadius:
                      "9px",
                    background:
                      "#ecfdf3",
                    color:
                      "#168a5b",
                    fontSize:
                      "13px",
                    fontWeight:
                      700,
                  }}
                >
                  {editSuccess}
                </div>
              )}

              <div
                style={{
                  marginTop:
                    "20px",
                  paddingTop:
                    "17px",
                  borderTop:
                    "1px solid #eef0f4",
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  disabled={
                    savingEdit
                  }
                  onClick={
                    closeEditHousehold
                  }
                  style={{
                    border:
                      "1px solid #dfe4eb",
                    background:
                      "white",
                    borderRadius:
                      "9px",
                    padding:
                      "10px 15px",
                    fontWeight:
                      700,
                    cursor:
                      savingEdit
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    savingEdit
                  }
                  onClick={() =>
                    void saveHouseholdEdit()
                  }
                  style={{
                    border: "none",
                    background:
                      savingEdit
                        ? "#9aa4b2"
                        : "#176b57",
                    color: "white",
                    borderRadius:
                      "9px",
                    padding:
                      "10px 16px",
                    fontWeight:
                      700,
                    cursor:
                      savingEdit
                        ? "not-allowed"
                        : "pointer",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    gap: "7px",
                  }}
                >
                  <Save
                    size={15}
                  />
                  {savingEdit
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
    </main>
  );
}

export default Households;
