import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Search,
  UserRound,
  X,
} from "lucide-react";

import PizZip from "pizzip";
import { saveAs } from "file-saver";

import type { CensusData, Family, Resident } from "../../types/census";

import {
  formatResidentRecordName,
  formatResidentNaturalName,
  compareResidentNames,
  toProperNameCase,
  formatNameSuffix,
} from "../../utils/nameFormatter";

import "../dashboard/dashboard.css";
import "./documents.css";
import BarangayID from "./BarangayID";
import Certification from "./Certification";

type DocumentsProps = {
  censusRecords: CensusData[];
  onBackToDashboard: () => void;
};

type ResidentDocumentRow = {
  key: string;
  sourceResidentId: string | null;
  householdNumber: string;
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  sex: string;
  birthDate: string;
  civilStatus: string;
  relationship: string;
  purok: string;
  street: string;
  barangay: string;
  municipality: string;
  province: string;
  region: string;
};

type PurposeConfig = {
  value: string;
  label: string;
  needsBeneficiary?: boolean;
  needsMonthlyIncome?: boolean;
  needsAnnualIncome?: boolean;
  needsCivilStatus?: boolean;
};

const PURPOSE_OPTIONS: PurposeConfig[] = [
  {
    value: "BURIAL_ASSISTANCE",
    label: "BURIAL ASSISTANCE",
    needsBeneficiary: true,
  },
  {
    value: "FINANCIAL_ASSISTANCE",
    label: "FINANCIAL ASSISTANCE",
    needsBeneficiary: true,
  },
  {
    value: "MEDICAL_FINANCIAL_ASSISTANCE",
    label: "MEDICAL/FINANCIAL ASSISTANCE",
    needsBeneficiary: true,
  },
  {
    value: "MEDICAL_ASSISTANCE",
    label: "MEDICAL ASSISTANCE",
    needsBeneficiary: true,
  },
  {
    value: "EDUCATIONAL_ASSISTANCE",
    label: "EDUCATIONAL ASSISTANCE",
    needsMonthlyIncome: true,
  },
  {
    value: "PHILHEALTH_PURPOSES_ONLY",
    label: "PHILHEALTH PURPOSE ONLY",
  },
  {
    value: "PHILHEALTH_APPLICATION",
    label: "PHILHEALTH APPLICATION",
  },
  {
    value: "EMPLOYMENT_PURPOSES_ONLY",
    label: "EMPLOYMENT PURPOSES ONLY",
  },
  {
    value: "SOLO_PARENT_APPLICATION",
    label: "SOLO PARENT APPLICATION",
    needsMonthlyIncome: true,
  },
  {
    value: "SOLO_PARENT_ID_RENEWAL",
    label: "SOLO PARENT ID RENEWAL",
  },
  {
    value: "SPES_APPLICATION",
    label: "SPES APPLICATION",
  },
  {
    value: "SPES",
    label: "SPECIAL PROGRAM FOR EMPLOYMENT OF STUDENTS (SPES)",
    needsAnnualIncome: true,
    needsBeneficiary: true,
  },
  {
    value: "CNPGCEAP_SCHOLARSHIP",
    label: "CNPGCEAP SCHOLARSHIP",
    needsBeneficiary: true,
  },
  {
    value: "DOST_SCHOLARSHIP",
    label: "DOST SCHOLARSHIP",
    needsBeneficiary: true,
  },
  {
    value: "PGCEAP",
    label: "PGCEAP",
    needsBeneficiary: true,
  },
  {
    value: "EGASTPE",
    label: "E-GASTPE / SENIOR HIGH SCHOOL VOUCHER",
    needsBeneficiary: true,
  },
  {
    value: "RECORD_REFERENCE",
    label: "RECORD AND REFERENCE PURPOSES ONLY",
  },
  {
    value: "LEGAL_PURPOSE",
    label: "LEGAL PURPOSE",
  },
  {
    value: "GOOD_MORAL_INDIGENCY",
    label: "GOOD MORAL / INDIGENCY",
    needsCivilStatus: true,
  },
  {
    value: "CUSTOM",
    label: "CUSTOM PURPOSE",
  },
];

const SIGNATORIES = [
  { name: "HON. RAUL A. BORJAL", position: "Punong Barangay" },
  { name: "HON. BLESSY B. NAEL", position: "Barangay Kagawad" },
  { name: "HON. JUANCHO E. BABAGAY", position: "Barangay Kagawad" },
  { name: "HON. REX D. GUTIERREZ", position: "Barangay Kagawad" },
  { name: "HON. MENCHIE N. VELARDE", position: "Barangay Kagawad" },
  { name: "HON. ANTONIO A. BORJAL", position: "Barangay Kagawad" },
];

function toProperCase(value?: string | null): string {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(
      /(^|[\s.'’-])([a-zà-ÿ])/g,
      (_, separator, letter) => `${separator}${letter.toUpperCase()}`
    );
}

function cleanPurok(value?: string | null): string {
  if (!value) return "";
  return value.replace(/^Purok[-\s]*/i, "").trim();
}

function getPurokLabel(value?: string | null): string {
  const cleaned = cleanPurok(value);
  return cleaned ? `Purok-${cleaned}` : "Purok-";
}

function getOrdinal(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;

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

function formatCertificateDate(dateValue: string): string {
  if (!dateValue) return "";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const day = getOrdinal(date.getDate());

  const month = date
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();

  return `${day} day of ${month}, ${date.getFullYear()}`;
}

function formatShortDate(dateValue: string): string {
  if (!dateValue) return "";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${month}/${day}/${date.getFullYear()}`;
}

function sanitizeFilename(value: string): string {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXmlText(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function formatMoneyInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");

  if (!cleaned) return "";

  const amount = Number(cleaned);

  if (Number.isNaN(amount)) {
    return value;
  }

  return amount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function replacePlaceholdersInXml(
  xml: string,
  replacements: Record<string, string>
): {
  xml: string;
  replacementCount: number;
} {
  let replacementCount = 0;

  const paragraphRegex = /<w:p\b[\s\S]*?<\/w:p>/g;

  const updatedXml = xml.replace(paragraphRegex, (paragraph) => {
    const textNodeRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    const matches = [...paragraph.matchAll(textNodeRegex)];

    if (matches.length === 0) {
      return paragraph;
    }

    const originalVisibleText = matches
      .map((match) => decodeXmlText(match[1] ?? ""))
      .join("");

    let newVisibleText = originalVisibleText;

    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{${key}}`;

      if (!newVisibleText.includes(placeholder)) {
        continue;
      }

      const count = newVisibleText.split(placeholder).length - 1;

      newVisibleText = newVisibleText.split(placeholder).join(value);

      replacementCount += count;
    }

    if (newVisibleText === originalVisibleText) {
      return paragraph;
    }

    let firstNode = true;

    return paragraph.replace(textNodeRegex, (fullMatch) => {
      const openingTag =
        fullMatch.match(/^<w:t(?:\s[^>]*)?>/)?.[0] ?? "<w:t>";

      if (firstNode) {
        firstNode = false;

        const preservedOpeningTag = openingTag.includes("xml:space=")
          ? openingTag
          : openingTag.replace("<w:t", '<w:t xml:space="preserve"');

        return `${preservedOpeningTag}${escapeXml(newVisibleText)}</w:t>`;
      }

      return `${openingTag}</w:t>`;
    });
  });

  return {
    xml: updatedXml,
    replacementCount,
  };
}

function buildMainCertification({
  purpose,
  residentName,
  purok,
  monthlyIncome,
  annualIncome,
  beneficiary,
  civilStatus,
}: {
  purpose: string;
  residentName: string;
  purok: string;
  monthlyIncome: string;
  annualIncome: string;
  beneficiary: string;
  civilStatus: string;
}): string {
  const name = residentName.trim().toUpperCase();
  const purokLabel = getPurokLabel(purok);
  const beneficiaryName = beneficiary.trim().toUpperCase();
  const residentCivilStatus = civilStatus.trim().toLowerCase();

  const ordinaryCertification =
    `This is to certify that ${name}, of legal age, and a resident of ` +
    `${purokLabel}, Barangay Pambuhan, Mercedes, Camarines Norte belongs to ` +
    `Indigent Family of this Barangay.`;

  switch (purpose) {
    case "SOLO_PARENT_APPLICATION": {
      const income = formatMoneyInput(monthlyIncome);

      return (
        `This is to certify that ${name}, of legal age, and a resident of ` +
        `${purokLabel}, Barangay Pambuhan, Mercedes, Camarines Norte belongs to ` +
        `Indigent Family of this Barangay with average monthly income of ` +
        `Php ${income}.`
      );
    }

    case "SPES": {
      const income = formatMoneyInput(annualIncome);

      return (
        `This is to certify that ${name}, of legal age, and a resident of ` +
        `${purokLabel}, Barangay Pambuhan, Mercedes, Camarines Norte belongs to ` +
        `Indigent Family of this Barangay with an estimated average income of ` +
        `Php ${income} per annum based on the declaration made to this office.`
      );
    }

    case "EGASTPE":
      return (
        `This is to certify that ${name}, parent/guardian of ${beneficiaryName}, ` +
        `is bonafide resident of ${purokLabel} Barangay Pambuhan, Mercedes, ` +
        `Camarines Norte belongs to Indigent Family of this Barangay.`
      );

    case "GOOD_MORAL_INDIGENCY":
      return (
        `This is to certify that ${name}, of legal age, Filipino ${residentCivilStatus}, ` +
        `and a resident of ${purokLabel}, Barangay Pambuhan, Mercedes, ` +
        `Camarines Norte.`
      );

    default:
      return ordinaryCertification;
  }
}

function buildCertificateBody({
  purpose,
  customPurpose,
  relationship,
  beneficiary,
  monthlyIncome,
  schoolYear,
  residentName,
}: {
  purpose: string;
  customPurpose: string;
  relationship: string;
  beneficiary: string;
  monthlyIncome: string;
  schoolYear: string;
  residentName: string;
}): string {
  const relation = relationship.trim();
  const beneficiaryName = beneficiary.trim().toUpperCase();
  const name = residentName.trim().toUpperCase();

  const intendedFor =
    relation && beneficiaryName
      ? ` intended for ${relation}, ${beneficiaryName}`
      : beneficiaryName
        ? ` intended for ${beneficiaryName}`
        : "";

  switch (purpose) {
    case "BURIAL_ASSISTANCE":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for BURIAL ASSISTANCE${intendedFor}.`
      );

    case "FINANCIAL_ASSISTANCE":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for FINANCIAL ASSISTANCE${intendedFor}.`
      );

    case "MEDICAL_FINANCIAL_ASSISTANCE":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for MEDICAL/FINANCIAL ASSISTANCE${intendedFor}.`
      );

    case "MEDICAL_ASSISTANCE":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for MEDICAL ASSISTANCE${intendedFor}.`
      );

    case "EDUCATIONAL_ASSISTANCE": {
      const income = formatMoneyInput(monthlyIncome);

      return (
        `This further certify that the said resident belongs to a household ` +
        `with a monthly income of approximately Php ${income} based on the ` +
        `declaration made to this office.\n\n` +
        `That this certification is being made upon request of the aforesaid ` +
        `person for EDUCATIONAL ASSISTANCE.`
      );
    }

    case "PHILHEALTH_PURPOSES_ONLY":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for PHILHEALTH PURPOSE ONLY.`
      );

    case "PHILHEALTH_APPLICATION":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for PHILHEALTH APPLICATION.`
      );

    case "EMPLOYMENT_PURPOSES_ONLY":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for EMPLOYMENT PURPOSES ONLY.`
      );

    case "SOLO_PARENT_APPLICATION":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for SOLO PARENT APPLICATION.`
      );

    case "SOLO_PARENT_ID_RENEWAL":
      return (
        `That this certification is issued upon request of the aforesaid ` +
        `person for SOLO PARENT ID RENEWAL.`
      );

    case "SPES_APPLICATION":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for SPES APPLICATION.`
      );

    case "SPES":
      return (
        `That this certification is issued upon request of the concerned party ` +
        `as support to the application of ${relation} ${beneficiaryName} for ` +
        `Special Program for Employment of Students (SPES).`
      );

    case "CNPGCEAP_SCHOLARSHIP":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for CNPGCEAP SCHOLARSHIP${intendedFor}.`
      );

    case "DOST_SCHOLARSHIP":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for DOST SCHOLARSHIP${intendedFor}.`
      );

    case "PGCEAP":
      return (
        `That this certification is issued upon request of the concerned party ` +
        `as support to the application of ${relation} ${beneficiaryName} for PGCEAP.`
      );

    case "EGASTPE":
      return (
        `Further, this certification is being issued upon the request of the ` +
        `above-named person for the purpose of Senior High School Admission and ` +
        `application to the E-GASTPE Program (Senior High School Voucher Program) ` +
        `of the Department of Education for School Year ${schoolYear.trim()}.`
      );

    case "RECORD_REFERENCE":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for record and reference purposes only.`
      );

    case "LEGAL_PURPOSE":
      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for whatever legal purpose it may serve best.`
      );

    case "GOOD_MORAL_INDIGENCY":
      return (
        `This is further certify that ${name}, who is known to the undersigned, ` +
        `is a person of good character, a law-abiding citizen and has neither NO criminal ` +
        `records in this Barangay as of this date and one of the INDIGENT fellows in our community.\n\n` +
        `That this certification is being made upon request of the aforesaid person for ` +
        `whatever legal purpose it may serve best.`
      );

    case "CUSTOM": {
      const custom = customPurpose.trim();

      return (
        `That this certification is being made upon request of the ` +
        `aforesaid person for ${custom}${intendedFor}.`
      );
    }

    default:
      return "";
  }
}

function Documents({
  censusRecords,
  onBackToDashboard,
}: DocumentsProps) {
    const [documentMode, setDocumentMode] = useState<
    "indigency" | "barangay-id" | "certification"
  >("indigency");
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedResident, setSelectedResident] =
    useState<ResidentDocumentRow | null>(null);

  const [purpose, setPurpose] = useState("BURIAL_ASSISTANCE");
  const [customPurpose, setCustomPurpose] = useState("");

  const [relationship, setRelationship] = useState("");
  const [beneficiary, setBeneficiary] = useState("");

  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [schoolYear, setSchoolYear] = useState("2026-2027");

  const [issuedDate, setIssuedDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const [orNumber, setOrNumber] = useState("FREE OF CHARGE");

  const [signatoryName, setSignatoryName] =
    useState("HON. RAUL A. BORJAL");

  const [signatoryPosition, setSignatoryPosition] =
    useState("Punong Barangay");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("");
  const [generationError, setGenerationError] = useState("");

  const [showPreview, setShowPreview] = useState(false);

  const residents = useMemo<ResidentDocumentRow[]>(() => {
    return (Array.isArray(censusRecords) ? censusRecords : []).flatMap(
      (record: CensusData, recordIndex: number) => {
        const families = Array.isArray(record?.families)
          ? record.families
          : [];

        return families.flatMap((family: Family, familyIndex: number) => {
          const members = Array.isArray(family?.members)
            ? family.members
            : [];

          return members.map((member: Resident, memberIndex: number) => {
            const sourceResidentId = String(member?.residentId || "");

            return {
              key:
                sourceResidentId ||
                `${recordIndex}-${familyIndex}-${memberIndex}`,

              sourceResidentId: sourceResidentId || null,

              householdNumber: record.householdNumber || "",

              fullName: formatResidentRecordName(member),
              firstName: toProperNameCase(member?.firstName),
              middleName: toProperNameCase(member?.middleName),
              lastName: toProperNameCase(member?.lastName),
              suffix: formatNameSuffix(member?.suffix),

              sex: toProperCase(member?.sex),
              birthDate: member?.birthDate || "",
              civilStatus: toProperCase(member?.civilStatus),

              relationship: toProperCase(member?.familyRelationship),

              purok: toProperCase(record?.household?.purok),
              street: toProperCase(record?.household?.street),
              barangay: toProperCase(record?.household?.barangay),
              municipality: toProperCase(record?.household?.municipality),
              province: toProperCase(record?.household?.province),
              region: toProperCase(record?.household?.region),
            };
          });
        });
      }
    );
  }, [censusRecords]);

  const filteredResidents = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    if (!search) return [];

    return residents
      .filter((resident) => {
        const searchable = [
          resident.fullName,
          resident.householdNumber,
          resident.purok,
          resident.street,
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(search);
      })
      .sort(compareResidentNames)
      .slice(0, 20);
  }, [residents, searchTerm]);

  const selectedPurposeConfig =
    PURPOSE_OPTIONS.find((item) => item.value === purpose) ??
    PURPOSE_OPTIONS[0];

  const effectivePurpose =
    purpose === "CUSTOM"
      ? customPurpose.trim()
      : selectedPurposeConfig.label;

  const naturalResidentName = selectedResident
    ? formatResidentNaturalName(selectedResident)
    : "";

  const certificateBody = buildCertificateBody({
    purpose,
    customPurpose,
    relationship,
    beneficiary,
    monthlyIncome,
    schoolYear,
    residentName: naturalResidentName,
  });

  const mainCertification = selectedResident
    ? buildMainCertification({
        purpose,
        residentName: naturalResidentName,
        purok: selectedResident.purok,
        monthlyIncome,
        annualIncome,
        beneficiary,
        civilStatus: selectedResident.civilStatus,
      })
    : "";

  function selectResident(resident: ResidentDocumentRow) {
    setSelectedResident(resident);
    setSearchTerm(resident.fullName);
    setGenerationMessage("");
    setGenerationError("");
  }

  function clearResident() {
    setSelectedResident(null);
    setSearchTerm("");
    setGenerationMessage("");
    setGenerationError("");
    setShowPreview(false);
  }

  function handlePurposeChange(value: string) {
    setPurpose(value);

    setRelationship("");
    setBeneficiary("");
    setMonthlyIncome("");
    setAnnualIncome("");

    if (value === "EGASTPE") {
      setSchoolYear("2026-2027");
    }

    setGenerationMessage("");
    setGenerationError("");
  }

  function handleSignatoryChange(name: string) {
    setSignatoryName(name);

    const official = SIGNATORIES.find((item) => item.name === name);

    if (official) {
      setSignatoryPosition(official.position);
    }
  }

  function validateCertificate(): boolean {
    if (!selectedResident) {
      setGenerationError("Please select a resident first.");
      return false;
    }

    if (!effectivePurpose.trim()) {
      setGenerationError("Please enter the purpose of the certificate.");
      return false;
    }

    if (
      selectedPurposeConfig.needsMonthlyIncome &&
      !monthlyIncome.trim()
    ) {
      setGenerationError("Please enter the household monthly income.");
      return false;
    }

    if (
      selectedPurposeConfig.needsAnnualIncome &&
      !annualIncome.trim()
    ) {
      setGenerationError("Please enter the household annual income.");
      return false;
    }

    if (
      selectedPurposeConfig.needsBeneficiary &&
      purpose !== "MEDICAL_FINANCIAL_ASSISTANCE" &&
      !beneficiary.trim()
    ) {
      setGenerationError("Please enter the beneficiary name.");
      return false;
    }

    if (
      selectedPurposeConfig.needsCivilStatus &&
      !selectedResident.civilStatus.trim()
    ) {
      setGenerationError(
        "Civil status is required for GOOD MORAL / INDIGENCY."
      );
      return false;
    }

    if (purpose === "EGASTPE" && !schoolYear.trim()) {
      setGenerationError("Please enter the school year.");
      return false;
    }

    setGenerationError("");
    return true;
  }

  function openPreview() {
    if (!validateCertificate()) {
      return;
    }

    setGenerationMessage("");
    setShowPreview(true);
  }

  async function generateWordCertificate() {
    if (!validateCertificate()) {
      return;
    }

    setIsGenerating(true);
    setGenerationMessage("");
    setGenerationError("");

    try {
      const response = await fetch("/templates/IndigencyV2.docx", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `Unable to load Word template (${response.status}).`
        );
      }

      const templateBuffer = await response.arrayBuffer();
      const zip = new PizZip(templateBuffer);

      const replacements: Record<string, string> = {
        main_certification: mainCertification,
        certificate_body: certificateBody,
        issue_date: `${formatCertificateDate(issuedDate)} `,
        signatory: signatoryName.trim().toUpperCase(),
        position: signatoryPosition.trim(),
        or_number: orNumber.trim() || "FREE OF CHARGE",
        date_issued: formatShortDate(issuedDate),
      };

      const xmlPaths = Object.keys(zip.files).filter(
        (path) =>
          path.startsWith("word/") &&
          path.toLowerCase().endsWith(".xml")
      );

      let totalReplacements = 0;

      for (const path of xmlPaths) {
        const xmlFile = zip.file(path);

        if (!xmlFile) continue;

        const originalXml = xmlFile.asText();

        const result = replacePlaceholdersInXml(
          originalXml,
          replacements
        );

        if (result.replacementCount > 0) {
          zip.file(path, result.xml);
          totalReplacements += result.replacementCount;
        }
      }

      if (totalReplacements === 0) {
        throw new Error(
          "No placeholders were detected in IndigencyV2.docx."
        );
      }

      const output = zip.generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
      });

      const safeResidentName = sanitizeFilename(
        naturalResidentName || "Resident"
      );

      const safeDate =
        issuedDate || new Date().toISOString().slice(0, 10);

      const filename =
        `Certificate_of_Indigency_${safeResidentName}_${safeDate}.docx`;

      saveAs(output, filename);

      setGenerationMessage(
        `Certificate generated successfully. ${totalReplacements} field(s) were replaced.`
      );

      setShowPreview(false);
    } catch (error) {
      console.error("Certificate generation error:", error);

      let message = "Unable to generate the Word certificate.";

      if (error instanceof Error) {
        message += ` ${error.message}`;
      }

      setGenerationError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  if (documentMode === "barangay-id") {
  return (
    <BarangayID
      censusRecords={censusRecords}
      onBack={() => setDocumentMode("indigency")}
    />
  );
}

if (documentMode === "certification") {
  return (
    <Certification
      censusRecords={censusRecords}
      onBack={() => setDocumentMode("indigency")}
    />
  );
}

  return (
    <main className="dashboard-main documents-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1>Documents & Certificates</h1>

          <p className="dashboard-description">
            Generate official Certificates of Indigency using Barangay
            Pambuhan census records.
          </p>
        </div>

        <button
          type="button"
          className="documents-back-button"
          onClick={onBackToDashboard}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </header>

      <section className="dashboard-section">
        <div className="section-heading">
  <div>
    <span>DOCUMENT ISSUANCE</span>
    <h2>Certificate of Indigency</h2>
  </div>

  <div className="documents-heading-actions">
    <p>{residents.length} registered residents available</p>

    <button
      type="button"
      className="documents-id-button"
      onClick={() => setDocumentMode("barangay-id")}
    >
      Barangay Resident ID
    </button>

<button
  type="button"
  className="documents-id-button"
  onClick={() => setDocumentMode("certification")}
>
  General Certification
</button>

  </div>
</div>

        <div className="documents-layout">
          <div className="documents-form-card">
            <div className="documents-step">
              <span className="documents-step-number">1</span>

              <div>
                <h3>Select Resident</h3>

                <p>
                  Search the census database by resident name,
                  household number, purok, or street.
                </p>
              </div>
            </div>

            <div className="resident-search">
              <Search size={18} />

              <input
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);

                  if (
                    selectedResident &&
                    event.target.value !== selectedResident.fullName
                  ) {
                    setSelectedResident(null);
                  }

                  setGenerationMessage("");
                  setGenerationError("");
                }}
                placeholder="Search resident..."
              />

              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearResident}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {!selectedResident && searchTerm && (
              <div className="resident-results">
                {filteredResidents.length === 0 ? (
                  <div className="documents-empty">
                    No resident found.
                  </div>
                ) : (
                  filteredResidents.map((resident) => (
                    <button
                      key={resident.key}
                      type="button"
                      className="resident-result"
                      onClick={() => selectResident(resident)}
                    >
                      <div className="resident-icon">
                        <UserRound size={19} />
                      </div>

                      <div className="resident-result-info">
                        <strong>
                          {resident.fullName || "Unnamed Resident"}
                        </strong>

                        <span>
                          Household:{" "}
                          {resident.householdNumber || "—"}
                        </span>

                        <span>
                          {getPurokLabel(resident.purok)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedResident && (
              <div className="selected-resident">
                <div className="selected-resident-icon">
                  <UserRound size={22} />
                </div>

                <div>
                  <strong>{selectedResident.fullName}</strong>

                  <span>
                    Household:{" "}
                    {selectedResident.householdNumber || "—"}
                  </span>

                  <span>
                    {getPurokLabel(selectedResident.purok)},
                    Barangay Pambuhan, Mercedes, Camarines Norte
                  </span>
                </div>
              </div>
            )}

            <div className="documents-divider" />

            <div className="documents-step">
              <span className="documents-step-number">2</span>

              <div>
                <h3>Certificate Details</h3>

                <p>
                  Select the type of Certificate of Indigency and
                  complete the required information.
                </p>
              </div>
            </div>

            <div className="documents-fields">
              <label>
                <span>Type / Purpose of Indigency</span>

                <select
                  value={purpose}
                  onChange={(event) =>
                    handlePurposeChange(event.target.value)
                  }
                >
                  {PURPOSE_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              {purpose === "CUSTOM" && (
                <label>
                  <span>Custom Purpose</span>

                  <input
                    value={customPurpose}
                    onChange={(event) =>
                      setCustomPurpose(event.target.value)
                    }
                    placeholder="Enter certificate purpose..."
                  />
                </label>
              )}

              {selectedPurposeConfig.needsBeneficiary && (
                <>
                  <div className="documents-helper">
                    <strong>Beneficiary Information</strong>

                    <p>
                      Complete these fields when the assistance or
                      application is intended for another person.
                    </p>
                  </div>

                  {purpose === "EGASTPE" ? (
                    <label>
                      <span>Student / Beneficiary Name</span>

                      <input
                        value={beneficiary}
                        onChange={(event) =>
                          setBeneficiary(event.target.value)
                        }
                        placeholder="Example: Latisha Mae S. Babagay"
                      />
                    </label>
                  ) : (
                    <div className="documents-two-columns">
                      <label>
                        <span>Relationship</span>

                        <input
                          value={relationship}
                          onChange={(event) =>
                            setRelationship(event.target.value)
                          }
                          placeholder={
                            purpose === "BURIAL_ASSISTANCE"
                              ? "Example: her deceased father"
                              : purpose === "SPES"
                                ? "Example: his son"
                                : purpose ===
                                      "CNPGCEAP_SCHOLARSHIP" ||
                                    purpose ===
                                      "DOST_SCHOLARSHIP" ||
                                    purpose === "PGCEAP"
                                  ? "Example: her son"
                                  : purpose ===
                                        "FINANCIAL_ASSISTANCE" ||
                                      purpose ===
                                        "MEDICAL_FINANCIAL_ASSISTANCE" ||
                                      purpose ===
                                        "MEDICAL_ASSISTANCE"
                                    ? "Example: her mother"
                                    : "Example: her mother"
                          }
                        />
                      </label>

                      <label>
                        <span>Beneficiary Name</span>

                        <input
                          value={beneficiary}
                          onChange={(event) =>
                            setBeneficiary(event.target.value)
                          }
                          placeholder="Example: Juan Dela Cruz"
                        />
                      </label>
                    </div>
                  )}
                </>
              )}

              {selectedPurposeConfig.needsCivilStatus &&
                selectedResident && (
                  <div className="documents-helper">
                    <strong>Civil Status</strong>
                    <p>
                      {selectedResident.civilStatus ||
                        "No civil status recorded for this resident."}
                    </p>
                  </div>
                )}

              {selectedPurposeConfig.needsMonthlyIncome && (
                <label>
                  <span>Household Monthly Income</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyIncome}
                    onChange={(event) =>
                      setMonthlyIncome(event.target.value)
                    }
                    placeholder="Example: 9000"
                  />
                </label>
              )}

              {selectedPurposeConfig.needsAnnualIncome && (
                <label>
                  <span>Household Annual Income</span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={annualIncome}
                    onChange={(event) =>
                      setAnnualIncome(event.target.value)
                    }
                    placeholder="Example: 50000"
                  />
                </label>
              )}

              {purpose === "EGASTPE" && (
                <label>
                  <span>School Year</span>

                  <input
                    type="text"
                    value={schoolYear}
                    onChange={(event) =>
                      setSchoolYear(event.target.value)
                    }
                    placeholder="Example: 2026-2027"
                  />
                </label>
              )}

              <div className="documents-two-columns">
                <label>
                  <span>Issue Date</span>

                  <input
                    type="date"
                    value={issuedDate}
                    onChange={(event) =>
                      setIssuedDate(event.target.value)
                    }
                  />
                </label>

                <label>
                  <span>OR No.</span>

                  <input
                    value={orNumber}
                    onChange={(event) =>
                      setOrNumber(event.target.value)
                    }
                    placeholder="FREE OF CHARGE"
                  />
                </label>
              </div>

              <label>
                <span>Signatory</span>

                <select
                  value={signatoryName}
                  onChange={(event) =>
                    handleSignatoryChange(event.target.value)
                  }
                >
                  {SIGNATORIES.map((official) => (
                    <option
                      key={official.name}
                      value={official.name}
                    >
                      {official.name} — {official.position}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Signatory Position</span>

                <input
                  value={signatoryPosition}
                  onChange={(event) =>
                    setSignatoryPosition(event.target.value)
                  }
                />
              </label>
            </div>

            {generationError && (
              <div className="documents-message documents-message-error">
                {generationError}
              </div>
            )}

            {generationMessage && (
              <div className="documents-message documents-message-success">
                {generationMessage}
              </div>
            )}

            <div className="documents-action-buttons">
              <button
                type="button"
                className="documents-preview-button"
                onClick={openPreview}
                disabled={!selectedResident}
              >
                <Eye size={18} />
                Preview Certificate
              </button>

              <button
                type="button"
                className="documents-generate-button"
                onClick={generateWordCertificate}
                disabled={!selectedResident || isGenerating}
              >
                <Download size={18} />

                {isGenerating
                  ? "Generating Word Certificate..."
                  : "Generate Word Certificate"}
              </button>
            </div>

            <p className="documents-generate-note">
              Preview the certificate first. A Word file will only be
              downloaded when you click Generate Word Certificate.
            </p>
          </div>

          <aside className="documents-summary-card">
            <div className="documents-summary-icon">
              <FileText size={24} />
            </div>

            <h3>Certificate Summary</h3>

            <p>
              Review the information before previewing or generating
              the Word document.
            </p>

            {selectedResident ? (
              <div className="documents-summary-list">
                <SummaryItem
                  label="Document"
                  value="Certificate of Indigency"
                />

                <SummaryItem
                  label="Resident"
                  value={selectedResident.fullName}
                />

                <SummaryItem
                  label="Household"
                  value={selectedResident.householdNumber || "—"}
                />

                <SummaryItem
                  label="Purok"
                  value={getPurokLabel(selectedResident.purok)}
                />

                <SummaryItem
                  label="Purpose"
                  value={effectivePurpose || "—"}
                />

                {selectedPurposeConfig.needsCivilStatus && (
                  <SummaryItem
                    label="Civil Status"
                    value={selectedResident.civilStatus || "—"}
                  />
                )}

                {selectedPurposeConfig.needsBeneficiary && (
                  <>
                    {purpose !== "EGASTPE" && (
                      <SummaryItem
                        label="Relationship"
                        value={relationship || "—"}
                      />
                    )}

                    <SummaryItem
                      label={
                        purpose === "EGASTPE"
                          ? "Student / Beneficiary"
                          : "Beneficiary"
                      }
                      value={beneficiary || "—"}
                    />
                  </>
                )}

                {selectedPurposeConfig.needsMonthlyIncome && (
                  <SummaryItem
                    label="Monthly Income"
                    value={
                      monthlyIncome
                        ? `Php ${formatMoneyInput(monthlyIncome)}`
                        : "—"
                    }
                  />
                )}

                {selectedPurposeConfig.needsAnnualIncome && (
                  <SummaryItem
                    label="Annual Income"
                    value={
                      annualIncome
                        ? `Php ${formatMoneyInput(annualIncome)}`
                        : "—"
                    }
                  />
                )}

                {purpose === "EGASTPE" && (
                  <SummaryItem
                    label="School Year"
                    value={schoolYear || "—"}
                  />
                )}

                <SummaryItem
                  label="Issue Date"
                  value={formatCertificateDate(issuedDate) || "—"}
                />

                <SummaryItem
                  label="OR No."
                  value={orNumber || "—"}
                />

                <SummaryItem
                  label="Signatory"
                  value={signatoryName}
                />

                <SummaryItem
                  label="Position"
                  value={signatoryPosition}
                />
              </div>
            ) : (
              <div className="documents-empty">
                Search and select a resident to prepare a Certificate
                of Indigency.
              </div>
            )}

            <div className="documents-word-info">
              <FileText size={18} />

              <div>
                <strong>Microsoft Word Template V2</strong>
                <span>/templates/IndigencyV2.docx</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {showPreview &&
        selectedResident &&
        createPortal(
          <div
            className="certificate-preview-overlay"
            onClick={() => setShowPreview(false)}
          >
            <div
              className="certificate-preview-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="certificate-preview-toolbar">
                <div>
                  <strong>Certificate Preview</strong>

                  <span>
                    Review the certificate before generating the Word
                    file.
                  </span>
                </div>

                <button
                  type="button"
                  className="certificate-preview-close"
                  onClick={() => setShowPreview(false)}
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="certificate-preview-scroll">
                <div className="simple-certificate-preview">
                  <div className="simple-preview-heading">
                    <span>Republic of the Philippines</span>
                    <span>Province of Camarines Norte</span>
                    <span>Municipality of Mercedes</span>
                    <strong>BARANGAY PAMBUHAN</strong>
                    <span>Office of the Sangguniang Barangay</span>
                  </div>

                  <div className="simple-preview-divider" />

                  <h1>CERTIFICATE OF INDIGENCY</h1>

                  <div className="simple-preview-wording">
                    <p>{mainCertification}</p>

                    {certificateBody
                      .split("\n\n")
                      .filter(Boolean)
                      .map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}

                    <p>
                      Issued this {formatCertificateDate(issuedDate)} at
                      Barangay Pambuhan, Mercedes, Camarines Norte.
                    </p>
                  </div>

                  <div className="simple-preview-signatory">
                    <span>CERTIFIED:</span>

                    <strong>{signatoryName.toUpperCase()}</strong>

                    <span>{signatoryPosition}</span>
                  </div>

                  <div className="simple-preview-details">
                    <div>
                      <span>OR No.</span>
                      <strong>
                        {orNumber || "FREE OF CHARGE"}
                      </strong>
                    </div>

                    <div>
                      <span>Date Issued</span>
                      <strong>
                        {formatShortDate(issuedDate)}
                      </strong>
                    </div>
                  </div>

                  <div className="simple-preview-note">
                    Preview only — the official design and formatting
                    will be applied to the generated Microsoft Word
                    certificate.
                  </div>
                </div>
              </div>

              <div className="certificate-preview-actions">
                <button
                  type="button"
                  className="certificate-preview-cancel"
                  onClick={() => setShowPreview(false)}
                >
                  Close Preview
                </button>

                <button
                  type="button"
                  className="documents-generate-button"
                  onClick={() => {
                    void generateWordCertificate();
                  }}
                  disabled={isGenerating}
                >
                  <Download size={18} />

                  {isGenerating
                    ? "Generating..."
                    : "Generate Word Certificate"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </main>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="documents-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default Documents;
