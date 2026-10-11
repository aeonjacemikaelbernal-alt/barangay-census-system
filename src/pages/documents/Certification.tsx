import { useMemo, useState } from "react";
import { ArrowLeft, FileText, Search, X } from "lucide-react";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

import type {
  CensusData,
  Resident,
} from "../../types/census";

import {
  formatResidentNaturalName,
  compareResidentNames,
} from "../../utils/nameFormatter";

import "./certification.css";

/* =========================================================
   TYPES
========================================================= */

type Props = {
  censusRecords: CensusData[];
  onBack: () => void;
};

type CertificationType =
  | "relationship"
  | "solo-parent"
  | "pwd"
  | "no-derogatory"
  | "guardianship"
  | "same-person"
  | "birth"
  | "no-birth-certificate"
  | "senior-lost-id"
  | "business-non-operational"
  | "moved-out"
  | "livelihood";

type ResidentRow = {
  key: string;
  resident: Resident;
  householdNumber: string;
  purok: string;
  address: string;
};

type PersonSearchProps = {
  label: string;
  placeholder: string;
  value: string;
  selectedKey: string;
  rows: ResidentRow[];
  mainResidentKey?: string;
  mainHouseholdNumber?: string;
  onValueChange: (value: string) => void;
  onSelect: (row: ResidentRow) => void;
  onClear: () => void;
};

/* =========================================================
   CONSTANTS
========================================================= */

const SIGNATORIES = [
  {
    name: "HON. RAUL A. BORJAL",
    position: "Punong Barangay",
  },
  {
    name: "HON. BLESSY B. NAEL",
    position: "Barangay Kagawad",
  },
  {
    name: "HON. REX D. GUTIERREZ",
    position: "Barangay Kagawad",
  },
  {
    name: "HON. LEONILO B. YANTO",
    position: "Barangay Kagawad",
  },
  {
    name: "HON. MENCHIE N. VELARDE",
    position: "Barangay Kagawad",
  },
  {
    name: "HON. JUANCHO E. BABAGAY",
    position: "Barangay Kagawad",
  },
  {
    name: "HON. RONALDO M. NAEL",
    position: "Barangay Kagawad",
  },
  {
    name: "HON. ANTONIO A. BORJAL",
    position: "Barangay Kagawad",
  },
];

const CERTIFICATION_TYPES: {
  value: CertificationType;
  label: string;
}[] = [
  {
    value: "relationship",
    label: "Relationship Certification",
  },
  {
    value: "solo-parent",
    label: "Solo Parent Certification",
  },
  {
    value: "pwd",
    label: "PWD Certification",
  },
  {
    value: "no-derogatory",
    label: "No Derogatory Record",
  },
  {
    value: "guardianship",
    label: "Certificate of Guardianship",
  },
  {
    value: "same-person",
    label: "One and the Same Person",
  },
  {
    value: "birth",
    label: "Birth Certification",
  },
  {
    value: "no-birth-certificate",
    label: "No Birth Certificate",
  },
  {
    value: "senior-lost-id",
    label: "Senior Citizen - Lost ID",
  },
  {
    value: "business-non-operational",
    label: "Business Non-Operational",
  },
  {
    value: "moved-out",
    label: "Moved Out / Residency Certification",
  },
  {
    value: "livelihood",
    label: "Livelihood / Farmer Certification",
  },
];

const INVALID_DISABILITY_VALUES = [
  "",
  "no",
  "none",
  "n/a",
  "na",
  "not applicable",
  "no disability",
  "without disability",
];

/* =========================================================
   BASIC HELPERS
========================================================= */

function proper(value = "") {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function upper(value = "") {
  return value.trim().toUpperCase();
}

function cleanPurok(value = "") {
  return value
    .trim()
    .replace(/^purok[\s-]*/i, "")
    .replace(/^zone[\s-]*/i, "");
}

function purokLabel(value = "") {
  const cleaned = cleanPurok(value);

  return cleaned ? `Purok-${cleaned}` : "";
}

function buildAddress(purok = "") {
  const p = purokLabel(purok);

  return [
    p,
    "Barangay Pambuhan",
    "Mercedes",
    "Camarines Norte",
  ]
    .filter(Boolean)
    .join(", ");
}

function getTodayInputDate() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateIssued(value: string) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(date.getDate()).padStart(
    2,
    "0"
  )}/${date.getFullYear()}`;
}

function ordinal(day: number) {
  if (day > 3 && day < 21) {
    return `${day}th`;
  }

  switch (day % 10) {
    case 1:
      return `${day}st`;

    case 2:
      return `${day}nd`;

    case 3:
      return `${day}rd`;

    default:
      return `${day}th`;
  }
}

function formatIssuanceDate(value: string) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = date.toLocaleDateString("en-US", {
    month: "long",
  });

  return `${ordinal(
    date.getDate()
  )} day of ${month}, ${date.getFullYear()}`;
}

function formatLongDate(value = "") {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date
    .toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();
}

function calculateAge(
  birthDate = "",
  referenceDate = getTodayInputDate()
) {
  if (!birthDate) return "";

  const birth = new Date(`${birthDate}T00:00:00`);
  const reference = new Date(
    `${referenceDate}T00:00:00`
  );

  if (
    Number.isNaN(birth.getTime()) ||
    Number.isNaN(reference.getTime())
  ) {
    return "";
  }

  let age =
    reference.getFullYear() - birth.getFullYear();

  const monthDifference =
    reference.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      reference.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age >= 0 ? String(age) : "";
}

function sanitizeFilename(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

function normalizePurpose(value = "") {
  return value
    .trim()
    .replace(/\.+$/, "");
}

function isValidDisability(value = "") {
  const normalized = value
    .trim()
    .toLowerCase();

  return !INVALID_DISABILITY_VALUES.includes(
    normalized
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXmlText(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/* =========================================================
   WORD XML PLACEHOLDER REPLACEMENT
========================================================= */

function replacePlaceholdersInXml(
  xml: string,
  replacements: Record<string, string>
) {
  let updatedXml = xml;

  Object.entries(replacements).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    const safeValue = escapeXml(value);

    const directRegex = new RegExp(
      `(<w:t\\b[^>]*>)([^<]*?)${escapeRegExp(
        placeholder
      )}([^<]*?)(<\\/w:t>)`,
      "g"
    );

    updatedXml = updatedXml.replace(
      directRegex,
      (_match, openTag, before, after, closeTag) => {
        return `${openTag}${before}${safeValue}${after}${closeTag}`;
      }
    );
  });

  updatedXml = updatedXml.replace(
    /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,
    (paragraph) => {
      const textRegex =
        /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g;

      const matches = [...paragraph.matchAll(textRegex)];

      if (!matches.length) {
        return paragraph;
      }

      const combinedText = matches
        .map((match) => decodeXmlText(match[1]))
        .join("");

      let replacedText = combinedText;
      let hasReplacement = false;

      Object.entries(replacements).forEach(
        ([key, value]) => {
          const placeholder = `{${key}}`;

          if (replacedText.includes(placeholder)) {
            replacedText = replacedText
              .split(placeholder)
              .join(value);

            hasReplacement = true;
          }
        }
      );

      if (!hasReplacement) {
        return paragraph;
      }

      let replacementInserted = false;

      return paragraph.replace(
        textRegex,
        (fullMatch) => {
          if (!replacementInserted) {
            replacementInserted = true;

            return fullMatch.replace(
              /(<w:t\b[^>]*>)[\s\S]*?(<\/w:t>)/,
              `$1${escapeXml(replacedText)}$2`
            );
          }

          return fullMatch.replace(
            /(<w:t\b[^>]*>)[\s\S]*?(<\/w:t>)/,
            "$1$2"
          );
        }
      );
    }
  );

  return updatedXml;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* =========================================================
   SECONDARY PERSON SEARCH
========================================================= */

function PersonSearch({
  label,
  placeholder,
  value,
  selectedKey,
  rows,
  mainResidentKey,
  mainHouseholdNumber,
  onValueChange,
  onSelect,
  onClear,
}: PersonSearchProps) {
  const filtered = useMemo(() => {
    const query = value
      .trim()
      .toLowerCase();

    if (!query || selectedKey) {
      return [];
    }

    return rows
      .filter(
        (row) => row.key !== mainResidentKey
      )
      .filter((row) => {
        const name =
          formatResidentNaturalName(
            row.resident
          ).toLowerCase();

        return (
          name.includes(query) ||
          row.address
            .toLowerCase()
            .includes(query) ||
          row.householdNumber
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((a, b) => {
        const aSame =
          a.householdNumber ===
          mainHouseholdNumber;

        const bSame =
          b.householdNumber ===
          mainHouseholdNumber;

        if (aSame && !bSame) return -1;
        if (!aSame && bSame) return 1;

        return compareResidentNames(
          a.resident,
          b.resident
        );
      })
      .slice(0, 20);
  }, [
    value,
    selectedKey,
    rows,
    mainResidentKey,
    mainHouseholdNumber,
  ]);

  return (
    <div className="cert-field">
      <span>{label}</span>

      <div className="cert-search">
        <Search size={17} />

        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) =>
            onValueChange(e.target.value)
          }
        />

        {value && (
          <button
            type="button"
            onClick={onClear}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!selectedKey &&
        value.trim() && (
          <div className="cert-search-results">
            {filtered.map((row) => (
              <button
                type="button"
                key={row.key}
                onClick={() =>
                  onSelect(row)
                }
              >
                <strong>
                  {formatResidentNaturalName(
                    row.resident
                  )}
                </strong>

                <small>
                  {row.address}
                  {row.householdNumber ===
                  mainHouseholdNumber
                    ? " • Same Household"
                    : ""}
                </small>
              </button>
            ))}

            {!filtered.length && (
              <div className="cert-empty">
                No census resident found.
                You may continue using the
                manually entered name.
              </div>
            )}
          </div>
        )}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function Certification({
  censusRecords,
  onBack,
}: Props) {
  const [
    certificationType,
    setCertificationType,
  ] =
    useState<CertificationType>(
      "relationship"
    );

  /* MAIN RESIDENT */

  const [search, setSearch] =
    useState("");

  const [
    selectedKey,
    setSelectedKey,
  ] = useState("");

  /* RELATIONSHIP */

  const [
    relationship,
    setRelationship,
  ] = useState("daughter");

  const [
    relatedPerson,
    setRelatedPerson,
  ] = useState("");

  const [
    relatedPersonKey,
    setRelatedPersonKey,
  ] = useState("");

  /* PWD */

  const [
    disability,
    setDisability,
  ] = useState("");

  /* INCOME / PURPOSE */

  const [
    monthlyIncome,
    setMonthlyIncome,
  ] = useState("");

  const [
    incomeWords,
    setIncomeWords,
  ] = useState("");

  const [
    purpose,
    setPurpose,
  ] = useState(
    "whatever legal purpose it may serve"
  );

  /* GUARDIANSHIP */

  const [
    guardianRelation,
    setGuardianRelation,
  ] = useState("guardian");

  const [
    dependentName,
    setDependentName,
  ] = useState("");

  const [
    dependentKey,
    setDependentKey,
  ] = useState("");

  /* SAME PERSON / BIRTH */

  const [
    alternateName,
    setAlternateName,
  ] = useState("");

  const [
    identificationNumber,
    setIdentificationNumber,
  ] = useState("");

  const [
    identificationDate,
    setIdentificationDate,
  ] = useState("");

  /* BUSINESS */

  const [
    businessName,
    setBusinessName,
  ] = useState("");

  const [
    businessPurok,
    setBusinessPurok,
  ] = useState("");

  /* MOVED OUT */

  const [
    previousResidence,
    setPreviousResidence,
  ] = useState("");

  const [
    transferYear,
    setTransferYear,
  ] = useState("");

  /* FARMER / LIVELIHOOD */

  const [
    landOwner,
    setLandOwner,
  ] = useState("");

  const [
    landArea,
    setLandArea,
  ] = useState("");

  const [crop, setCrop] =
    useState("");

  const [
    livelihood,
    setLivelihood,
  ] = useState("");

  const [
  landStatus,
  setLandStatus,
] = useState<"owner" | "farm-worker">("farm-worker");

  /* SENIOR */

  const [
    lostIdReason,
    setLostIdReason,
  ] = useState(
    "and the same was never found"
  );

  /* DOCUMENT */

  const [
    orNumber,
    setOrNumber,
  ] = useState("");

  const [
    dateIssued,
    setDateIssued,
  ] = useState(
    getTodayInputDate()
  );

  const [
    signatoryIndex,
    setSignatoryIndex,
  ] = useState(0);

  const [
    showPreview,
    setShowPreview,
  ] = useState(false);

  const [
    generating,
    setGenerating,
  ] = useState(false);
    /* =======================================================
     RESIDENT DATA
  ======================================================= */

  const residentRows =
    useMemo<ResidentRow[]>(() => {
      const rows: ResidentRow[] = [];

      censusRecords.forEach(
        (data, recordIndex) => {
          data.families?.forEach(
            (family) => {
              family.members?.forEach(
                (resident, index) => {
                  const key =
                    resident.residentId ||
                    `${recordIndex}-${family.id}-${index}`;

                  const purok =
                    data.household?.purok || "";

                  rows.push({
                    key,
                    resident,
                    householdNumber:
                      data.householdNumber,
                    purok,
                    address:
                      buildAddress(purok),
                  });
                }
              );
            }
          );
        }
      );

      return rows.sort((a, b) =>
        compareResidentNames(
          a.resident,
          b.resident
        )
      );
    }, [censusRecords]);

  const filteredResidents =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return [];
      }

      return residentRows
        .filter((row) => {
          const name =
            formatResidentNaturalName(
              row.resident
            ).toLowerCase();

          return (
            name.includes(query) ||
            row.address
              .toLowerCase()
              .includes(query) ||
            row.householdNumber
              .toLowerCase()
              .includes(query)
          );
        })
        .slice(0, 30);
    }, [residentRows, search]);

  const selectedRow = useMemo(
    () =>
      residentRows.find(
        (row) =>
          row.key === selectedKey
      ) || null,
    [residentRows, selectedKey]
  );

  const selectedResident =
    selectedRow?.resident || null;

  const residentName =
    selectedResident
      ? upper(
          formatResidentNaturalName(
            selectedResident
          )
        )
      : "";

  const residentAddress =
    selectedRow?.address || "";

  const sex =
    selectedResident?.sex
      ? proper(
          selectedResident.sex
        )
      : "";

  const civilStatus =
    selectedResident?.civilStatus
      ? proper(
          selectedResident.civilStatus
        )
      : "";

  const occupation =
    selectedResident
      ?.primaryOccupation
      ?.trim() &&
    selectedResident.primaryOccupation
      .trim()
      .toLowerCase() !==
      "student"
      ? selectedResident.primaryOccupation.trim()
      : "";

  const age = selectedResident
    ? calculateAge(
        selectedResident.birthDate,
        dateIssued
      )
    : "";

  const signatory =
    SIGNATORIES[
      signatoryIndex
    ] || SIGNATORIES[0];

  /* =======================================================
     SELECT RESIDENT
  ======================================================= */

  function chooseResident(
    row: ResidentRow
  ) {
    setSelectedKey(row.key);

    setSearch(
      formatResidentNaturalName(
        row.resident
      )
    );

    const censusDisability =
      row.resident.disability?.trim() ||
      "";

    if (
      isValidDisability(
        censusDisability
      )
    ) {
      setDisability(
        censusDisability
      );
    } else {
      setDisability("");
    }

    const primaryOccupation =
      row.resident
        .primaryOccupation
        ?.trim() || "";

    if (
      primaryOccupation &&
      primaryOccupation.toLowerCase() !==
        "student"
    ) {
      setLivelihood(
        primaryOccupation
      );
    } else {
      setLivelihood("");
    }

    setRelatedPerson("");
    setRelatedPersonKey("");

    setDependentName("");
    setDependentKey("");
  }

  function chooseRelatedPerson(
    row: ResidentRow
  ) {
    setRelatedPersonKey(
      row.key
    );

    setRelatedPerson(
      formatResidentNaturalName(
        row.resident
      )
    );
  }

  function chooseDependent(
    row: ResidentRow
  ) {
    setDependentKey(row.key);

    setDependentName(
      formatResidentNaturalName(
        row.resident
      )
    );
  }

  /* =======================================================
     CERTIFICATION BODY
  ======================================================= */

  const certificationBody =
    useMemo(() => {
      if (
        !selectedResident ||
        !selectedRow
      ) {
        return "";
      }

      const legalAge =
        "of legal age";

      const finalPurpose =
        normalizePurpose(
          purpose
        ) ||
        "whatever legal purpose it may serve";

      switch (
        certificationType
      ) {
        /* -----------------------------------------------
           RELATIONSHIP
        ----------------------------------------------- */

        case "relationship":
          return (
            `This is to certify that ${residentName}, ${legalAge}, ` +
            `a resident of ${residentAddress}, is the ${relationship} of ` +
            `${upper(
              relatedPerson
            )}, a resident of this Barangay.\n\n` +
            `This certification is being made upon request of the above-name person ` +
            `for ${finalPurpose}.`
          );

        /* -----------------------------------------------
           SOLO PARENT
        ----------------------------------------------- */

        case "solo-parent":
          return (
            `This is to certify that ${residentName}, ${legalAge}` +
            `${
              sex
                ? `, ${sex.toLowerCase()}`
                : ""
            }, ` +
            `a resident of ${residentAddress} is a SOLO PARENT of this Barangay.\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for SOLO PARENT APPLICATION.`
          );

        /* -----------------------------------------------
           PWD
        ----------------------------------------------- */

        case "pwd":
          return (
            `This is to certify that ${residentName}, ${legalAge}` +
            `${
              sex
                ? `, ${sex.toLowerCase()}`
                : ""
            }, ` +
            `a resident of ${residentAddress} is a Person with Disabilities (PWD's)` +
            `${
              isValidDisability(
                disability
              )
                ? ` - ${upper(
                    disability
                  )}`
                : ""
            } of this Barangay.\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for whatever purpose it may serve best.`
          );

        /* -----------------------------------------------
           NO DEROGATORY RECORD
        ----------------------------------------------- */

        case "no-derogatory": {
          const residentOccupation =
            selectedResident
              ?.primaryOccupation
              ?.trim() || "";

          const occupationText =
            residentOccupation &&
            residentOccupation.toUpperCase() !==
              "NONE"
              ? upper(
                  residentOccupation
                )
              : "DECLARED OCCUPATION";

          const incomeText =
            incomeWords.trim() &&
            monthlyIncome.trim()
              ? `${incomeWords
                  .trim()
                  .toLowerCase()} (Php ${monthlyIncome}) per month`
              : "";

          return (
            `This is to certify that ${residentName}, ${legalAge}` +
            `${
              civilStatus
                ? `, ${civilStatus.toLowerCase()}`
                : ""
            }, and a resident of ${residentAddress} has NO DEROGATORY RECORD from this office.\n\n` +
            `This further certifies that ${residentName} is a ${occupationText}` +
            `${
              incomeText
                ? ` with monthly income of not less than ${incomeText} based on the declaration made to this office.`
                : ` based on the declaration made to this office.`
            }\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for reference and record purposes.`
          );
        }

        /* -----------------------------------------------
           GUARDIANSHIP
        ----------------------------------------------- */

        case "guardianship": {
          const dependent =
            upper(
              dependentName.trim()
            );

          return (
            `This is to certify that ${residentName}, ${legalAge}, ` +
            `a resident of ${residentAddress}, is the ${guardianRelation} of ${dependent}.\n\n` +
            `This certification is being made upon request of the above-name person ` +
            `for whatever legal purpose it may serve.`
          );
        }

        /* -----------------------------------------------
           ONE AND THE SAME PERSON
        ----------------------------------------------- */

        case "same-person":
          return (
            `This is to certify that ${residentName} and ${upper(
              alternateName
            )}` +
            `${
              sex
                ? `, ${sex.toLowerCase()}`
                : ""
            }` +
            `${
              civilStatus
                ? `, ${civilStatus.toLowerCase()}`
                : ""
            }` +
            `, ${legalAge}` +
            `${
              identificationNumber.trim()
                ? `, with Identification Card No. ${identificationNumber.trim()}` +
                  `${
                    identificationDate
                      ? ` dated ${formatLongDate(
                          identificationDate
                        )}`
                      : ""
                  }`
                : ""
            }` +
            `, and resident of Barangay Pambuhan, Mercedes, Camarines Norte ` +
            `is one and the same person.\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for ${finalPurpose}.`
          );

        /* -----------------------------------------------
           BIRTH CERTIFICATION
        ----------------------------------------------- */

        case "birth":
          return (
            `This is to certify that ${residentName}` +
            `${
              sex
                ? `, ${sex.toLowerCase()}`
                : ""
            }` +
            `${
              civilStatus
                ? `, ${civilStatus.toLowerCase()}`
                : ""
            }` +
            `, ${legalAge}` +
            `${
              identificationNumber.trim()
                ? `, with Identification Card No. ${identificationNumber.trim()}`
                : ""
            }` +
            `, and resident of Barangay Pambuhan, Mercedes, Camarines Norte ` +
            `was born on ${formatLongDate(
              selectedResident.birthDate
            )}.\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for whatever legal purposes it may serve best.`
          );

        /* -----------------------------------------------
           NO BIRTH CERTIFICATE
        ----------------------------------------------- */

        case "no-birth-certificate":
          return (
            `This is to certify that ${residentName}, ${legalAge}, ` +
            `a resident of ${residentAddress}, is known to be living in this Barangay.\n\n` +
            `This further certifies that according to the information given and records in this office, ` +
            `the above-named person has no registered Birth Certificate.\n\n` +
            `This certification is being made upon request of the above-name person ` +
            `for whatever legal purpose it may serve.`
          );

        /* -----------------------------------------------
           SENIOR CITIZEN - LOST ID
        ----------------------------------------------- */

        case "senior-lost-id":
          return (
            `This is to certify that ${residentName}, ${age} years old and original resident of ` +
            `${residentAddress} is a SENIOR CITIZEN SOCIAL PENSIONER in this Barangay.\n\n` +
            `This certifies further that the aforesaid person lost his/her ` +
            `SENIOR CITIZEN SOCIAL IDENTIFICATION/ID ${lostIdReason.trim()}.\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for whatever legal purpose it may serve.`
          );

        /* -----------------------------------------------
           BUSINESS NON-OPERATIONAL
        ----------------------------------------------- */

        case "business-non-operational":
          return (
            `This is to certify that ${residentName}, owner/proprietor of ` +
            `${upper(
              businessName
            )}, located at ${buildAddress(
              businessPurok ||
                selectedRow.purok
            )} is non-operational and is no longer conducting business operations.\n\n` +
            `This certification is being made upon request of the interested party ` +
            `for whatever purpose it may serve best.`
          );

        /* -----------------------------------------------
           MOVED OUT / RESIDENCY
        ----------------------------------------------- */

               case "moved-out":
          return (
            `This is to certify that ${residentName}, ${legalAge}, resident of ` +
            `${residentAddress}.\n\n` +

            (previousResidence.trim()
              ? `This certifies further that the aforesaid person moved out from ` +
               `${upper(previousResidence.trim())} and transferred to Pambuhan, Mercedes, Camarines Norte` +
                `${
                  transferYear.trim()
                    ? ` since ${transferYear.trim()}`
                    : ""
                }.`
              : `This certifies further that the aforesaid person moved out from ` +
                `Barangay Pambuhan, Mercedes, Camarines Norte.`) +

            `\n\nThis certification is being made upon request of the interested party ` +
            `for whatever legal purpose it may serve best.`
          );

        /* -----------------------------------------------
           LIVELIHOOD / FARMER
        ----------------------------------------------- */

       case "livelihood": {
  const livelihoodText =
    livelihood.trim() || occupation.trim();

  const hasLandInformation =
    landOwner.trim() ||
    landArea.trim() ||
    crop.trim();

  return (
    `This is to certify that ${residentName}, ${legalAge}, resident of ` +
    `${residentAddress}` +
    `${
      livelihoodText
        ? ` is a ${upper(livelihoodText)}`
        : ""
    }.\n\n` +

    (hasLandInformation
     ? `This further certify that he/she is ${
    landStatus === "owner" ? "an OWNER" : "a FARM WORKER"
  } of a parcel of land` +
        `${
          landOwner.trim() && landStatus === "farm-worker"
            ? ` owned by ${upper(landOwner)}`
            : ""
        }` +
        `${
          landArea.trim()
            ? ` with a land area of ${landArea.trim()}`
            : ""
        }` +
        ` and located at Barangay Pambuhan, Mercedes, Camarines Norte` +
        `${
          crop.trim()
            ? ` devoted to ${upper(crop)} production`
            : ""
        }.\n\n`
      : "") +

    `This certification is being made upon request of the above-mentioned name ` +
    `for reference and record.`
  );
}

        default:
          return "";
      }
    }, [
      certificationType,
      selectedResident,
      selectedRow,
      residentName,
      residentAddress,
      relationship,
      relatedPerson,
      disability,
      monthlyIncome,
      incomeWords,
      purpose,
      guardianRelation,
      dependentName,
      alternateName,
      identificationNumber,
      identificationDate,
      businessName,
      businessPurok,
      previousResidence,
      transferYear,
      landOwner,
      landArea,
      crop,
      livelihood,
      landStatus,
      lostIdReason,
      sex,
      civilStatus,
      age,
    ]);

  /* =======================================================
     VALIDATION
  ======================================================= */

  function getValidationMessage() {
    if (
      !selectedResident ||
      !selectedRow
    ) {
      return "Please select a resident first.";
    }

    switch (
      certificationType
    ) {
      case "relationship":
        if (
          !relatedPerson.trim()
        ) {
          return "Please enter or select the related person.";
        }
        break;

      case "pwd":
        if (
          !isValidDisability(
            disability
          )
        ) {
          return "Please enter the resident's disability.";
        }
        break;

      case "guardianship":
        if (
          !dependentName.trim()
        ) {
          return "Please enter or select the dependent/minor.";
        }
        break;

      case "same-person":
        if (
          !alternateName.trim()
        ) {
          return "Please enter the alternate name.";
        }
        break;

      case "birth":
        if (
          !selectedResident.birthDate
        ) {
          return "The selected resident has no birth date in the census record.";
        }

        if (
          !identificationNumber.trim()
        ) {
          return "Please enter the Identification Card No.";
        }
        break;

      case "senior-lost-id": {
        const numericAge =
          Number(age);

        if (
          !age ||
          Number.isNaN(
            numericAge
          )
        ) {
          return "The resident's age cannot be determined. Please check the birth date in the census record.";
        }

        if (
          numericAge < 60
        ) {
          return "Senior Citizen - Lost ID certification is only available for residents aged 60 years old and above.";
        }

        break;
      }

      case "business-non-operational":
        if (
          !businessName.trim()
        ) {
          return "Please enter the business name.";
        }
        break;

            case "moved-out":
        break;

      case "livelihood":
        if (
          !livelihood.trim()
        ) {
          return "Please enter the livelihood or occupation.";
        }
        break;
    }

    if (!dateIssued) {
      return "Please select the date issued.";
    }

    return "";
  }
    /* =======================================================
     PREVIEW
  ======================================================= */

  function handlePreview() {
    const validationMessage =
      getValidationMessage();

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    setShowPreview(true);
  }

  /* =======================================================
     WORD GENERATION
  ======================================================= */

  async function handleGenerateWord() {
    const validationMessage =
      getValidationMessage();

    if (validationMessage) {
      alert(validationMessage);
      return;
    }

    if (
      !selectedResident ||
      !selectedRow
    ) {
      return;
    }

    try {
      setGenerating(true);

      const response = await fetch(
        "/templates/CertificationTemplate.docx"
      );

      if (!response.ok) {
        throw new Error(
          "Certification template could not be loaded."
        );
      }

      const arrayBuffer =
        await response.arrayBuffer();

      const zip = new PizZip(
        arrayBuffer
      );

      const replacements: Record<
        string,
        string
      > = {
        certification_body:
          certificationBody,

        issuance_date:
          formatIssuanceDate(
            dateIssued
          ),

        signatory_name:
          signatory.name,

        signatory_position:
          signatory.position,

        or_number:
          orNumber.trim() ||
          "free of charge",

        date_issued:
          formatDateIssued(
            dateIssued
          ),
      };

      const xmlFiles = Object.keys(
        zip.files
      ).filter(
        (fileName) =>
          fileName.startsWith(
            "word/"
          ) &&
          fileName.endsWith(
            ".xml"
          )
      );

      xmlFiles.forEach(
        (fileName) => {
          const file =
            zip.file(fileName);

          if (!file) {
            return;
          }

          const xml =
            file.asText();

          const updatedXml =
            replacePlaceholdersInXml(
              xml,
              replacements
            );

          zip.file(
            fileName,
            updatedXml
          );
        }
      );

      const outputBlob =
        zip.generate({
          type: "blob",
          mimeType:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

      const typeLabel =
        CERTIFICATION_TYPES.find(
          (item) =>
            item.value ===
            certificationType
        )?.label ||
        "Certification";

      const fileName =
        sanitizeFilename(
          `${typeLabel} - ${residentName}`
        );

      saveAs(
        outputBlob,
        `${fileName}.docx`
      );
    } catch (error) {
      console.error(
        "Certification generation error:",
        error
      );

      alert(
        "Unable to generate the Word document. Please check the CertificationTemplate.docx file."
      );
    } finally {
      setGenerating(false);
    }
  }

  /* =======================================================
     CHANGE CERTIFICATION TYPE
  ======================================================= */

  function handleCertificationTypeChange(
    value: CertificationType
  ) {
    setCertificationType(
      value
    );

    setShowPreview(false);

    /*
      Clear fields that may contain
      information from another
      certification type.
    */

    setRelatedPerson("");
    setRelatedPersonKey("");

    setDependentName("");
    setDependentKey("");

    setAlternateName("");

    setIdentificationNumber("");
    setIdentificationDate("");

    setBusinessName("");
    setBusinessPurok("");

    setPreviousResidence("");
    setTransferYear("");

    setLandOwner("");
    setLandArea("");
    setCrop("");

    setLostIdReason(
      "and the same was never found"
    );

    /*
      Keep livelihood based on
      resident census occupation.
    */

    if (
      selectedResident
        ?.primaryOccupation
        ?.trim() &&
      selectedResident.primaryOccupation
        .trim()
        .toLowerCase() !==
        "student"
    ) {
      setLivelihood(
        selectedResident.primaryOccupation.trim()
      );
    } else {
      setLivelihood("");
    }

    /*
      Load disability again from
      census if available.
    */

    const censusDisability =
      selectedResident
        ?.disability
        ?.trim() || "";

    if (
      isValidDisability(
        censusDisability
      )
    ) {
      setDisability(
        censusDisability
      );
    } else {
      setDisability("");
    }

    /*
      Default purpose depending
      on certification.
    */

    switch (value) {
      case "solo-parent":
        setPurpose(
          "SOLO PARENT APPLICATION"
        );
        break;

      case "no-derogatory":
        setPurpose(
          "REFERENCE AND RECORD PURPOSES"
        );
        break;

      case "pwd":
        setPurpose(
          "WHATEVER PURPOSE IT MAY SERVE BEST"
        );
        break;

      case "business-non-operational":
        setPurpose(
          "WHATEVER PURPOSE IT MAY SERVE BEST"
        );
        break;

      default:
        setPurpose(
          "WHATEVER LEGAL PURPOSE IT MAY SERVE"
        );
        break;
    }
  }

  /* =======================================================
     SENIOR CITIZEN ELIGIBILITY
  ======================================================= */

  const seniorEligibilityMessage =
    useMemo(() => {
      if (
        certificationType !==
          "senior-lost-id" ||
        !selectedResident
      ) {
        return "";
      }

      const numericAge =
        Number(age);

      if (
        !age ||
        Number.isNaN(
          numericAge
        )
      ) {
        return "Senior Citizen - Lost ID certification cannot be generated because the resident's age cannot be determined.";
      }

      if (
        numericAge < 60
      ) {
        return "Senior Citizen - Lost ID certification is only available for residents aged 60 years old and above.";
      }

      return "";
    }, [
      certificationType,
      selectedResident,
      age,
    ]);

  /* =======================================================
     MAIN RESIDENT SEARCH
  ======================================================= */

  function clearSelectedResident() {
    setSearch("");
    setSelectedKey("");
    setShowPreview(false);

    setDisability("");
    setLivelihood("");

    setRelatedPerson("");
    setRelatedPersonKey("");

    setDependentName("");
    setDependentKey("");

    setIdentificationNumber("");
    setIdentificationDate("");
  }

  /* =======================================================
     PREVIEW CONTENT
  ======================================================= */

  const previewContent =
    useMemo(() => {
      if (
        !showPreview ||
        !selectedResident ||
        !selectedRow
      ) {
        return null;
      }

      if (
        certificationType ===
          "senior-lost-id" &&
        seniorEligibilityMessage
      ) {
        return (
          <div className="cert-preview-error">
            <FileText
              size={42}
            />

            <h2>
              Certification Cannot
              Be Generated
            </h2>

            <p>
              {
                seniorEligibilityMessage
              }
            </p>
          </div>
        );
      }

      return (
        <div className="cert-paper-content">
          <h1 className="cert-paper-title">
            C E R T I F I C A T I O N
          </h1>

          <div className="cert-paper-concern">
            TO WHOM IT MAY CONCERN:
          </div>

          <div className="cert-paper-body">
            {certificationBody
              .split("\n\n")
              .map(
                (
                  paragraph,
                  index
                ) => (
                  <p key={index}>
                    {paragraph}
                  </p>
                )
              )}

            <p className="cert-issued">
              Issued this{" "}
              <strong>
                {formatIssuanceDate(
                  dateIssued
                )}
              </strong>{" "}
              at Barangay Pambuhan,
              Mercedes, Camarines Norte.
            </p>
          </div>

          <div className="cert-signature-area">
            <div className="cert-certified-label">
              CERTIFIED:
            </div>

            <div className="cert-signatory">
              <strong>
                {signatory.name}
              </strong>

              <span>
                {signatory.position}
              </span>
            </div>
          </div>

          <div className="cert-paper-footer">
            <div>
              OR No. :{" "}
              {orNumber.trim() ||
                "free of charge"}
            </div>

            <div>
              Date Issued:{" "}
              {formatDateIssued(
                dateIssued
              )}
            </div>

            <div>
              *not valid without dry
              seal*
            </div>
          </div>
        </div>
      );
    }, [
      showPreview,
      selectedResident,
      selectedRow,
      certificationType,
      certificationBody,
      seniorEligibilityMessage,
      dateIssued,
      signatory,
      orNumber,
    ]);

  /* =======================================================
     CONDITIONAL FIELD HELPERS
  ======================================================= */

  const showRelationshipFields =
    certificationType ===
    "relationship";

  const showPwdFields =
    certificationType === "pwd";

  const showIncomeFields =
    certificationType ===
    "no-derogatory";

  const showGuardianshipFields =
    certificationType ===
    "guardianship";

  const showSamePersonFields =
    certificationType ===
    "same-person";

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="cert-page">
      <div className="cert-header">
        <div>
          <div>
            <h1>
              General Certification
            </h1>

            <p>
              Generate barangay
              certifications using
              census information.
            </p>
          </div>

          <FileText size={28} />
        </div>

        <button
          type="button"
          className="cert-back"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back to Documents
        </button>
      </div>

      <div className="cert-grid">
        
                {/* ===============================================
            LEFT PANEL
        =============================================== */}

        <section className="cert-card">
          <h2>
            Certification Information
          </h2>

          {/* CERTIFICATION TYPE */}

          <label className="cert-field">
            <span>
              Certification Type
            </span>

            <select
              value={
                certificationType
              }
              onChange={(e) =>
                handleCertificationTypeChange(
                  e.target
                    .value as CertificationType
                )
              }
            >
              {CERTIFICATION_TYPES.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  >
                    {item.label.toUpperCase()}
                  </option>
                )
              )}
            </select>
          </label>

          {/* MAIN RESIDENT */}

          <div className="cert-field">
            <span>Resident</span>

            <div className="cert-search">
              <Search size={17} />

              <input
                type="text"
                value={search}
                placeholder="Search resident..."
                onChange={(e) => {
                  setSearch(
                    e.target.value
                  );

                  if (
                    selectedKey
                  ) {
                    setSelectedKey(
                      ""
                    );

                    setShowPreview(
                      false
                    );
                  }
                }}
              />

              {search && (
                <button
                  type="button"
                  onClick={
                    clearSelectedResident
                  }
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {!selectedKey &&
              search.trim() && (
                <div className="cert-search-results">
                  {filteredResidents.map(
                    (row) => (
                      <button
                        type="button"
                        key={
                          row.key
                        }
                        onClick={() =>
                          chooseResident(
                            row
                          )
                        }
                      >
                        <strong>
                          {formatResidentNaturalName(
                            row.resident
                          )}
                        </strong>

                        <small>
                          {
                            row.address
                          }
                        </small>
                      </button>
                    )
                  )}

                  {!filteredResidents.length && (
                    <div className="cert-empty">
                      No resident
                      found.
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* SELECTED RESIDENT CARD */}

          {selectedResident &&
            selectedRow && (
             <div className="cert-resident-summary">
  <strong>
    {residentName}
  </strong>

  <span>
    {residentAddress}
  </span>

  <div>
    <span>
      Sex: {sex || "N/A"}
    </span>

    <span>
      Civil Status: {civilStatus || "N/A"}
    </span>

    {occupation && (
      <span>
        Occupation: {proper(occupation)}
      </span>
    )}

    <span>
      Age: {age || "N/A"}
    </span>
  </div>
</div>
            )}

          {/* ===============================================
              RELATIONSHIP
          =============================================== */}

          {showRelationshipFields && (
            <>
              <label className="cert-field">
                <span>
                  Relationship
                </span>

                <select
                  value={
                    relationship
                  }
                  onChange={(e) =>
                    setRelationship(
                      e.target.value
                    )
                  }
                >
                  <option value="son">
                    SON
                  </option>

                  <option value="daughter">
                    DAUGHTER
                  </option>

                  <option value="father">
                    FATHER
                  </option>

                  <option value="mother">
                    MOTHER
                  </option>

                  <option value="brother">
                    BROTHER
                  </option>

                  <option value="sister">
                    SISTER
                  </option>

                  <option value="husband">
                    HUSBAND
                  </option>

                  <option value="wife">
                    WIFE
                  </option>

                  <option value="grandson">
                    GRANDSON
                  </option>

                  <option value="granddaughter">
                    GRANDDAUGHTER
                  </option>
                </select>
              </label>

              <PersonSearch
                label="Related Person"
                placeholder="Search or enter name..."
                value={
                  relatedPerson
                }
                selectedKey={
                  relatedPersonKey
                }
                rows={
                  residentRows
                }
                mainResidentKey={
                  selectedKey
                }
                mainHouseholdNumber={
                  selectedRow?.householdNumber
                }
                onValueChange={(
                  value
                ) => {
                  setRelatedPerson(
                    value
                  );

                  setRelatedPersonKey(
                    ""
                  );
                }}
                onSelect={
                  chooseRelatedPerson
                }
                onClear={() => {
                  setRelatedPerson(
                    ""
                  );

                  setRelatedPersonKey(
                    ""
                  );
                }}
              />
            </>
          )}

          {/* ===============================================
              PWD
          =============================================== */}

          {showPwdFields && (
            <label className="cert-field">
              <span>
                Disability
              </span>

              <input
                type="text"
                value={
                  disability
                }
                onChange={(e) =>
                  setDisability(
                    e.target.value
                  )
                }
                placeholder="Enter disability"
              />
            </label>
          )}

          {/* ===============================================
              NO DEROGATORY RECORD
          =============================================== */}

          {showIncomeFields && (
            <>
              <label className="cert-field">
                <span>
                  Monthly Income
                </span>

                <input
                  type="text"
                  value={
                    monthlyIncome
                  }
                  onChange={(e) =>
                    setMonthlyIncome(
                      e.target.value
                    )
                  }
                  placeholder="E.G. 20000"
                />
              </label>

              <label className="cert-field">
                <span>
                  Income in Words
                </span>

                <input
                  type="text"
                  value={
                    incomeWords
                  }
                  onChange={(e) =>
                    setIncomeWords(
                      e.target.value
                    )
                  }
                  placeholder="E.G. TWENTY THOUSAND PESOS"
                />
              </label>
            </>
          )}

          {/* ===============================================
              GUARDIANSHIP
          =============================================== */}

          {showGuardianshipFields && (
            <>
              <label className="cert-field">
                <span>
                  Relationship to
                  Dependent
                </span>

                <select
                  value={
                    guardianRelation
                  }
                  onChange={(e) =>
                    setGuardianRelation(
                      e.target.value
                    )
                  }
                >
                  <option value="guardian">
                    GUARDIAN
                  </option>

                  <option value="father">
                    FATHER
                  </option>

                  <option value="mother">
                    MOTHER
                  </option>

                  <option value="grandfather">
                    GRANDFATHER
                  </option>

                  <option value="grandmother">
                    GRANDMOTHER
                  </option>
                </select>
              </label>

              <PersonSearch
                label="Dependent / Minor"
                placeholder="Search or enter name..."
                value={
                  dependentName
                }
                selectedKey={
                  dependentKey
                }
                rows={
                  residentRows
                }
                mainResidentKey={
                  selectedKey
                }
                mainHouseholdNumber={
                  selectedRow?.householdNumber
                }
                onValueChange={(
                  value
                ) => {
                  setDependentName(
                    value
                  );

                  setDependentKey(
                    ""
                  );
                }}
                onSelect={
                  chooseDependent
                }
                onClear={() => {
                  setDependentName(
                    ""
                  );

                  setDependentKey(
                    ""
                  );
                }}
              />
            </>
          )}

          {/* ===============================================
              SAME PERSON
          =============================================== */}

          {showSamePersonFields && (
            <>
              <label className="cert-field">
                <span>
                  Other / Alternate
                  Name
                </span>

                <input
                  type="text"
                  value={
                    alternateName
                  }
                  onChange={(e) =>
                    setAlternateName(
                      e.target.value
                    )
                  }
                  placeholder="Enter alternate name"
                />
              </label>

              <label className="cert-field">
                <span>
                  Identification
                  Card No.
                </span>

                <input
                  type="text"
                  value={
                    identificationNumber
                  }
                  onChange={(e) =>
                    setIdentificationNumber(
                      e.target.value
                    )
                  }
                  placeholder="ENTER IDENTIFICATION CARD NO."
                />
              </label>

              <label className="cert-field">
                <span>
                  Identification
                  Date
                </span>

                <input
                  type="date"
                  value={
                    identificationDate
                  }
                  onChange={(e) =>
                    setIdentificationDate(
                      e.target.value
                    )
                  }
                />
              </label>
            </>
          )}
                    {/* =============================================
              BIRTH CERTIFICATION
          ============================================= */}

          {certificationType === "birth" &&
            selectedResident && (
              <>
                <div className="cert-resident-summary">
                  <span>
                    Birth Date:{" "}
                    {selectedResident.birthDate
                      ? formatLongDate(
                          selectedResident.birthDate
                        )
                      : "No census data"}
                  </span>

                  <span>
                    Birth Place:{" "}
                    {selectedResident.birthPlace ||
                      "No census data"}
                  </span>
                </div>

                <label className="cert-field">
                  <span>
                    Identification Card No.
                  </span>

                  <input
                    type="text"
                    value={identificationNumber}
                    onChange={(e) =>
                      setIdentificationNumber(
                        e.target.value
                      )
                    }
                    placeholder="Enter Identification Card No."
                  />
                </label>
              </>
            )}

          {/* =============================================
              SENIOR CITIZEN - LOST ID
          ============================================= */}

          {certificationType ===
            "senior-lost-id" && (
            <label className="cert-field">
              <span>
                Reason / Circumstance
              </span>

              <textarea
                value={lostIdReason}
                onChange={(e) =>
                  setLostIdReason(
                    e.target.value
                  )
                }
                rows={3}
              />
            </label>
          )}

          {/* =============================================
              BUSINESS NON-OPERATIONAL
          ============================================= */}

          {certificationType ===
            "business-non-operational" && (
            <>
              <label className="cert-field">
                <span>
                  Business Name
                </span>

                <input
                  type="text"
                  value={businessName}
                  onChange={(e) =>
                    setBusinessName(
                      e.target.value
                    )
                  }
                  placeholder="Required"
                />
              </label>

              <label className="cert-field">
                <span>
                  Business Purok
                </span>

                <input
                  type="text"
                  value={businessPurok}
                  onChange={(e) =>
                    setBusinessPurok(
                      e.target.value
                    )
                  }
                  placeholder={`Default: ${
                    selectedRow?.purok ||
                    "resident purok"
                  }`}
                />
              </label>
            </>
          )}

          {/* =============================================
              MOVED OUT / RESIDENCY
          ============================================= */}

          {certificationType ===
            "moved-out" && (
            <>
              <label className="cert-field">
                <span>
                  Previous / Other Residence
                </span>

                <input
                  type="text"
                  value={previousResidence}
                  onChange={(e) =>
                    setPreviousResidence(
                      e.target.value
                    )
                  }
                      placeholder="Leave blank if moved out from Pambuhan"
                />
              </label>

              <label className="cert-field">
                <span>
                  Transferred Since
                </span>

                <input
                  type="text"
                  value={transferYear}
                  onChange={(e) =>
                    setTransferYear(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 2016"
                />
              </label>
            </>
          )}

          {/* =============================================
              LIVELIHOOD / FARMER
          ============================================= */}

          {certificationType ===
            "livelihood" && (
            <>
              <label className="cert-field">
                <span>
                  Livelihood / Occupation
                </span>

                <input
                  type="text"
                  value={livelihood}
                  onChange={(e) =>
                    setLivelihood(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Farmer / Hog Raiser"
                />
              </label>

              <label className="cert-field">
                <span>
                  Land Owner
                </span>

                <input
                  type="text"
                  value={landOwner}
                  onChange={(e) =>
                    setLandOwner(
                      e.target.value
                    )
                  }
                  placeholder="Optional"
                />
              </label>

              <label className="cert-field">
  <span>
    Land Status / Relationship
  </span>

  <select
    value={landStatus}
    onChange={(e) =>
      setLandStatus(
        e.target.value as "owner" | "farm-worker"
      )
    }
  >
    <option value="owner">
      OWNER
    </option>

    <option value="farm-worker">
      FARM WORKER
    </option>
  </select>
</label>

              <label className="cert-field">
                <span>
                  Land Area
                </span>

                <input
                  type="text"
                  value={landArea}
                  onChange={(e) =>
                    setLandArea(
                      e.target.value
                    )
                  }
                  placeholder="e.g. 1.9 hectares"
                />
              </label>

              <label className="cert-field">
                <span>
                  Crop / Production
                </span>

                <input
                  type="text"
                  value={crop}
                  onChange={(e) =>
                    setCrop(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Coconut"
                />
              </label>
            </>
          )}

          {/* =============================================
              PURPOSE
          ============================================= */}

          {![
            "solo-parent",
          ].includes(
            certificationType
          ) && (
            <label className="cert-field">
              <span>
                Purpose
              </span>

              <input
                type="text"
                value={purpose}
                onChange={(e) =>
                  setPurpose(
                    e.target.value
                  )
                }
                placeholder="e.g. whatever legal purpose it may serve"
              />
            </label>
          )}

          {/* =============================================
              OR NO. + DATE ISSUED
          ============================================= */}

          <div className="cert-two-columns">
            <label className="cert-field">
              <span>
                OR No.
              </span>

              <input
                type="text"
                value={orNumber}
                onChange={(e) =>
                  setOrNumber(
                    e.target.value
                  )
                }
                placeholder="Optional / N/A / FREE"
              />
            </label>

            <label className="cert-field">
              <span>
                Date Issued
              </span>

              <input
                type="date"
                value={dateIssued}
                onChange={(e) =>
                  setDateIssued(
                    e.target.value
                  )
                }
              />
            </label>
          </div>

          {/* =============================================
              SIGNATORY
          ============================================= */}

          <label className="cert-field">
            <span>
              Signatory
            </span>

            <select
              value={signatoryIndex}
              onChange={(e) =>
                setSignatoryIndex(
                  Number(
                    e.target.value
                  )
                )
              }
            >
              {SIGNATORIES.map(
                (
                  item,
                  index
                ) => (
                  <option
                    key={`${item.name}-${index}`}
                    value={index}
                  >
                    {item.name} -{" "}
                    {item.position}
                  </option>
                )
              )}
            </select>
          </label>

          {/* =============================================
              BUTTONS
          ============================================= */}

          <div className="cert-actions">
            <button
              type="button"
              className="cert-preview-button"
              disabled={
                !selectedResident
              }
              onClick={
                handlePreview
              }
            >
              Preview
            </button>

            <button
              type="button"
              className="cert-generate-button"
              disabled={
                !selectedResident ||
                generating
              }
              onClick={
                handleGenerateWord
              }
            >
              {generating
                ? "Generating..."
                : "Generate Word"}
            </button>
          </div>
        </section>

        {/* ===============================================
            RIGHT SIDE - DOCUMENT PREVIEW
        =============================================== */}

        <section className="cert-card cert-live-preview">
          <h2>
            Document Preview
          </h2>

          {!selectedResident ? (
            <div className="cert-placeholder">
              Select a resident to
              preview the
              certification.
            </div>
          ) : certificationType ===
              "senior-lost-id" &&
            seniorEligibilityMessage ? (
            <div className="cert-paper">
              <div className="cert-preview-error">
                <FileText
                  size={48}
                />

                <h3>
                  Certification Cannot Be Generated
                </h3>

                <p>
                  {seniorEligibilityMessage}
                </p>
              </div>
            </div>
          ) : (
            <div className="cert-paper">
              <h3>
                C E R T I F I C A T I O N
              </h3>

              <strong>
                TO WHOM IT MAY CONCERN:
              </strong>

              {certificationBody
                .split("\n\n")
                .filter(Boolean)
                .map(
                  (
                    paragraph,
                    index
                  ) => (
                    <p key={index}>
                      {paragraph}
                    </p>
                  )
                )}

              <p>
                Issued this{" "}
                <strong>
                  {formatIssuanceDate(
                    dateIssued
                  )}
                </strong>{" "}
                at Barangay Pambuhan,
                Mercedes, Camarines Norte.
              </p>

              <div className="cert-preview-signature">
                <small>
                  CERTIFIED:
                </small>

                <strong>
                  {signatory.name}
                </strong>

                <span>
                  {signatory.position}
                </span>
              </div>

              <div className="cert-preview-or">
                <span>
                  OR No. :{" "}
                  {orNumber ||
                    "free of charge"}
                </span>

                <span>
                  Date Issued:{" "}
                  {formatDateIssued(
                    dateIssued
                  )}
                </span>

                <span>
                  -not valid without dry seal-
                </span>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ===============================================
          PREVIEW MODAL
      =============================================== */}

      {showPreview &&
        selectedResident && (
          <div
            className="cert-modal"
            onClick={() =>
              setShowPreview(false)
            }
          >
            <div
              className="cert-modal-content"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <button
                type="button"
                className="cert-modal-close"
                onClick={() =>
                  setShowPreview(
                    false
                  )
                }
              >
                <X size={20} />
              </button>

              {previewContent}
            </div>
          </div>
        )}
    </div>
  );
}

export default Certification;
