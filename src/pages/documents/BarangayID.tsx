import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  ArrowLeft,
  CreditCard,
  Download,
  Eye,
  Search,
  UserRound,
  X,
} from "lucide-react";

import PizZip from "pizzip";
import { saveAs } from "file-saver";

import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";

import {
  formatResidentRecordName,
  formatResidentNaturalName,
  compareResidentNames,
  toProperNameCase,
  formatNameSuffix,
} from "../../utils/nameFormatter";

import {
  getLastIssuedBarangayID,
  getNextBarangayIDNumber,
} from "../../services/documentSequenceService";

import "../dashboard/dashboard.css";
import "./documents.css";
import "./barangay-id.css";

function calculateValidUntil(
  issuanceDate: string
): string {
  if (!issuanceDate) return "";

  const date = new Date(
    `${issuanceDate}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  // Based on the original Barangay ID pattern:
  // Issuance Date + 2 years - 1 month
  date.setFullYear(
    date.getFullYear() + 2
  );

  date.setMonth(
    date.getMonth() - 1
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatBarangayIDSequence(
  sequence: number
): string {
  return String(sequence).padStart(
    3,
    "0"
  );
}

type BarangayIDProps = {
  censusRecords: CensusData[];
  onBack: () => void;
};

type ResidentIDRow = {
  key: string;
  sourceResidentId: string | null;

  householdNumber: string;
  familyId: number | null;

  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;

  birthDate: string;
  birthPlace: string;
  civilStatus: string;
  sex: string;
  religion: string;
  contactNumber: string;
  height: string;
  weight: string;
  occupation: string;

  relationship: string;

  purok: string;
  street: string;
  currentAddress: string;

  barangay: string;
  municipality: string;
  province: string;
};

function proper(
  value?: string | null
): string {
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

function cleanPurok(
  value?: string | null
): string {
  if (!value) return "";

  return value
    .replace(
      /^Purok[-\s]*/i,
      ""
    )
    .trim();
}

function purokLabel(
  value?: string | null
): string {
  const cleaned =
    cleanPurok(value);

  return cleaned
    ? `Purok ${cleaned}`
    : "";
}

function formatIDDate(
  value: string
): string {
  if (!value) return "";

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${month}/${day}/${date.getFullYear()}`;
}

function formatBirthDate(
  value: string
): string {
  return formatIDDate(value);
}

function sanitizeFilename(
  value: string
): string {
  return value
    .replace(
      /[<>:"/\\|?*]/g,
      ""
    )
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .trim();
}

function escapeXml(
  value: string
): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXmlText(
  value: string
): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(
      /&quot;/g,
      '"'
    )
    .replace(
      /&apos;/g,
      "'"
    );
}

function replacePlaceholdersInXml(
  xml: string,
  replacements: Record<
    string,
    string
  >
): {
  xml: string;
  replacementCount: number;
} {
  let replacementCount = 0;

  const paragraphRegex =
    /<w:p\b[\s\S]*?<\/w:p>/g;

  const updatedXml =
    xml.replace(
      paragraphRegex,
      (paragraph) => {
        const textNodeRegex =
          /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;

        const matches = [
          ...paragraph.matchAll(
            textNodeRegex
          ),
        ];

        if (
          matches.length === 0
        ) {
          return paragraph;
        }

        const originalVisibleText =
          matches
            .map((match) =>
              decodeXmlText(
                match[1] ?? ""
              )
            )
            .join("");

        let newVisibleText =
          originalVisibleText;

        for (
          const [key, value]
          of Object.entries(
            replacements
          )
        ) {
          const placeholder =
            `{${key}}`;

          if (
            !newVisibleText.includes(
              placeholder
            )
          ) {
            continue;
          }

          const count =
            newVisibleText.split(
              placeholder
            ).length - 1;

          newVisibleText =
            newVisibleText
              .split(
                placeholder
              )
              .join(
                value ?? ""
              );

          replacementCount +=
            count;
        }

        if (
          newVisibleText ===
          originalVisibleText
        ) {
          return paragraph;
        }

        let firstNode = true;

        return paragraph.replace(
          textNodeRegex,
          (fullMatch) => {
            const openingTag =
              fullMatch.match(
                /^<w:t(?:\s[^>]*)?>/
              )?.[0] ??
              "<w:t>";

            if (firstNode) {
              firstNode = false;

              const preservedOpeningTag =
                openingTag.includes(
                  "xml:space="
                )
                  ? openingTag
                  : openingTag.replace(
                      "<w:t",
                      '<w:t xml:space="preserve"'
                    );

              return `${preservedOpeningTag}${escapeXml(
                newVisibleText
              )}</w:t>`;
            }

            return `${openingTag}</w:t>`;
          }
        );
      }
    );

  return {
    xml: updatedXml,
    replacementCount,
  };
}

function buildPresentAddress(
  resident: ResidentIDRow | null
): string {
  if (!resident) return "";

  if (
    resident.currentAddress.trim()
  ) {
    return resident.currentAddress.trim();
  }

  const parts = [
    purokLabel(
      resident.purok
    ),
    resident.street,
    resident.barangay ||
      "Barangay Pambuhan",
    resident.municipality ||
      "Mercedes",
    resident.province ||
      "Camarines Norte",
  ].filter(Boolean);

  return parts.join(", ");
}

function BarangayID({
  censusRecords,
  onBack,
}: BarangayIDProps) {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedResident,
    setSelectedResident,
  ] =
    useState<ResidentIDRow | null>(
      null
    );

  const [
    idPrefix,
    setIdPrefix,
  ] = useState("PMCN");

  const [
    idSequence,
    setIdSequence,
  ] = useState(
    formatBarangayIDSequence(1)
  );

  const [
    sequenceLoading,
    setSequenceLoading,
  ] = useState(true);

  const [
    issuanceDate,
    setIssuanceDate,
  ] = useState(today);

  const [
    validUntil,
    setValidUntil,
  ] = useState(() => {
    return calculateValidUntil(
      today
    );
  });

  const [
    emergencyResidentKey,
    setEmergencyResidentKey,
  ] = useState("");

  const [
    emergencyName,
    setEmergencyName,
  ] = useState("");

  const [
    emergencyAddress,
    setEmergencyAddress,
  ] = useState("");

  const [
    emergencyContact,
    setEmergencyContact,
  ] = useState("");

  const [
    emergencyRelation,
    setEmergencyRelation,
  ] = useState("");

  const [
    showPreview,
    setShowPreview,
  ] = useState(false);

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const residents =
    useMemo<ResidentIDRow[]>(
      () => {
        return (
          Array.isArray(
            censusRecords
          )
            ? censusRecords
            : []
        ).flatMap(
          (
            record: CensusData,
            recordIndex: number
          ) => {
            const families =
              Array.isArray(
                record?.families
              )
                ? record.families
                : [];

            return families.flatMap(
              (
                family: Family,
                familyIndex: number
              ) => {
                const members =
                  Array.isArray(
                    family?.members
                  )
                    ? family.members
                    : [];

                return members.map(
                  (
                    member: Resident,
                    memberIndex: number
                  ) => {
                    const residentId =
                      String(
                        member?.residentId ||
                          ""
                      );

                    return {
                      key:
                        residentId ||
                        `${recordIndex}-${familyIndex}-${memberIndex}`,

                      sourceResidentId:
                        residentId ||
                        null,

                      householdNumber:
                        record?.householdNumber ||
                        "",

                      familyId:
                        typeof family?.id ===
                        "number"
                          ? family.id
                          : null,

                      fullName:
                        formatResidentRecordName(
                          member
                        ),

                      firstName:
                        toProperNameCase(
                          member?.firstName
                        ),

                      middleName:
                        toProperNameCase(
                          member?.middleName
                        ),

                      lastName:
                        toProperNameCase(
                          member?.lastName
                        ),

                      suffix:
                        formatNameSuffix(
                          member?.suffix
                        ),

                      birthDate:
                        member?.birthDate ||
                        "",

                      birthPlace:
                        proper(
                          member?.birthPlace
                        ),

                      civilStatus:
                        proper(
                          member?.civilStatus
                        ),

                      sex:
                        proper(
                          member?.sex
                        ),

                      religion:
                        proper(
                          member?.religion
                        ),

                      contactNumber:
                        member?.contactNumber ||
                        "",

                      height:
                        member?.height ||
                        "",

                      weight:
                        member?.weight ||
                        "",

                      occupation:
                        proper(
                          member?.primaryOccupation
                        ),

                      relationship:
                        proper(
                          member?.familyRelationship
                        ),

                      purok:
                        proper(
                          record
                            ?.household
                            ?.purok
                        ),

                      street:
                        proper(
                          record
                            ?.household
                            ?.street
                        ),

                      currentAddress:
                        record
                          ?.household
                          ?.currentAddress ||
                        "",

                      barangay:
                        proper(
                          record
                            ?.household
                            ?.barangay
                        ) ||
                        "Barangay Pambuhan",

                      municipality:
                        proper(
                          record
                            ?.household
                            ?.municipality
                        ) ||
                        "Mercedes",

                      province:
                        proper(
                          record
                            ?.household
                            ?.province
                        ) ||
                        "Camarines Norte",
                    };
                  }
                );
              }
            );
          }
        );
      },
      [censusRecords]
    );
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

  const emergencyOptions = useMemo(() => {
    if (!selectedResident) return [];

    const sameFamily = residents.filter(
      (resident) =>
        resident.key !== selectedResident.key &&
        resident.householdNumber ===
          selectedResident.householdNumber &&
        resident.familyId === selectedResident.familyId
    );

    const sameHousehold = residents.filter(
      (resident) =>
        resident.key !== selectedResident.key &&
        resident.householdNumber ===
          selectedResident.householdNumber &&
        !sameFamily.some(
          (item) => item.key === resident.key
        )
    );

    return [...sameFamily, ...sameHousehold];
  }, [residents, selectedResident]);

  const residentName = selectedResident
    ? [
        selectedResident.firstName,
        selectedResident.middleName
          ? `${selectedResident.middleName
              .charAt(0)
              .toUpperCase()}.`
          : "",
        selectedResident.lastName,
        selectedResident.suffix,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  const presentAddress =
    buildPresentAddress(selectedResident);

  const idYear = issuanceDate
    ? new Date(
        `${issuanceDate}T00:00:00`
      ).getFullYear()
    : new Date().getFullYear();

  /*
   * SUPABASE ID SEQUENCE
   *
   * Kinukuha ang huling official Barangay ID number
   * mula sa document_sequences table.
   *
   * Halimbawa:
   * last_number = 205
   * displayed next number = 206
   *
   * Hindi nito ini-increment ang database.
   * Preview/display lamang ito.
   */
  useEffect(() => {
    let active = true;

    async function loadBarangayIDSequence() {
      try {
        setSequenceLoading(true);

        const lastIssued =
          await getLastIssuedBarangayID(idYear);

        if (!active) return;

        setIdSequence(
          formatBarangayIDSequence(
            lastIssued + 1
          )
        );
      } catch (caughtError) {
        console.error(
          "Unable to load Barangay ID sequence:",
          caughtError
        );

        if (!active) return;

        setError(
          "Unable to load the Barangay ID number from the database."
        );
      } finally {
        if (active) {
          setSequenceLoading(false);
        }
      }
    }

    void loadBarangayIDSequence();

    return () => {
      active = false;
    };
  }, [idYear]);

  const normalizedSequence =
    idSequence.trim().padStart(3, "0") || "001";

  const fullIDNumber =
    `${idPrefix.trim() || "PMCN"} ` +
    `${normalizedSequence}-${idYear}`;

  function resetMessages() {
    setMessage("");
    setError("");
  }

  function selectResident(
    resident: ResidentIDRow
  ) {
    setSelectedResident(resident);
    setSearchTerm(resident.fullName);

    setEmergencyResidentKey("");
    setEmergencyName("");
    setEmergencyAddress("");
    setEmergencyContact("");
    setEmergencyRelation("");

    setShowPreview(false);
    resetMessages();
  }

  function clearResident() {
    setSelectedResident(null);
    setSearchTerm("");

    setEmergencyResidentKey("");
    setEmergencyName("");
    setEmergencyAddress("");
    setEmergencyContact("");
    setEmergencyRelation("");

    setShowPreview(false);
    resetMessages();
  }

  function selectEmergencyContact(
    key: string
  ) {
    setEmergencyResidentKey(key);

    const person = emergencyOptions.find(
      (resident) => resident.key === key
    );

    if (!person) {
      setEmergencyName("");
      setEmergencyAddress("");
      setEmergencyContact("");
      setEmergencyRelation("");
      return;
    }

    /*
     * Natural name formatter lang ang ginagamit.
     * Tinanggal na rito ang duplicate setEmergencyName()
     * na nasa lumang BarangayID.tsx.
     */
    setEmergencyName(
      formatResidentNaturalName(
        person
      ).toUpperCase()
    );

    setEmergencyAddress(
      buildPresentAddress(
        person
      ).toUpperCase()
    );

    setEmergencyContact(
      person.contactNumber || ""
    );

    setEmergencyRelation(
      (
        person.relationship || ""
      ).toUpperCase()
    );

    resetMessages();
  }

  function validate(): boolean {
    if (!selectedResident) {
      setError(
        "Please select a resident first."
      );
      return false;
    }

    if (!idPrefix.trim()) {
      setError(
        "Please enter the Barangay ID prefix."
      );
      return false;
    }

    if (!idSequence.trim()) {
      setError(
        "Please enter the ID sequence number."
      );
      return false;
    }

    if (!issuanceDate) {
      setError(
        "Please enter the issuance date."
      );
      return false;
    }

    if (sequenceLoading) {
      setError(
        "Please wait while the official Barangay ID number is loading."
      );
      return false;
    }

    setError("");
    return true;
  }

  function openPreview() {
    if (!validate()) return;

    setMessage("");
    setShowPreview(true);
  }

  /*
   * OFFICIAL GENERATE WORD
   *
   * IMPORTANT:
   * getNextBarangayIDNumber() ang kumukuha at
   * nagre-reserve ng official number sa Supabase.
   *
   * Dahil atomic ang RPC natin, kung dalawang
   * computer ang sabay gumamit:
   *
   * Computer A -> 206
   * Computer B -> 207
   *
   * kaya hindi sila magkakaroon ng parehong
   * official Barangay ID number.
   */
  async function generateWordID() {
    if (!validate() || !selectedResident) {
      return;
    }

    setIsGenerating(true);
    resetMessages();

    try {
      /*
       * I-load muna ang Word template bago mag-reserve
       * ng official number. Kapag missing ang template,
       * hindi masasayang ang ID sequence.
       */
      const response = await fetch(
        "/templates/BarangayIDTemplate.docx",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Unable to load BarangayIDTemplate.docx (${response.status}).`
        );
      }

      const templateBuffer =
        await response.arrayBuffer();

      /*
       * DITO LANG TATAAS ANG OFFICIAL COUNTER.
       *
       * Halimbawa:
       * database last_number = 205
       *
       * RPC returns 206
       * database last_number becomes 206
       */
      const officialSequence =
        await getNextBarangayIDNumber(idYear);

      if (
        !Number.isInteger(officialSequence) ||
        officialSequence <= 0
      ) {
        throw new Error(
          "The database returned an invalid Barangay ID number."
        );
      }

      const officialSequenceText =
        formatBarangayIDSequence(
          officialSequence
        );

      const officialIDNumber =
        `${idPrefix.trim() || "PMCN"} ` +
        `${officialSequenceText}-${idYear}`;

      /*
       * Important:
       * Ang Word document ay gumagamit ng number
       * na mismong ibinalik ng Supabase.
       *
       * Hindi natin ginagamit ang lumang displayed
       * number bilang official number para maiwasan
       * ang duplicate kapag maraming computer.
       */
      setIdSequence(
        officialSequenceText
      );

      const zip = new PizZip(
        templateBuffer
      );

      const replacements: Record<
        string,
        string
      > = {
        name:
          residentName.toUpperCase(),

        id_number:
          officialIDNumber,

        present_address:
          presentAddress.toUpperCase(),

        civil_status:
          selectedResident.civilStatus.toUpperCase(),

        birth_date:
          formatBirthDate(
            selectedResident.birthDate
          ),

        birth_place:
          selectedResident.birthPlace.toUpperCase(),

        religion:
          selectedResident.religion.toUpperCase(),

        contact_number:
          selectedResident.contactNumber,

        height:
          selectedResident.height,

        weight:
          selectedResident.weight,

        occupation:
          selectedResident.occupation
            .trim()
            .toLowerCase() === "student"
            ? "NONE"
            : selectedResident.occupation.trim()
              ? selectedResident.occupation.toUpperCase()
              : "NONE",

        emergency_name:
          emergencyName.toUpperCase(),

        emergency_address:
          emergencyAddress.toUpperCase(),

        emergency_contact:
          emergencyContact,

        emergency_relation:
          emergencyRelation.toUpperCase(),

        issuance_date:
          formatIDDate(issuanceDate),

        valid_until:
          formatIDDate(validUntil),
      };

      const xmlPaths =
        Object.keys(zip.files).filter(
          (path) =>
            path.startsWith("word/") &&
            path
              .toLowerCase()
              .endsWith(".xml")
        );

      let totalReplacements = 0;

      for (const path of xmlPaths) {
        const xmlFile =
          zip.file(path);

        if (!xmlFile) continue;

        const originalXml =
          xmlFile.asText();

        const result =
          replacePlaceholdersInXml(
            originalXml,
            replacements
          );

        if (
          result.replacementCount > 0
        ) {
          zip.file(
            path,
            result.xml
          );

          totalReplacements +=
            result.replacementCount;
        }
      }

      if (totalReplacements === 0) {
        throw new Error(
          "No Barangay ID placeholders were detected in BarangayIDTemplate.docx."
        );
      }

      const output = zip.generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        compression: "DEFLATE",
      });

      const safeName =
        sanitizeFilename(
          residentName ||
            "Resident"
        );

      const safeID =
        sanitizeFilename(
          officialIDNumber
        );

      saveAs(
        output,
        `Barangay_ID_${safeID}_${safeName}.docx`
      );

      /*
       * Kunin ulit ang database value pagkatapos
       * ng successful issuance.
       *
       * Ito ay importante kung may ibang computer
       * ding nag-issue habang ginagawa ang Word file.
       */
      const latestLastIssued =
        await getLastIssuedBarangayID(
          idYear
        );

      setIdSequence(
        formatBarangayIDSequence(
          latestLastIssued + 1
        )
      );

      setMessage(
        `Barangay ID ${officialIDNumber} generated successfully. ` +
          `The next available number is ${idPrefix.trim() || "PMCN"} ` +
          `${formatBarangayIDSequence(
            latestLastIssued + 1
          )}-${idYear}.`
      );

      setShowPreview(false);
    } catch (caughtError) {
      console.error(
        "Barangay ID generation error:",
        caughtError
      );

      let text =
        "Unable to generate the Barangay ID.";

      if (
        caughtError instanceof Error
      ) {
        text += ` ${caughtError.message}`;
      }

      setError(text);

      /*
       * Refresh ang displayed sequence mula sa
       * database. Kapag nakapag-reserve na ang RPC
       * bago nagkaroon ng later Word-generation error,
       * hindi natin ire-reuse ang reserved number.
       * Mas ligtas ang gap kaysa duplicate official ID.
       */
      try {
        const latestLastIssued =
          await getLastIssuedBarangayID(
            idYear
          );

        setIdSequence(
          formatBarangayIDSequence(
            latestLastIssued + 1
          )
        );
      } catch (
        refreshError
      ) {
        console.error(
          "Unable to refresh Barangay ID sequence:",
          refreshError
        );
      }
    } finally {
      setIsGenerating(false);
    }
  }
    return (
    <main className="dashboard-main documents-page">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1>Barangay Resident ID</h1>

          <p className="dashboard-description">
            Generate Barangay Identification Cards using
            Barangay Pambuhan census records.
          </p>
        </div>

        <button
          type="button"
          className="documents-back-button"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </header>

      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <span>DOCUMENT ISSUANCE</span>
            <h2>Barangay Identification Card</h2>
          </div>

          <p>
            {residents.length} registered residents available
          </p>
        </div>

        <div className="documents-layout">
          <div className="documents-form-card">
            {/* STEP 1 */}
            <div className="documents-step">
              <span className="documents-step-number">
                1
              </span>

              <div>
                <h3>Select Resident</h3>

                <p>
                  Search the census database for the resident
                  who will receive the Barangay ID.
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
                    event.target.value !==
                      selectedResident.fullName
                  ) {
                    setSelectedResident(null);
                  }

                  resetMessages();
                }}
                placeholder="Search resident..."
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={clearResident}
                  aria-label="Clear resident"
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
                      onClick={() =>
                        selectResident(resident)
                      }
                    >
                      <div className="resident-icon">
                        <UserRound size={19} />
                      </div>

                      <div className="resident-result-info">
                        <strong>
                          {resident.fullName ||
                            "Unnamed Resident"}
                        </strong>

                        <span>
                          Household:{" "}
                          {resident.householdNumber || "—"}
                        </span>

                        <span>
                          {purokLabel(resident.purok) ||
                            "Purok not recorded"}
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
                  <strong>
                    {selectedResident.fullName}
                  </strong>

                  <span>
                    Household:{" "}
                    {selectedResident.householdNumber || "—"}
                  </span>

                  <span>
                    {presentAddress ||
                      "Address not recorded"}
                  </span>
                </div>
              </div>
            )}

            <div className="documents-divider" />

            {/* STEP 2 */}
            <div className="documents-step">
              <span className="documents-step-number">
                2
              </span>

              <div>
                <h3>ID Information</h3>

                <p>
                  The official sequence number is loaded from
                  the central database. The year follows the
                  issuance date.
                </p>
              </div>
            </div>

            <div className="documents-fields">
              <div className="barangay-id-number-grid">
                <label>
                  <span>ID Prefix</span>

                  <input
                    value={idPrefix}
                    onChange={(event) =>
                      setIdPrefix(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="PMCN"
                  />
                </label>

                <label>
                  <span>Sequence No.</span>

                  <input
                    value={
                      sequenceLoading
                        ? "Loading..."
                        : idSequence
                    }
                    readOnly
                    inputMode="numeric"
                    placeholder="001"
                  />
                </label>

                <label>
                  <span>Year</span>

                  <input
                    value={String(idYear)}
                    readOnly
                  />
                </label>
              </div>

              <div className="documents-helper">
                <strong>
                  Barangay ID Number
                </strong>

                <p>
                  {sequenceLoading
                    ? "Loading official ID number..."
                    : fullIDNumber}
                </p>
              </div>

              <div className="documents-two-columns">
                <label>
                  <span>Issuance Date</span>

                  <input
                    type="date"
                    value={issuanceDate}
                    onChange={(event) => {
                      const newIssuanceDate =
                        event.target.value;

                      setIssuanceDate(
                        newIssuanceDate
                      );

                      setValidUntil(
                        calculateValidUntil(
                          newIssuanceDate
                        )
                      );

                      resetMessages();
                    }}
                  />
                </label>

                <label>
                  <span>Valid Until</span>

                  <input
                    type="date"
                    value={validUntil}
                    onChange={(event) =>
                      setValidUntil(
                        event.target.value
                      )
                    }
                  />
                </label>
              </div>
            </div>

            <div className="documents-divider" />

            {/* STEP 3 */}
            <div className="documents-step">
              <span className="documents-step-number">
                3
              </span>

              <div>
                <h3>Emergency Contact</h3>

                <p>
                  Select a family or household member. Their
                  information will be filled automatically
                  from the census.
                </p>
              </div>
            </div>

            <div className="documents-fields">
              <label>
                <span>
                  Family / Household Member
                </span>

                <select
                  value={emergencyResidentKey}
                  onChange={(event) =>
                    selectEmergencyContact(
                      event.target.value
                    )
                  }
                  disabled={!selectedResident}
                >
                  <option value="">
                    Select emergency contact...
                  </option>

                  {emergencyOptions.map((person) => (
                    <option
                      key={person.key}
                      value={person.key}
                    >
                      {person.fullName}
                      {person.relationship
                        ? ` — ${person.relationship}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>
                  Emergency Contact Name
                </span>

                <input
                  value={emergencyName}
                  onChange={(event) =>
                    setEmergencyName(
                      event.target.value
                    )
                  }
                  placeholder="Emergency contact name"
                />
              </label>

              <label>
                <span>Address</span>

                <input
                  value={emergencyAddress}
                  onChange={(event) =>
                    setEmergencyAddress(
                      event.target.value
                    )
                  }
                  placeholder="Emergency contact address"
                />
              </label>

              <div className="documents-two-columns">
                <label>
                  <span>Contact Number</span>

                  <input
                    value={emergencyContact}
                    onChange={(event) =>
                      setEmergencyContact(
                        event.target.value
                      )
                    }
                    placeholder="09XXXXXXXXX"
                  />
                </label>

                <label>
                  <span>Relation</span>

                  <input
                    value={emergencyRelation}
                    onChange={(event) =>
                      setEmergencyRelation(
                        event.target.value
                      )
                    }
                    placeholder="Mother, Father, Spouse..."
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="documents-message documents-message-error">
                {error}
              </div>
            )}

            {message && (
              <div className="documents-message documents-message-success">
                {message}
              </div>
            )}

            <div className="documents-action-buttons">
              <button
                type="button"
                className="documents-preview-button"
                onClick={openPreview}
                disabled={
                  !selectedResident ||
                  sequenceLoading ||
                  isGenerating
                }
              >
                <Eye size={18} />
                Preview ID
              </button>

              <button
                type="button"
                className="documents-generate-button"
                onClick={generateWordID}
                disabled={
                  !selectedResident ||
                  sequenceLoading ||
                  isGenerating
                }
              >
                <Download size={18} />

                {isGenerating
                  ? "Generating Barangay ID..."
                  : sequenceLoading
                    ? "Loading ID Number..."
                    : "Generate Word ID"}
              </button>
            </div>

            <p className="documents-generate-note">
              Preview the information first. The official
              layout will come from BarangayIDTemplate.docx.
            </p>
          </div>

          {/* SUMMARY */}
          <aside className="documents-summary-card">
            <div className="documents-summary-icon">
              <CreditCard size={24} />
            </div>

            <h3>Barangay ID Summary</h3>

            <p>
              Review the resident and ID information before
              generating the Word document.
            </p>

            {selectedResident ? (
              <div className="documents-summary-list">
                <SummaryItem
                  label="ID Number"
                  value={
                    sequenceLoading
                      ? "Loading..."
                      : fullIDNumber
                  }
                />

                <SummaryItem
                  label="Resident"
                  value={residentName}
                />

                <SummaryItem
                  label="Address"
                  value={presentAddress || "—"}
                />

                <SummaryItem
                  label="Civil Status"
                  value={
                    selectedResident.civilStatus || "—"
                  }
                />

                <SummaryItem
                  label="Date of Birth"
                  value={
                    formatBirthDate(
                      selectedResident.birthDate
                    ) || "—"
                  }
                />

                <SummaryItem
                  label="Place of Birth"
                  value={
                    selectedResident.birthPlace || "—"
                  }
                />

                <SummaryItem
                  label="Contact Number"
                  value={
                    selectedResident.contactNumber || "—"
                  }
                />

                <SummaryItem
                  label="Occupation"
                  value={
                    selectedResident.occupation || "—"
                  }
                />

                <SummaryItem
                  label="Emergency Contact"
                  value={emergencyName || "—"}
                />

                <SummaryItem
                  label="Issuance Date"
                  value={
                    formatIDDate(issuanceDate) || "—"
                  }
                />

                <SummaryItem
                  label="Valid Until"
                  value={
                    formatIDDate(validUntil) || "—"
                  }
                />
              </div>
            ) : (
              <div className="documents-empty">
                Search and select a resident to prepare a
                Barangay Identification Card.
              </div>
            )}

            <div className="documents-word-info">
              <CreditCard size={18} />

              <div>
                <strong>
                  Microsoft Word ID Template
                </strong>

                <span>
                  /templates/BarangayIDTemplate.docx
                </span>
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
              className="certificate-preview-modal barangay-id-preview-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="certificate-preview-toolbar">
                <div>
                  <strong>
                    Barangay ID Preview
                  </strong>

                  <span>
                    Review the front and back information
                    before generating the Word ID.
                  </span>
                </div>

                <button
                  type="button"
                  className="certificate-preview-close"
                  onClick={() =>
                    setShowPreview(false)
                  }
                  aria-label="Close preview"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="certificate-preview-scroll">
                <div className="barangay-id-preview-sheet">
                  {/* FRONT */}
                  <div className="barangay-id-card barangay-id-front">
                    <div className="barangay-id-front-header">
                      <span>
                        Republic of the Philippines
                      </span>

                      <span>
                        Province of Camarines Norte
                      </span>

                      <span>
                        Municipality of Mercedes
                      </span>

                      <strong>
                        BARANGAY PAMBUHAN
                      </strong>
                    </div>

                    <div className="barangay-id-blue-title">
                      BARANGAY IDENTIFICATION CARD
                    </div>

                    <div className="barangay-id-number">
                      ID NO:{" "}
                      <strong>
                        {fullIDNumber}
                      </strong>
                    </div>

                    <div className="barangay-id-name">
                      {residentName.toUpperCase()}
                    </div>

                    <p className="barangay-id-certification">
                      whose picture and signature appear
                      herein is a bona fide resident of this
                      Barangay.
                    </p>

                    <div className="barangay-id-signature-line">
                      Signature of Holder
                    </div>

                    <div className="barangay-id-attested">
                      <span>
                        Attested by:
                      </span>

                      <strong>
                        HON. RAUL A. BORJAL
                      </strong>

                      <span>
                        Punong Barangay
                      </span>
                    </div>
                  </div>

                  {/* BACK */}
                  <div className="barangay-id-card barangay-id-back">
                    <PreviewRow
                      label="Present Address"
                      value={presentAddress}
                    />

                    <div className="barangay-id-three">
                      <PreviewCell
                        label="Civil Status"
                        value={
                          selectedResident.civilStatus
                        }
                      />

                      <PreviewCell
                        label="Date of Birth"
                        value={formatBirthDate(
                          selectedResident.birthDate
                        )}
                      />

                      <PreviewCell
                        label="Place of Birth"
                        value={
                          selectedResident.birthPlace
                        }
                      />
                    </div>

                    <div className="barangay-id-two">
                      <PreviewCell
                        label="Religion"
                        value={
                          selectedResident.religion
                        }
                      />

                      <PreviewCell
                        label="Contact Number"
                        value={
                          selectedResident.contactNumber
                        }
                      />
                    </div>

                    <div className="barangay-id-three">
                      <PreviewCell
                        label="Height"
                        value={
                          selectedResident.height
                        }
                      />

                      <PreviewCell
                        label="Weight"
                        value={
                          selectedResident.weight
                        }
                      />

                      <PreviewCell
                        label="Occupation"
                        value={
                          selectedResident.occupation
                            .trim()
                            .toLowerCase() ===
                          "student"
                            ? "NONE"
                            : selectedResident
                                  .occupation
                                  .trim()
                              ? selectedResident.occupation
                              : "NONE"
                        }
                      />
                    </div>

                    <div className="barangay-id-unused">
                      <span>SSS:</span>
                      <span>GSIS:</span>
                      <span>TIN:</span>
                    </div>

                    <div className="barangay-id-emergency-title">
                      In case of Emergency, you may contact:
                    </div>

                    <PreviewRow
                      label="Name"
                      value={emergencyName}
                    />

                    <PreviewRow
                      label="Address"
                      value={emergencyAddress}
                    />

                    <PreviewRow
                      label="Contact No."
                      value={emergencyContact}
                    />

                    <PreviewRow
                      label="Relation"
                      value={emergencyRelation}
                    />

                    <div className="barangay-id-dates">
                      <PreviewCell
                        label="Issuance Date"
                        value={formatIDDate(
                          issuanceDate
                        )}
                      />

                      <PreviewCell
                        label="Valid Until"
                        value={formatIDDate(
                          validUntil
                        )}
                      />
                    </div>

                    <div className="barangay-id-nontransfer">
                      THIS CARD IS NON-TRANSFERRABLE
                    </div>
                  </div>
                </div>
              </div>

              <div className="certificate-preview-actions">
                <button
                  type="button"
                  className="certificate-preview-cancel"
                  onClick={() =>
                    setShowPreview(false)
                  }
                >
                  Close
                </button>

                <button
                  type="button"
                  className="documents-generate-button"
                  onClick={generateWordID}
                  disabled={
                    isGenerating ||
                    sequenceLoading
                  }
                >
                  <Download size={18} />

                  {isGenerating
                    ? "Generating..."
                    : sequenceLoading
                      ? "Loading ID Number..."
                      : "Generate Word ID"}
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
      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}

function PreviewCell({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="barangay-id-preview-cell">
      <span>
        {label}:
      </span>

      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}

function PreviewRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="barangay-id-preview-row">
      <span>
        {label}:
      </span>

      <strong>
        {value || "—"}
      </strong>
    </div>
  );
}

export default BarangayID;