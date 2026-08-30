import { useEffect, useRef, useState } from "react";
import "../../App.css";
import {
  House,
  UsersRound,
  Info,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import type {
  Resident,
  Family,
  CensusData,
} from "../../types/census";

type ResidentWithIdentity = Resident & {
  residentId?: string;
};

function generateHouseholdNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");

  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().split("-")[0].toUpperCase()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
          .slice(-8)
          .toUpperCase();

  return `HH-${datePart}-${randomPart}`;
}

function generateHouseNumber(householdNumber: string): string {
  return `HOUSE-${householdNumber.replace(/^HH-/, "")}`;
}

function getResidentId(member: Resident): string {
  return String((member as ResidentWithIdentity).residentId || "");
}

function makeResidentId(
  householdNumber: string,
  sequence: number
): string {
  return `${householdNumber}-R${String(sequence).padStart(3, "0")}`;
}

const createResident = (): Resident => ({
  firstName: "",
  middleName: "",
  lastName: "",
  suffix: "",

  birthDate: "",
  height: "",
  weight: "",
  birthPlace: "",
  sex: "",
  civilStatus: "",

  contactNumber: "",
  email: "",

  education: "",
  schoolStatus: "",
  schoolLevel: "",

  elementarySchool: "",
  juniorHighSchool: "",
  seniorHighSchool: "",
  collegeUniversity: "",
  postgraduateSchool: "",

  shsStrand: "",
  course: "",
  specialization: "",
  osyReason: "",
  osyOtherReason: "",

  primaryOccupation: "",
  secondaryOccupations: [],
  employmentStatus: "",
  employer: "",
  monthlyIncome: "",

  skills: "",

  voterStatus: "",
  nationality: "",
  religion: "",
  fourPsMember: "",
  disability: "",
  seniorCitizen: "",

  hasOwnFamily: "",

  familyMemberName: "",
familyRelationship: "",
familyMemberStatus: "",
residentId: "",
} as Resident);
function calculateAge(birthDate: string): number | "" {
  if (!birthDate) return "";

  const birth = new Date(birthDate + "T00:00:00");
  const today = new Date();

  if (Number.isNaN(birth.getTime())) {
    return "";
  }

  let age =
    today.getFullYear() -
    birth.getFullYear();

  const monthDifference =
    today.getMonth() -
    birth.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() < birth.getDate()
    )
  ) {
    age--;
  }

  return age >= 0 ? age : "";
}


function updateBirthDatePart(
  birthDate: string,
  part: "month" | "day" | "year",
  value: string
): string {

  const parts = birthDate
    ? birthDate.split("-")
    : ["", "", ""];

  let year = parts[0] || "";
  let month = parts[1] || "";
  let day = parts[2] || "";

  if (part === "year") {
    year = value;
  }

  if (part === "month") {
    month = value;
  }

  if (part === "day") {
    day = value;
  }

  if (!year && !month && !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}


const createFamily = (
  id: number,
  linkedResidentKey: string | null = null
): Family => ({
  id,
  familyName: "",
  linkedResidentKey,
 members: [createResident()],
});

type HouseholdPrototypeProps = {
  onSubmitCensus: (data: CensusData) => void;
};

function HouseholdPrototype({
  onSubmitCensus,
}: HouseholdPrototypeProps) {

  const [censusStep, setCensusStep] = useState<
  "household" | "family" | "resident" | "review"
>("household");

  /* =====================================================
     HOUSEHOLD INFORMATION
  ===================================================== */

  const [householdNumber] = useState(() =>
    generateHouseholdNumber()
  );

  const [houseNumber] = useState(() =>
    generateHouseNumber(householdNumber)
  );

  const [street, setStreet] =
    useState("");

  const [purok, setPurok] =
    useState("");

  const [region, setRegion] = useState("");
const [province, setProvince] = useState("");
const [municipality, setMunicipality] = useState("");
const [barangay, setBarangay] = useState("");

const [regions, setRegions] = useState<any[]>([]);
const [provinces, setProvinces] = useState<any[]>([]);
const [municipalities, setMunicipalities] = useState<any[]>([]);
const [barangays, setBarangays] = useState<any[]>([]);

useEffect(() => {
  fetch("https://psgc.gitlab.io/api/regions/")
    .then((response) => response.json())
    .then((data) => setRegions(data))
    .catch((error) =>
      console.error("Error loading regions:", error)
    );
}, []);

useEffect(() => {
  if (!region) {
    setProvinces([]);
    setProvince("");
    setMunicipalities([]);
    setMunicipality("");
    setBarangays([]);
    setBarangay("");
    return;
  }

  fetch(
    `https://psgc.gitlab.io/api/regions/${region}/provinces/`
  )
    .then((response) => response.json())
    .then((data) => setProvinces(data))
    .catch((error) =>
      console.error("Error loading provinces:", error)
    );

  setProvince("");
  setMunicipality("");
  setBarangay("");
  setMunicipalities([]);
  setBarangays([]);
}, [region]);

useEffect(() => {
  if (!province) {
    setMunicipalities([]);
    setMunicipality("");
    setBarangays([]);
    setBarangay("");
    return;
  }

  fetch(
    `https://psgc.gitlab.io/api/provinces/${province}/municipalities/`
  )
    .then((response) => response.json())
    .then((data) => setMunicipalities(data))
    .catch((error) =>
      console.error("Error loading municipalities:", error)
    );

  setMunicipality("");
  setBarangay("");
  setBarangays([]);
}, [province]);

useEffect(() => {
  if (!municipality) {
    setBarangays([]);
    setBarangay("");
    return;
  }

  fetch(
    `https://psgc.gitlab.io/api/municipalities/${municipality}/barangays/`
  )
    .then((response) => response.json())
    .then((data) => setBarangays(data))
    .catch((error) =>
      console.error("Error loading barangays:", error)
    );

  setBarangay("");
}, [municipality]);

  const [yearsInBarangay, setYearsInBarangay] =
    useState("");

  const [previousAddress, setPreviousAddress] =
    useState("");

  const [currentAddress, setCurrentAddress] =
  useState("");

  useEffect(() => {
  const selectedRegion =
    regions.find((item) => item.code === region)?.name || "";

  const selectedProvince =
    provinces.find((item) => item.code === province)?.name || "";

  const selectedMunicipality =
    municipalities.find(
      (item) => item.code === municipality
    )?.name || "";

  const selectedBarangay =
    barangays.find(
      (item) => item.code === barangay
    )?.name || "";

  const addressParts = [
    selectedRegion,
    selectedProvince,
    selectedMunicipality,
    selectedBarangay,
    purok,
    street,
  ].filter(Boolean);

  setCurrentAddress(addressParts.join(", "));
}, [
  region,
  province,
  municipality,
  barangay,
  purok,
  street,
  regions,
  provinces,
  municipalities,
  barangays,
]);

    const [validationError, setValidationError] =
  useState("");

  const [validationFields, setValidationFields] =
  useState<Record<string, boolean>>({});

  /* =====================================================
     FAMILY DATA
  ===================================================== */

  const [families, setFamilies] = useState<Family[]>([
    createFamily(1),
  ]);

  const [activeFamilyIndex, setActiveFamilyIndex] = useState(0);

  const [activeMemberIndex, setActiveMemberIndex] = useState(0);

  const [isMemberEditorOpen, setIsMemberEditorOpen] =
  useState(false);

const addMemberLockRef = useRef(false);

const finalSubmitButtonRef = useRef<HTMLButtonElement | null>(null);
const residentNavLockRef = useRef(false);
const [expandedReviewFamilyIndex, setExpandedReviewFamilyIndex] = useState<number | null>(null);

const runResidentNavigation = (action: () => void) => {
  if (residentNavLockRef.current) {
    return;
  }

  residentNavLockRef.current = true;
  action();

  window.setTimeout(() => {
    residentNavLockRef.current = false;
  }, 450);
};

  const addFamilyMember = (familyIndex: number) => {
  if (addMemberLockRef.current) {
    return;
  }

  const targetFamily = families[familyIndex];

  if (!targetFamily) {
    return;
  }

  addMemberLockRef.current = true;

  const newMemberIndex = targetFamily.members.length;

  setFamilies((current) => {
    const updated = [...current];
    const family = updated[familyIndex];

    if (!family) {
      return current;
    }

    updated[familyIndex] = {
      ...family,
      members: [
        ...family.members,
        createResident(),
      ],
    };

    return updated;
  });

  setActiveMemberIndex(newMemberIndex);
  setIsMemberEditorOpen(true);

  window.setTimeout(() => {
    addMemberLockRef.current = false;
  }, 400);
};

useEffect(() => {
  setFamilies((current) => {
    let changed = false;
    const updated = current.map((family) => ({
      ...family,
      members: family.members.map((member) => ({ ...member })),
    }));

    let maxSequence = 0;

    updated.forEach((family) => {
      family.members.forEach((member) => {
        const residentId = getResidentId(member);
        const match = residentId.match(/-R(\d+)$/);

        if (match) {
          maxSequence = Math.max(maxSequence, Number(match[1]));
        }
      });
    });

    let nextSequence = maxSequence + 1;

    updated.forEach((family) => {
      family.members.forEach((member, memberIndex) => {
        const isLinkedHead = Boolean(
          family.linkedResidentKey && memberIndex === 0
        );

        if (!isLinkedHead && !getResidentId(member)) {
          (member as ResidentWithIdentity).residentId =
            makeResidentId(householdNumber, nextSequence);
          nextSequence += 1;
          changed = true;
        }
      });
    });

    updated.forEach((family) => {
      if (!family.linkedResidentKey || family.members.length === 0) {
        return;
      }

      const [sourceFamilyIdText, sourceMemberIndexText] =
        family.linkedResidentKey.split("-");

      const sourceFamilyId = Number(sourceFamilyIdText);
      const sourceMemberIndex = Number(sourceMemberIndexText);
      const sourceFamily = updated.find(
        (familyItem) => familyItem.id === sourceFamilyId
      );
      const sourceResident = sourceFamily?.members[sourceMemberIndex];

      if (!sourceResident) {
        return;
      }

      if (!getResidentId(sourceResident)) {
        (sourceResident as ResidentWithIdentity).residentId =
          makeResidentId(householdNumber, nextSequence);
        nextSequence += 1;
        changed = true;
      }

      const syncedHead = {
        ...sourceResident,
        residentId: getResidentId(sourceResident),
        familyRelationship: "Family Head",
        hasOwnFamily: "",
      } as ResidentWithIdentity;

      const currentHead = family.members[0] as ResidentWithIdentity;

      if (JSON.stringify(currentHead) !== JSON.stringify(syncedHead)) {
        family.members[0] = syncedHead as Resident;
        changed = true;
      }
    });

    return changed ? updated : current;
  });
}, [families, householdNumber]);


  /* =====================================================
     FAMILY MEMBER COUNT
     
     IMPORTANT:
     There is NO plus/minus button.
     The user types the number directly.
  ===================================================== */

  /* =====================================================
     FAMILY NAME
  ===================================================== */

  const updateFamilyName = (
    familyIndex: number,
    value: string
  ) => {
    setFamilies((current) => {
      const updated = [...current];

      updated[familyIndex] = {
        ...updated[familyIndex],
        familyName: value,
      };

      return updated;
    });
  };

  /* =====================================================
     RESIDENT INFORMATION
  ===================================================== */

  const updateMember = (
    familyIndex: number,
    memberIndex: number,
    field: keyof Resident,
    value: string
  ) => {
    setFamilies((current) => {
      const updated = [...current];

      const family = {
        ...updated[familyIndex],
        members: [...updated[familyIndex].members],
      };

      family.members[memberIndex] = {
        ...family.members[memberIndex],
        [field]: value,
      };

      updated[familyIndex] = family;

      return updated;
    });
  };


  const updateResidentNamePart = (
    familyIndex: number,
    memberIndex: number,
    field: "firstName" | "middleName" | "lastName" | "suffix",
    value: string
  ) => {
    setFamilies((current) => {
      const updated = [...current];
      const family = updated[familyIndex];

      if (!family) {
        return current;
      }

      const members = [...family.members];
      const existingMember = members[memberIndex];

      if (!existingMember) {
        return current;
      }

      const updatedMember = {
        ...existingMember,
        [field]: value,
      };

      updatedMember.familyMemberName = [
        updatedMember.firstName,
        updatedMember.middleName,
        updatedMember.lastName,
        updatedMember.suffix,
      ]
        .filter(Boolean)
        .join(" ");

      members[memberIndex] = updatedMember;

      updated[familyIndex] = {
        ...family,
        members,
      };

      return updated;
    });
  };

  useEffect(() => {
    setFamilies((current) => {
      let changed = false;

      const updated = current.map((family) => ({
        ...family,
        members: family.members.map((member) => {
          const age = calculateAge(member.birthDate);

          if (typeof age !== "number") return member;

          const nextMember = { ...member } as Resident;

          // 0–4: not yet of school age.
          if (age <= 4) {
            nextMember.education = "Not Yet of School Age";
            nextMember.schoolStatus = "Not Applicable";
            nextMember.schoolLevel = "";
            nextMember.elementarySchool = "";
            nextMember.juniorHighSchool = "";
            nextMember.seniorHighSchool = "";
            nextMember.collegeUniversity = "";
            nextMember.postgraduateSchool = "";
            nextMember.shsStrand = "";
            nextMember.course = "";
            nextMember.specialization = "";
            nextMember.osyReason = "";
            nextMember.osyOtherReason = "";
          } else if (
            member.education === "Not Yet of School Age" ||
            member.schoolStatus === "Not Applicable"
          ) {
            nextMember.education = "";
            nextMember.schoolStatus = "";
          }

          // 0–14: employment/livelihood is not applicable.
          if (age <= 14) {
            nextMember.primaryOccupation = "Not Applicable";
            nextMember.employmentStatus = "Not Applicable";
            nextMember.secondaryOccupations = [];
            nextMember.employer = "";
            nextMember.monthlyIncome = "";
            nextMember.skills = "";
          } else if (
            member.primaryOccupation === "Not Applicable" ||
            member.employmentStatus === "Not Applicable"
          ) {
            nextMember.primaryOccupation = "";
            nextMember.employmentStatus = "";
          }

          // Under 18: not eligible to vote.
          if (age < 18) {
            nextMember.voterStatus = "Not Eligible";
          } else if (member.voterStatus === "Not Eligible") {
            nextMember.voterStatus = "";
          }

          // 60+: automatic senior citizen.
          nextMember.seniorCitizen = age >= 60 ? "Yes" : "No";

          if (JSON.stringify(nextMember) !== JSON.stringify(member)) {
            changed = true;
            return nextMember;
          }

          return member;
        }),
      }));

      return changed ? updated : current;
    });
  }, [families]);

  /* =====================================================
     DETERMINE ROLE
     
     Every family follows:

     Member 1 = Family Head
     Member 2 = Spouse
     Member 3+ = Child
  ===================================================== */
 const getRelationship = (
  member: Resident
): string => {
  return member.familyRelationship || "";
};

  /* =====================================================
     CREATE FAMILY FROM CHILD
  ===================================================== */
const createFamilyFromChild = (
  familyIndex: number,
  memberIndex: number
) => {
  const sourceFamily = families[familyIndex];

  if (!sourceFamily) {
    return;
  }

  const sourceResident =
    sourceFamily.members[memberIndex];

  if (!sourceResident) {
    return;
  }

  const linkedResidentKey =
    `${sourceFamily.id}-${memberIndex}`;

  const existingFamilyIndex =
    families.findIndex(
      (family) =>
        family.linkedResidentKey ===
        linkedResidentKey
    );

  // Kung mayroon nang family para sa member na ito,
  // ipakita lang ulit ang existing family.
  if (existingFamilyIndex !== -1) {
    setActiveFamilyIndex(existingFamilyIndex);
    return;
  }

  const newFamilyId =
    Math.max(
      ...families.map((family) => family.id)
    ) + 1;

  const familyHead: Resident = {
    ...sourceResident,
    hasOwnFamily: "",
    familyRelationship: "Family Head",
  };

  const newFamily: Family = {
    id: newFamilyId,
    familyName:
      sourceResident.lastName || "",
    linkedResidentKey,

    members: [
      familyHead,
    ],
  };

  setFamilies((current) => [
    ...current,
    newFamily,
  ]);

  setActiveFamilyIndex(
    families.length
  );
};

  /* =====================================================
     REMOVE FAMILY CREATED BY CHILD
  ===================================================== */

  /* =====================================================
     CHILD OWN FAMILY ANSWER
  ===================================================== */

 const handleOwnFamilyChange = (
  familyIndex: number,
  memberIndex: number,
  value: string
) => {
  updateMember(
    familyIndex,
    memberIndex,
    "hasOwnFamily",
    value
  );
};
  /* =====================================================
     PAGE
  ===================================================== */

  const currentFamily =
  families[activeFamilyIndex] || families[0];

const currentFamilyHead =
  currentFamily?.members.find(
    (member) =>
      member.familyRelationship === "Family Head"
  );

const currentFamilyHeadName = currentFamilyHead
  ? [
      currentFamilyHead.firstName,
      currentFamilyHead.middleName,
      currentFamilyHead.lastName,
      currentFamilyHead.suffix,
    ]
      .filter(Boolean)
      .join(" ")
  : "";

const ownFamilyMembers =
  currentFamily?.members.filter(
    (member) => member.hasOwnFamily === "Yes"
  ) || [];

const householdRequiredValues = [
  householdNumber,
  houseNumber,
  region,
  province,
  municipality,
  barangay,
  purok,
  street,
];

const completedHouseholdFields =
  householdRequiredValues.filter(Boolean).length;

const householdProgress = Math.round(
  (completedHouseholdFields /
    householdRequiredValues.length) *
    100
);

const totalResidents = families.reduce(
  (total, family) => total + family.members.length,
  0
);

const additionalFamilyCount = Math.max(families.length - 1, 0);

const getResidentDisplayName = (member: Resident) =>
  [
    member.firstName,
    member.middleName,
    member.lastName,
    member.suffix,
  ]
    .filter(Boolean)
    .join(" ") || member.familyMemberName || "Unnamed Resident";

const reviewRegionName =
  regions.find((item) => item.code === region)?.name || region || "Not selected";
const reviewProvinceName =
  provinces.find((item) => item.code === province)?.name || province || "Not selected";
const reviewMunicipalityName =
  municipalities.find((item) => item.code === municipality)?.name || municipality || "Not selected";
const reviewBarangayName =
  barangays.find((item) => item.code === barangay)?.name || barangay || "Not selected";

  return (
    <div className="census-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="census-header">

        <div className="logo-placeholder">
          LOGO
        </div>

        <div className="header-text">

          <h1>
            BARANGAY DIGITAL CENSUS
          </h1>

          <p>
            General Census Registration System
          </p>

          <span>
            Barangay Name • Municipality • Province
          </span>

        </div>

      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="census-container">

        {/* =================================================
            INTRODUCTION
        ================================================= */}

        <section className="welcome-section">

          <h2>
            General Census Registration
          </h2>

          <p>
            Please provide accurate and complete
            information about the household and
            all residents.
          </p>

          <p className="required-note">
            Fields marked with * are required.
          </p>

        </section>

        <div className="census-stepper">

  <div
  className={`census-step ${
    censusStep === "household" ? "active" : "completed"
  }`}
>
    <span>1</span>

    <div>
      <strong>Household</strong>
      <small>Information</small>
    </div>
  </div>

  <div className="census-step-line active" />

  <div
  className={`census-step ${
    censusStep === "family"
      ? "active"
      : censusStep === "resident" || censusStep === "review"
      ? "completed"
      : ""
  }`}
>
    <span>2</span>

    <div>
      <strong>Family</strong>
      <small>Information</small>
    </div>
  </div>

  <div
    className={`census-step-line ${
      censusStep === "resident" || censusStep === "review" ? "active" : ""
    }`}
  />

  <div
    className={`census-step ${
      censusStep === "resident"
        ? "active"
        : censusStep === "review"
        ? "completed"
        : ""
    }`}
  >
    <span>3</span>

    <div>
      <strong>Resident</strong>
      <small>Information</small>
    </div>
  </div>

  <div className={`census-step-line ${censusStep === "review" ? "active" : ""}`} />

  <div className={`census-step ${censusStep === "review" ? "active" : ""}`}>
    <span>4</span>

    <div>
      <strong>Review</strong>
      <small>& Submit</small>
    </div>
  </div>

</div>

        {/* =================================================
            HOUSEHOLD INFORMATION
        ================================================= */}

<div className={`census-workspace ${censusStep === "review" ? "review-workspace" : ""}`}>

  <div className="census-workspace-main">

        {censusStep === "household" && (

  <section className="form-card">

         <div className="census-card-header">

  <div className="census-card-icon">
    <House size={21} strokeWidth={1.8} />
  </div>

  <div className="census-card-number">
    01
  </div>

  <div className="census-card-heading">
    <h3>Household Information</h3>

    <p>
      Basic information about this household and residence
    </p>
  </div>


</div>

          <div className="form-grid">

            {/* HOUSEHOLD NUMBER */}

            <div className="form-group">

              <label>
                Household Number
              </label>

              <input
  id="householdNumber"
  type="text"
  value={householdNumber}
  className="readonly-field generated-id-field"
  readOnly
  aria-label="Automatically generated household number"
/>

            </div>

            {/* HOUSE NUMBER */}

            <div className="form-group">

              <label>
                House Number
              </label>

              <input
  id="houseNumber"
  type="text"
  value={houseNumber}
  className="readonly-field generated-id-field"
  readOnly
  aria-label="Automatically generated house record number"
/>

            </div>

            {/* REGION */}
<div className="form-group">
  <label>
    Region *
  </label>

  <select
    value={region}
    onChange={(event) =>
      setRegion(event.target.value)
    }
  >
    <option value="">
      SELECT REGION
    </option>

    {regions.map((item) => (
      <option
        key={item.code}
        value={item.code}
      >
        {item.name}
      </option>
    ))}
  </select>
</div>

{/* PROVINCE */}
<div className="form-group">
  <label>
    Province *
  </label>

  <select
    value={province}
    onChange={(event) =>
      setProvince(event.target.value)
    }
    disabled={!region}
  >
    <option value="">
      SELECT PROVINCE
    </option>

    {provinces.map((item) => (
      <option
        key={item.code}
        value={item.code}
      >
        {item.name}
      </option>
    ))}
  </select>
</div>

{/* MUNICIPALITY */}
<div className="form-group">
  <label>
    Municipality *
  </label>

  <select
    value={municipality}
    onChange={(event) =>
      setMunicipality(event.target.value)
    }
    disabled={!province}
  >
    <option value="">
      SELECT MUNICIPALITY
    </option>

    {municipalities.map((item) => (
      <option
        key={item.code}
        value={item.code}
      >
        {item.name}
      </option>
    ))}
  </select>
</div>

{/* BARANGAY */}
<div className="form-group">
  <label>
    Barangay *
  </label>

  <select
    value={barangay}
    onChange={(event) =>
      setBarangay(event.target.value)
    }
    disabled={!municipality}
  >
    <option value="">
      SELECT BARANGAY
    </option>

    {barangays.map((item) => (
      <option
        key={item.code}
        value={item.code}
      >
        {item.name}
      </option>
    ))}
  </select>
</div>
        

            {/* PUROK */}

<div className="form-group">

  <label>
    Purok *
  </label>

  <select
  id="purok"
  value={purok}
  className={
    validationFields.purok
      ? "input-error"
      : ""
  }
  onChange={(event) => {
    const selectedPurok = event.target.value;

    setPurok(selectedPurok);

    // Kapag nakapili na ng Purok,
    // aalisin ang red border
    setValidationFields((prev) => ({
      ...prev,
      purok: false,
    }));

    const streetMap: Record<string, string> = {
      "PUROK 1": "STREET 1",
      "PUROK 2": "STREET 2",
      "PUROK 3": "STREET 3",
      "PUROK 4A": "STREET 4A",
      "PUROK 4B": "STREET 4B",
      "PUROK 5": "ATONGON",
      "PUROK 6": "STREET 6",
    };

    setStreet(streetMap[selectedPurok] || "");

setValidationFields((prev) => ({
  ...prev,
  purok: false,
  street: false,
}));
  }}
>

    <option value="">
      SELECT PUROK
    </option>

    <option value="PUROK 1">
      PUROK 1
    </option>

    <option value="PUROK 2">
      PUROK 2
    </option>

    <option value="PUROK 3">
      PUROK 3
    </option>

    <option value="PUROK 4A">
      PUROK 4A
    </option>

    <option value="PUROK 4B">
      PUROK 4B
    </option>

    <option value="PUROK 5">
      PUROK 5
    </option>

    <option value="PUROK 6">
      PUROK 6
    </option>

  </select>

</div>


{/* STREET */}

<div className="form-group">

  <label>
    Street Name
  </label>

  <input
    id="street"
    type="text"
    value={street}
    className={
      validationFields.street
        ? "input-error"
        : ""
    }
    readOnly
    placeholder="AUTOMATIC STREET NAME"
  />

</div>

            {/* YEARS */}

            <div className="form-group">

              <label>
                Years Living in Barangay
              </label>

              <input
                type="number"
                min="0"
                value={yearsInBarangay}
                onChange={(event) =>
                  setYearsInBarangay(
                    event.target.value
                  )
                }
                placeholder="Number of years"
              />

            </div>

            {/* CURRENT ADDRESS */}

<div className="form-group full-width">
  <label>
    Current Address
  </label>

  <input
    type="text"
    value={currentAddress}
    readOnly
    placeholder="AUTOMATIC CURRENT ADDRESS"
  />
</div>

            {/* PREVIOUS ADDRESS */}

            <div className="form-group full-width">

              <label>
                Previous Address
              </label>

              <input
                type="text"
                value={previousAddress}
                onChange={(event) =>
                  setPreviousAddress(
                    event.target.value
                  )
                }
                placeholder="Previous address if applicable"
              />

            </div>

          </div>

        <div className="census-step-footer">

  <div className="census-step-note">
    Fields marked with * are required.
  </div>

  <div className="census-step-actions">

    <button
      type="button"
      className="census-cancel-button"
    >
      Cancel
    </button>

    <button
      type="button"
      className="census-continue-button"
      onClick={() => {

        const errors: Record<string, boolean> = {};

        if (!householdNumber.trim()) {
          errors.householdNumber = true;
        }

        if (!houseNumber.trim()) {
          errors.houseNumber = true;
        }

        if (!purok.trim()) {
          errors.purok = true;
        }

        if (!street.trim()) {
          errors.street = true;
        }

        if (
          !region ||
          !province ||
          !municipality ||
          !barangay
        ) {
          setValidationError(
            "Please complete the household location information."
          );

          setTimeout(() => {
            setValidationError("");
          }, 2000);

          return;
        }

        if (Object.keys(errors).length > 0) {
          setValidationFields(errors);

          setValidationError(
            "Please complete the required household information."
          );

          setTimeout(() => {
            setValidationError("");
          }, 2000);

          return;
        }

        setValidationError("");
        setValidationFields({});

        setCensusStep("family");

      }}
    >
      Save & Continue
      <span>→</span>
    </button>

  </div>

</div>

</section>

    )}

        {/* =================================================
            FAMILIES
        ================================================= */}

      {(censusStep === "family" || censusStep === "resident") &&
  families
    .slice(
      activeFamilyIndex,
      activeFamilyIndex + 1
    )
  .map(
    (family) => {
      const familyIndex =
        activeFamilyIndex;

      return (

            <section
              className={`form-card ${
                censusStep === "resident"
                  ? "resident-step-mode"
                  : "family-step-mode"
              }`}
              key={family.id}
            >

              {/* FAMILY HEADER */}

             <div className="census-card-header family-step-header">

  <div className="census-card-icon">
    <UsersRound size={21} strokeWidth={1.8} />
  </div>

  <div className="census-card-number">
    02
  </div>

  <div className="census-card-heading">

    <h3>
      Family Information
    </h3>

    <p>
      Set up the family and its members
      before completing individual resident details.
    </p>

  </div>

  <div className="family-number-badge">
    Family {familyIndex + 1}
  </div>

</div>

              {/* AUTOMATIC FAMILY NOTICE */}

              {family.linkedResidentKey && (

                <div className="linked-family-notice">

                  <strong>
                    New Family Detected
                  </strong>

                  <p>
                    This family was automatically
                    created because a child from
                    another family has their own
                    family.
                  </p>

                </div>

              )}

              {/* =================================================
                  FAMILY INFORMATION
              ================================================= */}

             <div className="family-basic-section">

  <div className="family-basic-heading">

    <div>
      <strong>
        Family Details
      </strong>

      <span>
        Basic identification for this family unit.
      </span>
    </div>

  </div>

  <div className="form-grid">

                  {/* FAMILY NAME */}

                  <div className="form-group">

                    <label>
                      Family Name / Surname
                    </label>

                    <input
                      type="text"
                      value={
                        family.familyName
                      }
                      onChange={(event) =>
                        updateFamilyName(
                          familyIndex,
                          event.target.value
                        )
                      }
                      placeholder="Family surname"
                    />

                  </div>

                </div>

              </div>
        

              {/* =================================================
                  FAMILY MEMBERS
              ================================================= */}

             <div className="family-members-section">

  <div className="family-members-heading">

  <div>
    <strong>Family Members</strong>

    <span>
      List of all members in this family.
    </span>
  </div>

  <div className="family-members-actions">

    <button
  type="button"
  className="family-add-member-btn"
  onClick={() => {
    addFamilyMember(familyIndex);
  }}
>
  + Add Member
</button>

  </div>

</div>

<div className="family-members-table">

  <div className="family-table-header">

    <span>#</span>
    <span>Full Name</span>
    <span>Relationship</span>
    <span>Status</span>
    <span>Has Own Family?</span>
    <span>Actions</span>

  </div>


  {family.members.map(
    (tableMember, tableMemberIndex) => {

      const tableMemberName =
        tableMember.familyMemberName ||
        [
          tableMember.firstName,
          tableMember.middleName,
          tableMember.lastName,
          tableMember.suffix,
        ]
          .filter(Boolean)
          .join(" ") ||
        `Member ${tableMemberIndex + 1}`;

      return (
        <div
          className={`family-table-row ${
            activeMemberIndex === tableMemberIndex
              ? "active"
              : ""
          }`}
          key={tableMemberIndex}
        >

          <span className="family-table-number">
            {tableMemberIndex + 1}
          </span>


          <div className="family-table-name">

            <strong>
              {tableMemberName}
            </strong>

            {tableMember.familyRelationship ===
              "Family Head" && (
              <small>Family Head</small>
            )}

          </div>


          <span className="family-table-relationship">
            {tableMember.familyRelationship ||
              "Not selected"}
          </span>


          <span className="family-table-status">
            {tableMember.familyMemberStatus ||
              "Not selected"}
          </span>


          <div className="family-table-own-family">

            {tableMember.familyRelationship ===
              "Family Head" ||
            tableMember.familyRelationship ===
              "Spouse" ? (

              <span className="own-family-na">
                —
              </span>

            ) : (

              <select
                value={
                  tableMember.hasOwnFamily
                }
                onChange={(event) =>
                  handleOwnFamilyChange(
                    familyIndex,
                    tableMemberIndex,
                    event.target.value
                  )
                }
              >

                <option value="">
                  Select
                </option>

                <option value="No">
                  No
                </option>

                <option value="Yes">
                  Yes
                </option>

              </select>

            )}

          </div>


          <div className="family-table-actions">

            {family.linkedResidentKey && tableMemberIndex === 0 ? (
              <span className="linked-resident-badge">
                Linked Resident
              </span>
            ) : (
              <button
                type="button"
                className="family-edit-member"
                onClick={() => {
                  setActiveMemberIndex(tableMemberIndex);
                  setIsMemberEditorOpen(true);
                }}
              >
                Edit
              </button>
            )}

          </div>

        </div>
      );
    }
  )}

</div>

<div className="family-table-note">

  <Info size={14} strokeWidth={1.8} />

  <span>
    Members marked "Yes" in Has Own Family
    will be handled as a separate family unit
    in the next family process.
  </span>

</div>

{family.members
  .slice(
    activeMemberIndex,
    activeMemberIndex + 1
  )
  .map(
    (
      member,
      _memberIndex
    ) => {

const actualMemberIndex =
  activeMemberIndex;

  const memberIndex =
  actualMemberIndex;

  const isLinkedFamilyHead = Boolean(
    family.linkedResidentKey && memberIndex === 0
  );

                    const role =
  getRelationship(member);

                    return (
                      <>

                      <div className="family-member-editor">

                      <div className="family-active-member-bar">

  <div>

    <span>
      Member {memberIndex + 1} of {family.members.length}
    </span>

    <strong>
      {member.familyMemberName ||
        `Family Member ${memberIndex + 1}`}
    </strong>

  </div>

  {member.familyRelationship && (
    <span className="family-active-role">
      {member.familyRelationship}
    </span>
  )}

</div>

</div>


                        {/* FAMILY MEMBER BASIC INFORMATION */}

{isMemberEditorOpen && !isLinkedFamilyHead && (
  <div className="subsection family-member-edit-panel">

  <div className="subsection-label">
    Family Member Information
  </div>

  <div className="form-grid">

    {/* NAME PARTS — kept separate so multi-word first/middle names stay correct */}
    <div className="form-group">
      <label>First Name *</label>
      <input
        type="text"
        value={member.firstName}
        onChange={(event) =>
          updateResidentNamePart(familyIndex, memberIndex, "firstName", event.target.value)
        }
        placeholder="First name"
      />
    </div>

    <div className="form-group">
      <label>Middle Name</label>
      <input
        type="text"
        value={member.middleName}
        onChange={(event) =>
          updateResidentNamePart(familyIndex, memberIndex, "middleName", event.target.value)
        }
        placeholder="Middle name"
      />
    </div>

    <div className="form-group">
      <label>Last Name *</label>
      <input
        type="text"
        value={member.lastName}
        onChange={(event) =>
          updateResidentNamePart(familyIndex, memberIndex, "lastName", event.target.value)
        }
        placeholder="Last name"
      />
    </div>

    <div className="form-group">
      <label>Suffix</label>
      <select
        value={member.suffix}
        onChange={(event) =>
          updateResidentNamePart(familyIndex, memberIndex, "suffix", event.target.value)
        }
      >
        <option value="">NONE</option>
        <option value="Jr.">JR.</option>
        <option value="Sr.">SR.</option>
        <option value="II">II</option>
        <option value="III">III</option>
        <option value="IV">IV</option>
      </select>
    </div>

    {/* RELATIONSHIP */}

    <div className="form-group">
      <label>
        Relationship to Family Head *
      </label>

      <select
  value={member.familyRelationship}
  onChange={(event) =>
    updateMember(
      familyIndex,
      memberIndex,
      "familyRelationship",
      event.target.value
    )
  }
>
  <option value="">
    Select Relationship
  </option>

  <option value="Family Head">
    Family Head
  </option>

  <option value="Spouse">
    Spouse
  </option>

  <option value="Child">
    Child
  </option>

  <option value="Grandchild">
    Grandchild
  </option>

  <option value="Parent">
    Parent
  </option>

  <option value="Grandparent">
    Grandparent
  </option>

  <option value="Sibling">
    Sibling
  </option>

  <option value="Niece">
    Niece
  </option>

  <option value="Nephew">
    Nephew
  </option>

  <option value="Cousin">
    Cousin
  </option>

  <option value="Relative">
    Relative
  </option>

  <option value="Adopted Child">
    Adopted Child
  </option>

  <option value="Other">
    Other
  </option>
</select>
    </div>

    {/* STATUS */}

    <div className="form-group">
      <label>
        Member Status *
      </label>

      <select
        value={member.familyMemberStatus}
        onChange={(event) =>
          updateMember(
            familyIndex,
            memberIndex,
            "familyMemberStatus",
            event.target.value
          )
        }
      >
        <option value="">
          Select status
        </option>

        <option value="Alive">
          Alive
        </option>

        <option value="Deceased">
          Deceased
        </option>
      </select>
    </div>

  </div>

  <div className="family-member-editor-actions">
    <button
      type="button"
      className="family-editor-close-button"
      onClick={() => setIsMemberEditorOpen(false)}
    >
      Close
    </button>
  </div>

</div>

)}

{censusStep === "resident" && (
  <div className="resident-step-header">
    <div className="resident-step-heading">
      <div className="resident-step-icon">
        <UsersRound size={20} strokeWidth={1.8} />
      </div>

      <div>
        <span className="resident-step-kicker">03 • Resident Information</span>
        <h3>{member.familyMemberName || `Resident ${memberIndex + 1}`}</h3>
        <p>
          {isLinkedFamilyHead
            ? "Linked from the original family. Personal information is review-only here."
            : "Complete the individual information for this household member."}
        </p>
        <span className="resident-id-chip">
          {getResidentId(member) || "Resident ID pending"}
        </span>
      </div>
    </div>

    <div className="resident-step-selector">
      <label>Select Member</label>
      <select
        value={activeMemberIndex}
        onChange={(event) =>
          setActiveMemberIndex(Number(event.target.value))
        }
      >
        {family.members.map((residentOption, residentOptionIndex) => (
          <option
            key={residentOptionIndex}
            value={residentOptionIndex}
          >
            {residentOption.familyMemberName ||
              `Member ${residentOptionIndex + 1}`}
          </option>
        ))}
      </select>
      <span>
        {activeMemberIndex + 1} of {family.members.length}
      </span>
    </div>
  </div>
)}

<div
  className={`resident-card ${
    isLinkedFamilyHead ? "linked-head-review-card" : ""
  }`}
  key={memberIndex}
>

                        {/* RESIDENT HEADER */}

                        <div
                          className="resident-header"
                        >

                          <div>

                            <h4>
                              Resident{" "}
                              {memberIndex + 1}
                            </h4>

                            <p>
                              {role}
                            </p>

                          </div>

                          <div className="role-badge">
                            {role}
                          </div>

                        </div>

                        {isLinkedFamilyHead && (
                          <div className="linked-head-review-note">
                            <CheckCircle2 size={15} strokeWidth={1.8} />
                            <div>
                              <strong>Same resident, new family role</strong>
                              <span>
                                This person keeps the same Resident ID and information.
                                Only the family relationship is shown as Family Head here.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* =================================================
                            PERSONAL INFORMATION
                        ================================================= */}

                        <div className="subsection-label">
                          Personal Information
                        </div>

                        <div className="form-grid">

                          {/* FIRST NAME */}

                          <div className="form-group">

                            <label>
                              First Name *
                            </label>

                            <input
                              type="text"
                              value={member.firstName}
                              onChange={(event) =>
                                updateResidentNamePart(
                                  familyIndex,
                                  memberIndex,
                                  "firstName",
                                  event.target.value
                                )
                              }
                              placeholder="First name"
                            />

                          </div>

                          {/* MIDDLE NAME */}

                          <div className="form-group">

                            <label>
                              Middle Name
                            </label>

                            <input
                              type="text"
                              value={member.middleName}
                              onChange={(event) =>
                                updateResidentNamePart(
                                  familyIndex,
                                  memberIndex,
                                  "middleName",
                                  event.target.value
                                )
                              }
                              placeholder="Middle name"
                            />

                          </div>

                          {/* LAST NAME */}

                          <div className="form-group">

                            <label>
                              Last Name *
                            </label>

                            <input
                              type="text"
                              value={member.lastName}
                              onChange={(event) =>
                                updateResidentNamePart(
                                  familyIndex,
                                  memberIndex,
                                  "lastName",
                                  event.target.value
                                )
                              }
                              placeholder="Last name"
                            />

                          </div>

                          {/* SUFFIX */}

                          <div className="form-group">

                            <label>
                              Suffix
                            </label>

                            <select
                              value={
                                member.suffix
                              }
                              onChange={(event) =>
                                updateResidentNamePart(
                                  familyIndex,
                                  memberIndex,
                                  "suffix",
                                  event.target.value
                                )
                              }
                            >

                              <option value="">
                                None
                              </option>

                              <option value="Jr.">
                                Jr.
                              </option>

                              <option value="Sr.">
                                Sr.
                              </option>

                              <option value="II">
                                II
                              </option>

                              <option value="III">
                                III
                              </option>

                              <option value="IV">
                                IV
                              </option>

                            </select>

                          </div>

                          {/* DATE OF BIRTH */}

<div className="form-group">

  <label>
    Date of Birth *
  </label>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr 1fr",
      gap: "10px",
    }}
  >

    {/* MONTH */}

    <select
      value={
        member.birthDate
          ? member.birthDate.split("-")[1]
          : ""
      }
      onChange={(event) => {

        const newDate =
          updateBirthDatePart(
            member.birthDate,
            "month",
            event.target.value
          );

        updateMember(
          familyIndex,
          memberIndex,
          "birthDate",
          newDate
        );

      }}
    >

      <option value="">
        MONTH
      </option>

      <option value="01">JANUARY</option>
      <option value="02">FEBRUARY</option>
      <option value="03">MARCH</option>
      <option value="04">APRIL</option>
      <option value="05">MAY</option>
      <option value="06">JUNE</option>
      <option value="07">JULY</option>
      <option value="08">AUGUST</option>
      <option value="09">SEPTEMBER</option>
      <option value="10">OCTOBER</option>
      <option value="11">NOVEMBER</option>
      <option value="12">DECEMBER</option>

    </select>


    {/* DAY */}

    <select
      value={
        member.birthDate
          ? member.birthDate.split("-")[2]
          : ""
      }
      onChange={(event) => {

        const newDate =
          updateBirthDatePart(
            member.birthDate,
            "day",
            event.target.value
          );

        updateMember(
          familyIndex,
          memberIndex,
          "birthDate",
          newDate
        );

      }}
    >

      <option value="">
        DAY
      </option>

      {Array.from(
        { length: 31 },
        (_, index) => {

          const day =
            String(index + 1).padStart(2, "0");

          return (
            <option
              key={day}
              value={day}
            >
              {day}
            </option>
          );

        }
      )}

    </select>


    {/* YEAR */}

    <select
      value={
        member.birthDate
          ? member.birthDate.split("-")[0]
          : ""
      }
      onChange={(event) => {

        const newDate =
          updateBirthDatePart(
            member.birthDate,
            "year",
            event.target.value
          );

        updateMember(
          familyIndex,
          memberIndex,
          "birthDate",
          newDate
        );

      }}
    >

      <option value="">
        YEAR
      </option>

      {Array.from(
        {
          length:
            new Date().getFullYear() - 1900 + 1,
        },
        (_, index) => {

          const year =
            new Date().getFullYear() - index;

          return (
            <option
              key={year}
              value={year}
            >
              {year}
            </option>
          );

        }
      )}

    </select>

  </div>

</div>
{/* AGE - AUTOMATIC */}

<div className="form-group">

  <label>
    Age
  </label>

  <input
    type="text"
    value={
      calculateAge(member.birthDate) !== ""
        ? `${calculateAge(member.birthDate)} YEARS OLD`
        : ""
    }
    readOnly
    placeholder="AUTOMATICALLY CALCULATED"
  />

</div>

                          {/* PLACE OF BIRTH */}

                          <div className="form-group">

                            <label>
                              Place of Birth
                            </label>

                            <input
                              type="text"
                              value={
                                member.birthPlace
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "birthPlace",
                                  event.target.value
                                )
                              }
                              placeholder="Place of birth"
                            />

                          </div>

                          {/* SEX */}

                          <div className="form-group">

                            <label>
                              Sex *
                            </label>

                            <select
                              value={
                                member.sex
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "sex",
                                  event.target.value
                                )
                              }
                            >

                              <option value="">
                                Select sex
                              </option>

                              <option value="Male">
                                Male
                              </option>

                              <option value="Female">
                                Female
                              </option>

                            </select>

                          </div>

                          {/* CIVIL STATUS */}

                          <div className="form-group">

                            <label>
                              Civil Status *
                            </label>

                            <select
                              value={
                                member.civilStatus
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "civilStatus",
                                  event.target.value
                                )
                              }
                            >

                              <option value="">
                                Select civil status
                              </option>

                              <option value="Single">
                                Single
                              </option>

                              <option value="Married">
                                Married
                              </option>

                              <option value="Widowed">
                                Widowed
                              </option>

                              <option value="Separated">
                                Separated
                              </option>

                              <option value="Annulled">
                                Annulled
                              </option>

                            </select>

                          </div>

                          {/* NATIONALITY */}

<div className="form-group">
  <label>
    Nationality
  </label>

  <select
    value={member.nationality}
    onChange={(event) =>
      updateMember(
        familyIndex,
        memberIndex,
        "nationality",
        event.target.value
      )
    }
  >
    <option value="">
      Select nationality
    </option>

    <option value="Filipino">
      Filipino
    </option>

    <option value="American">
      American
    </option>

    <option value="Australian">
      Australian
    </option>

    <option value="British">
      British
    </option>

    <option value="Canadian">
      Canadian
    </option>

    <option value="Chinese">
      Chinese
    </option>

    <option value="Japanese">
      Japanese
    </option>

    <option value="Korean">
      Korean
    </option>

    <option value="Indian">
      Indian
    </option>

    <option value="Indonesian">
      Indonesian
    </option>

    <option value="Malaysian">
      Malaysian
    </option>

    <option value="Singaporean">
      Singaporean
    </option>

    <option value="Thai">
      Thai
    </option>

    <option value="Vietnamese">
      Vietnamese
    </option>

    <option value="Other">
      Other
    </option>
  </select>
</div>

{/* RELIGION */}

<div className="form-group">
  <label>
    Religion
  </label>

  <select
    value={member.religion}
    onChange={(event) =>
      updateMember(
        familyIndex,
        memberIndex,
        "religion",
        event.target.value
      )
    }
  >
    <option value="">
      Select religion
    </option>

    <option value="Roman Catholic">
      Roman Catholic
    </option>

    <option value="Iglesia ni Cristo">
      Iglesia ni Cristo
    </option>

    <option value="Islam">
      Islam
    </option>

    <option value="Evangelical">
      Evangelical
    </option>

    <option value="Seventh-day Adventist">
      Seventh-day Adventist
    </option>

    <option value="Baptist">
      Baptist
    </option>

    <option value="Jehovah's Witnesses">
      Jehovah's Witnesses
    </option>

    <option value="Aglipayan">
      Aglipayan
    </option>

    <option value="Born Again Christian">
      Born Again Christian
    </option>

    <option value="Other">
      Other
    </option>

    <option value="No Religion">
      No Religion
    </option>

    <option value="Prefer not to say">
      Prefer not to say
    </option>
  </select>
</div>

                          {/* HEIGHT */}

<div className="form-group">

  <label>
    Height
  </label>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}
  >

    <input
      type="number"
      min="0"
      value={member.height ?? ""}
      onChange={(event) =>
        updateMember(
          familyIndex,
          memberIndex,
          "height",
          event.target.value
        )
      }
      placeholder="Enter height"
    />

    <span>
      CM
    </span>

  </div>

</div>


{/* WEIGHT */}

<div className="form-group">

  <label>
    Weight
  </label>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }}
  >

    <input
      type="number"
      min="0"
      value={member.weight ?? ""}
      onChange={(event) =>
        updateMember(
          familyIndex,
          memberIndex,
          "weight",
          event.target.value
        )
      }
      placeholder="Enter weight"
    />

      <span>
      kg
      </span>

    </div>

      </div>
                        </div>

                        {/* =================================================
                            RELATIONSHIP
                        ================================================= */}

                        <div className="subsection-label">
                          Household Relationship
                        </div>

                        <div className="form-grid">

                          <div className="form-group">

                            <label>
                              Relationship to Family Head
                            </label>

                            <input
                              type="text"
                              value={role}
                              disabled
                            />

                          </div>

                        </div>

                        {/* =================================================
                            CHILD OWN FAMILY
                        ================================================= */}

                       {member.familyRelationship &&
  member.familyRelationship !== "Family Head" &&
  member.familyRelationship !== "Spouse" && (

                          <div className="child-family-question">

                          <div className="subsection-label">
  Own Family Information
</div>

                            <div className="form-grid">

                              <div className="form-group">

                                <label>
  Does this family member have
  their own family?
</label>

                                <select
                                  value={
                                    member.hasOwnFamily
                                  }
                                  onChange={(event) =>
                                    handleOwnFamilyChange(
                                      familyIndex,
                                      memberIndex,
                                      event.target.value
                                    )
                                  }
                                >

                                  <option value="">
                                    Select answer
                                  </option>

                                  <option value="Yes">
                                    Yes
                                  </option>

                                  <option value="No">
                                    No
                                  </option>

                                </select>

                              </div>

                            </div>

                          </div>

                        )}
                          

                        {/* =================================================
                            CONTACT INFORMATION
                        ================================================= */}

                        <div className="subsection-label">
                          Contact Information
                        </div>

                        <div className="form-grid">

                          <div className="form-group">

                            <label>
                              Contact Number
                            </label>

                            <input
                              type="text"
                              value={
                                member.contactNumber
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "contactNumber",
                                  event.target.value
                                )
                              }
                              placeholder="09XXXXXXXXX"
                            />

                          </div>

                          <div className="form-group">

                            <label>
                              Email Address
                            </label>

                            <input
                              type="email"
                              value={
                                member.email
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "email",
                                  event.target.value
                                )
                              }
                              placeholder="Email address"
                            />

                          </div>

                        </div>
{/* =================================================
    EDUCATION
================================================= */}

<div className="subsection-label">
  Education
</div>

<div className="form-grid">

  {/* ================================================
      EDUCATIONAL ATTAINMENT
  ================================================ */}

  <div className="form-group">

    <label>
      Educational Attainment
    </label>

    <select
      value={member.education}
      disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 4}
      className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 4 ? "age-auto-field" : ""}
      onChange={(event) =>
        updateMember(
          familyIndex,
          memberIndex,
          "education",
          event.target.value
        )
      }
    >

      <option value="">
        SELECT EDUCATIONAL ATTAINMENT
      </option>

      <option value="Not Yet of School Age">
        NOT YET OF SCHOOL AGE
      </option>

      <option value="No Formal Education">
        NO FORMAL EDUCATION
      </option>

      <option value="Elementary Level">
        ELEMENTARY LEVEL
      </option>

      <option value="Elementary Graduate">
        ELEMENTARY GRADUATE
      </option>

      <option value="Junior High School Level">
        JUNIOR HIGH SCHOOL LEVEL
      </option>

      <option value="Junior High School Graduate">
        JUNIOR HIGH SCHOOL GRADUATE
      </option>

      <option value="Senior High School Level">
        SENIOR HIGH SCHOOL LEVEL
      </option>

      <option value="Senior High School Graduate">
        SENIOR HIGH SCHOOL GRADUATE
      </option>

      <option value="Vocational / Technical">
        VOCATIONAL / TECHNICAL
      </option>

      <option value="College Undergraduate">
        COLLEGE UNDERGRADUATE
      </option>

      <option value="College Graduate">
        COLLEGE GRADUATE
      </option>

      <option value="Postgraduate">
        POSTGRADUATE
      </option>

    </select>

  </div>


  {/* ================================================
      CURRENT SCHOOL STATUS
  ================================================ */}

  <div className="form-group">

    <label>
      Current School Status
    </label>

    <select
      value={member.schoolStatus}
      disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 4}
      className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 4 ? "age-auto-field" : ""}
      onChange={(event) =>
        updateMember(
          familyIndex,
          memberIndex,
          "schoolStatus",
          event.target.value
        )
      }
    >

      <option value="">
        SELECT STATUS
      </option>

      <option value="Not Applicable">
        NOT APPLICABLE
      </option>

      <option value="Currently Studying">
        CURRENTLY STUDYING
      </option>

      <option value="Not Currently Studying">
        NOT CURRENTLY STUDYING
      </option>

      <option value="Out of School Youth">
        OUT-OF-SCHOOL YOUTH
      </option>

      <option value="Never Attended School">
        NEVER ATTENDED SCHOOL
      </option>

    </select>

  </div>


  {/* ================================================
      CURRENT SCHOOL LEVEL
      ONLY IF CURRENTLY STUDYING
  ================================================ */}

  {member.schoolStatus === "Currently Studying" && (

    <div className="form-group">

      <label>
        Current School Level
      </label>

      <select
        value={member.schoolLevel}
        onChange={(event) =>
          updateMember(
            familyIndex,
            memberIndex,
            "schoolLevel",
            event.target.value
          )
        }
      >

        <option value="">
          SELECT SCHOOL LEVEL
        </option>

        <option value="Elementary">
          ELEMENTARY
        </option>

        <option value="Junior High School">
          JUNIOR HIGH SCHOOL
        </option>

        <option value="Senior High School">
          SENIOR HIGH SCHOOL
        </option>

        <option value="College">
          COLLEGE
        </option>

        <option value="Vocational / Technical">
          VOCATIONAL / TECHNICAL
        </option>

        <option value="Postgraduate">
          POSTGRADUATE
        </option>

      </select>

    </div>

  )}


  {/* ================================================
      ELEMENTARY SCHOOL HISTORY
  ================================================ */}

  {(member.education === "Elementary Level" ||
    member.education === "Elementary Graduate" ||
    member.education === "Junior High School Level" ||
    member.education === "Junior High School Graduate" ||
    member.education === "Senior High School Level" ||
    member.education === "Senior High School Graduate" ||
    member.education === "Vocational / Technical" ||
    member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

      <div className="form-group full-width">

        <label>
          Elementary School
        </label>

        <input
          type="text"
          value={member.elementarySchool}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "elementarySchool",
              event.target.value
            )
          }
          placeholder="ENTER ELEMENTARY SCHOOL"
        />

      </div>

  )}


  {/* ================================================
      JUNIOR HIGH SCHOOL HISTORY
  ================================================ */}

  {(member.education === "Junior High School Level" ||
    member.education === "Junior High School Graduate" ||
    member.education === "Senior High School Level" ||
    member.education === "Senior High School Graduate" ||
    member.education === "Vocational / Technical" ||
    member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

      <div className="form-group full-width">

        <label>
          Junior High School
        </label>

        <input
          type="text"
          value={member.juniorHighSchool}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "juniorHighSchool",
              event.target.value
            )
          }
          placeholder="ENTER JUNIOR HIGH SCHOOL"
        />

      </div>

  )}


  {/* ================================================
      SENIOR HIGH SCHOOL HISTORY
  ================================================ */}

  {(member.education === "Senior High School Level" ||
    member.education === "Senior High School Graduate" ||
    member.education === "Vocational / Technical" ||
    member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

      <div className="form-group full-width">

        <label>
          Senior High School
        </label>

        <input
          type="text"
          value={member.seniorHighSchool}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "seniorHighSchool",
              event.target.value
            )
          }
          placeholder="ENTER SENIOR HIGH SCHOOL"
        />

      </div>

  )}


  {/* ================================================
      SHS STRAND
  ================================================ */}

  {(member.education === "Senior High School Level" ||
    member.education === "Senior High School Graduate" ||
    member.education === "Vocational / Technical" ||
    member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

      <div className="form-group">

        <label>
          SHS Strand
        </label>

        <select
          value={member.shsStrand}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "shsStrand",
              event.target.value
            )
          }
        >

          <option value="">
            SELECT STRAND
          </option>

          <option value="STEM">
            STEM
          </option>

          <option value="ABM">
            ABM
          </option>

          <option value="HUMSS">
            HUMSS
          </option>

          <option value="GAS">
            GAS
          </option>

          <option value="TVL">
            TVL
          </option>

          <option value="Arts and Design">
            ARTS AND DESIGN
          </option>

          <option value="Sports">
            SPORTS
          </option>

          <option value="Other">
            OTHER
          </option>

        </select>

      </div>

  )}


  {/* ================================================
      COLLEGE / UNIVERSITY HISTORY
  ================================================ */}

  {(member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

      <div className="form-group full-width">

        <label>
          College / University
        </label>

        <input
          type="text"
          value={member.collegeUniversity}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "collegeUniversity",
              event.target.value
            )
          }
          placeholder="ENTER COLLEGE OR UNIVERSITY"
        />

      </div>

  )}


  {/* ================================================
      COLLEGE COURSE
  ================================================ */}

  {(member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

      <div className="form-group full-width">

        <label>
          College Course
        </label>

        <input
          type="text"
          value={member.course}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "course",
              event.target.value
            )
          }
          placeholder="EXAMPLE: BS INFORMATION TECHNOLOGY"
        />

      </div>

  )}


  {/* ================================================
      VOCATIONAL / TECHNICAL SPECIALIZATION
  ================================================ */}

  {member.education === "Vocational / Technical" && (

    <div className="form-group full-width">

      <label>
        Specialization
      </label>

      <input
        type="text"
        value={member.specialization}
        onChange={(event) =>
          updateMember(
            familyIndex,
            memberIndex,
            "specialization",
            event.target.value
          )
        }
        placeholder="ENTER SPECIALIZATION"
      />

    </div>

  )}


  {/* ================================================
      POSTGRADUATE SCHOOL
  ================================================ */}

  {member.education === "Postgraduate" && (

    <div className="form-group full-width">

      <label>
        Postgraduate School / University
      </label>

      <input
        type="text"
        value={member.postgraduateSchool}
        onChange={(event) =>
          updateMember(
            familyIndex,
            memberIndex,
            "postgraduateSchool",
            event.target.value
          )
        }
        placeholder="ENTER POSTGRADUATE SCHOOL OR UNIVERSITY"
      />

    </div>

  )}


  {/* ================================================
      POSTGRADUATE PROGRAM
  ================================================ */}

  {member.education === "Postgraduate" && (

    <div className="form-group full-width">

      <label>
        Postgraduate Program / Specialization
      </label>

      <input
        type="text"
        value={member.specialization}
        onChange={(event) =>
          updateMember(
            familyIndex,
            memberIndex,
            "specialization",
            event.target.value
          )
        }
        placeholder="EXAMPLE: MASTER OF EDUCATION"
      />

    </div>

  )}


  {/* ================================================
      OUT-OF-SCHOOL YOUTH REASON
  ================================================ */}

  {member.schoolStatus === "Out of School Youth" && (

    <div className="form-group">

      <label>
        Reason for Not Attending School
      </label>

      <select
        value={member.osyReason}
        onChange={(event) =>
          updateMember(
            familyIndex,
            memberIndex,
            "osyReason",
            event.target.value
          )
        }
      >

        <option value="">
          SELECT REASON
        </option>

        <option value="Financial / Economic Reason">
          FINANCIAL / ECONOMIC REASON
        </option>

        <option value="Working">
          WORKING
        </option>

        <option value="Family Responsibilities">
          FAMILY RESPONSIBILITIES
        </option>

        <option value="Marriage / Family Matters">
          MARRIAGE / FAMILY MATTERS
        </option>

        <option value="Lack of Interest">
          LACK OF INTEREST
        </option>

        <option value="Distance / Accessibility">
          DISTANCE / ACCESSIBILITY
        </option>

        <option value="Health / Disability">
          HEALTH / DISABILITY
        </option>

        <option value="School-related Reason">
          SCHOOL-RELATED REASON
        </option>

        <option value="Other">
          OTHER
        </option>

      </select>

    </div>

  )}


  {/* ================================================
      OSY OTHER REASON
  ================================================ */}

  {member.schoolStatus === "Out of School Youth" &&
    member.osyReason === "Other" && (

      <div className="form-group full-width">

        <label>
          Specify Other Reason
        </label>

        <input
          type="text"
          value={member.osyOtherReason}
          onChange={(event) =>
            updateMember(
              familyIndex,
              memberIndex,
              "osyOtherReason",
              event.target.value
            )
          }
          placeholder="ENTER OTHER REASON"
        />

      </div>

  )}

</div>


                        {/* =================================================
    EMPLOYMENT & OCCUPATION
================================================= */}

<div className="subsection-label">
  Employment & Occupation
</div>

<div className="form-grid">

  {/* PRIMARY OCCUPATION */}

  <div className="form-group">

  <label>
    Primary Occupation
  </label>

  <select
    value={member.primaryOccupation}
    disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14}
    className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "age-auto-field" : ""}
    onChange={(event) => {

      const occupation = event.target.value;

      updateMember(
        familyIndex,
        memberIndex,
        "primaryOccupation",
        occupation
      );

      /*
       * Automatic Employment Status
       *
       * These occupations have a fixed status.
       */

      if (
        occupation === "Housewife / Househusband"
      ) {

        updateMember(
          familyIndex,
          memberIndex,
          "employmentStatus",
          "Homemaker"
        );

      } else if (occupation === "Student") {

        updateMember(
          familyIndex,
          memberIndex,
          "employmentStatus",
          "Student"
        );

      } else if (occupation === "Retired") {

        updateMember(
          familyIndex,
          memberIndex,
          "employmentStatus",
          "Retired"
        );

      } else {

        /*
         * For occupations such as:
         * Farmer
         * Fisherman
         * Carpenter
         * Driver
         *
         * the user can choose:
         * Employed or Self-employed.
         */

        const currentStatus =
          member.employmentStatus;

        if (
          currentStatus === "Homemaker" ||
          currentStatus === "Student" ||
          currentStatus === "Retired"
        ) {

          updateMember(
            familyIndex,
            memberIndex,
            "employmentStatus",
            ""
          );

        }

      }

    }}
  >

    <option value="">
      SELECT PRIMARY OCCUPATION
    </option>
    <option value="Not Applicable">NOT APPLICABLE</option>

    <option value="Farmer">
      FARMER
    </option>

    <option value="Fisherman">
      FISHERMAN
    </option>

    <option value="Carpenter">
      CARPENTER
    </option>

    <option value="Construction Worker">
      CONSTRUCTION WORKER
    </option>

    <option value="Driver">
      DRIVER
    </option>

    <option value="Vendor">
      VENDOR
    </option>

    <option value="Business Owner">
      BUSINESS OWNER
    </option>

    <option value="Teacher">
      TEACHER
    </option>

    <option value="Government Employee">
      GOVERNMENT EMPLOYEE
    </option>

    <option value="Private Employee">
      PRIVATE EMPLOYEE
    </option>

    <option value="Housekeeper">
      HOUSEKEEPER / DOMESTIC WORKER
    </option>

    <option value="Housewife / Househusband">
      HOUSEWIFE / HOUSEHUSBAND
    </option>

    <option value="Student">
      STUDENT
    </option>

    <option value="Retired">
      RETIRED
    </option>

    <option value="Other">
      OTHER
    </option>

  </select>

</div>


  {/* EMPLOYMENT STATUS */}

  <div className="form-group">

  <label>
    Employment Status
  </label>

  <select
    value={member.employmentStatus}
    disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14}
    className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "age-auto-field" : ""}
    onChange={(event) => {

      const status = event.target.value;

      updateMember(
        familyIndex,
        memberIndex,
        "employmentStatus",
        status
      );

    }}
  >

    <option value="">
      SELECT STATUS
    </option>
    <option value="Not Applicable">NOT APPLICABLE</option>

    <option value="Employed">
      EMPLOYED
    </option>

    <option value="Self-employed">
      SELF-EMPLOYED
    </option>

    <option value="Unemployed">
      UNEMPLOYED
    </option>

    <option value="Student">
      STUDENT
    </option>

    <option value="Retired">
      RETIRED
    </option>

    <option value="Homemaker">
      HOMEMAKER
    </option>

  </select>

</div>

  {/* OTHER OCCUPATIONS */}

  <div className="form-group full-width">

    <label>
      Other Occupations / Sources of Livelihood
    </label>

    <input
      type="text"
      value={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "NOT APPLICABLE" : member.secondaryOccupations.join(", ")}
      disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14}
      className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "age-auto-field" : ""}
      onChange={(event) => {

        const occupations =
          event.target.value
            .split(",")
            .map((occupation) => occupation.trim())
            .filter(Boolean);

        updateMember(
          familyIndex,
          memberIndex,
          "secondaryOccupations",
          occupations as any
        );

      }}
      placeholder="Example: Fisherman, Carpenter"
    />

    <small>
      Separate multiple occupations with commas.
    </small>

  </div>


  {/* EMPLOYER / BUSINESS */}

  {(
  member.employmentStatus === "Employed" ||
  member.employmentStatus === "Self-employed"
) && (

  <div className="form-group">

    <label>
      {member.employmentStatus === "Employed"
        ? "Employer Name"
        : "Business / Livelihood Name"}
    </label>

    <input
      type="text"
      value={member.employer}
      onChange={(event) =>
        updateMember(
          familyIndex,
          memberIndex,
          "employer",
          event.target.value
        )
      }
      placeholder={
        member.employmentStatus === "Employed"
          ? "Enter employer name"
          : "Enter business or livelihood"
      }
    />

  </div>

)}

  {/* MONTHLY INCOME */}

  <div className="form-group">

    <label>
      Estimated Monthly Income
    </label>

    <input
      type={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "text" : "number"}
      min={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? undefined : "0"}
      value={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "NOT APPLICABLE" : member.monthlyIncome}
      disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14}
      className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "age-auto-field" : ""}
      onChange={(event) =>
        updateMember(
          familyIndex,
          memberIndex,
          "monthlyIncome",
          event.target.value
        )
      }
      placeholder="Monthly income"
    />

  </div>

</div>

                        {/* =================================================
                            SKILLS
                        ================================================= */}

                        <div className="subsection-label">
                          Skills & Specialization
                        </div>

                        <div className="form-grid">

                          <div className="form-group full-width">

                            <label>
                              Skills / Specialties
                            </label>

                            <textarea
                              value={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "NOT APPLICABLE" : member.skills}
                              disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14}
                              className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) <= 14 ? "age-auto-field" : ""}
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "skills",
                                  event.target.value
                                )
                              }
                              placeholder="Example: Fishing, carpentry, welding, farming"
                              rows={3}
                            />

                          </div>

                        </div>

                        {/* =================================================
                            VOTER
                        ================================================= */}

                        <div className="subsection-label">
                          Voter Information
                        </div>

                        <div className="form-grid">

                          <div className="form-group">

                            <label>
                              Voter Status
                            </label>

                            <select
                              value={
                                member.voterStatus
                              }
                              disabled={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) < 18}
                              className={typeof calculateAge(member.birthDate) === "number" && Number(calculateAge(member.birthDate)) < 18 ? "age-auto-field" : ""}
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "voterStatus",
                                  event.target.value
                                )
                              }
                            >

                              <option value="">
                                Select status
                              </option>

                              <option value="Registered Voter">
                                Registered Voter
                              </option>

                              <option value="Not Registered">
                                Not Registered
                              </option>

                              <option value="Not Eligible">
                                Not Eligible
                              </option>

                            </select>

                          </div>

                        </div>

                        {/* =================================================
                            OTHER INFORMATION
                        ================================================= */}

                        <div className="subsection-label">
                          Other Information
                        </div>

                        <div className="form-grid">
                           
                            {/* DISABILITY */}

                          <div className="form-group">

                            <label>
                              Person with Disability
                            </label>

                            <select
                              value={
                                member.disability
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "disability",
                                  event.target.value
                                )
                              }
                            >

                              <option value="">
                                Select
                              </option>

                              <option value="No">
                                No
                              </option>

                              <option value="Yes">
                                Yes
                              </option>

                            </select>

                          </div>

                                                        <div className="form-group">

                            <label>
                              4Ps Member
                            </label>

                            <select
                              value={
                                member.fourPsMember
                              }
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "fourPsMember",
                                  event.target.value
                                )
                              }
                            >

                              <option value="">
                                Select
                              </option>

                              <option value="No">
                                No
                              </option>

                              <option value="Yes">
                                Yes
                              </option>

                            </select>

                          </div>

                          {/* SENIOR CITIZEN */}


                          <div className="form-group">

  <label>
    Senior Citizen
  </label>

  <input
    type="text"
    value={
      (() => {
        const age = Number(calculateAge(member.birthDate));

        if (!member.birthDate || Number.isNaN(age)) {
          return "";
        }

        return age >= 60
          ? "SENIOR CITIZEN"
          : "NOT A SENIOR CITIZEN";
      })()
    }
    readOnly
    placeholder="AUTOMATICALLY DETERMINED FROM AGE"
    
  />
  </div>

</div>

</div>

</>         
                    );
                  }
                )} 

                <div
  className="legacy-member-nav"
  style={{
    display: "flex",
    justifyContent: "center",
    marginTop: "20px",
  }}
><div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    margin: "20px 0",
  }}
>
  {activeMemberIndex > 0 && (
    <button
      type="button"
      onClick={() =>
        setActiveMemberIndex(
          (current) => current - 1
        )
      }
      className="new-census-button"
    >
      ← Previous Member
    </button>
  )}

  {activeMemberIndex < family.members.length - 1 && (
    <button
      type="button"
      onClick={() =>
        setActiveMemberIndex(
          (current) => current + 1
        )
      }
      className="new-census-button"
    >
      Next Member →
    </button>
  )}
</div>
</div>
                </div>

                {censusStep === "family" && (
                  <div className="family-step-footer">
                    <button
                      type="button"
                      className="family-footer-secondary"
                      onClick={() => {
                        setIsMemberEditorOpen(false);
                        setCensusStep("household");
                      }}
                    >
                      ← Previous
                    </button>

                    <div className="family-footer-right">
                      <button
                        type="button"
                        className="family-footer-secondary"
                        onClick={() => setIsMemberEditorOpen(false)}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="family-footer-primary"
                        onClick={() => {
                          const incompleteMember =
                            family.members.find(
                              (member) =>
                                !member.familyMemberName.trim() ||
                                !member.familyRelationship ||
                                !member.familyMemberStatus
                            );

                          if (!family.familyName.trim()) {
                            setValidationError(
                              "Please enter the family name."
                            );

                            window.setTimeout(() => {
                              setValidationError("");
                            }, 2000);

                            return;
                          }

                          if (incompleteMember) {
                            setValidationError(
                              "Please complete the name, relationship, and status of every family member."
                            );

                            window.setTimeout(() => {
                              setValidationError("");
                            }, 2000);

                            return;
                          }

                          setValidationError("");
                          setIsMemberEditorOpen(false);
                          setActiveMemberIndex(0);
                          setCensusStep("resident");
                        }}
                      >
                        Save & Continue
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                )}

                {censusStep === "resident" && (
                  <div className="resident-step-footer">
                    <button
                      type="button"
                      className="resident-footer-secondary"
                      onClick={() => {
                        setIsMemberEditorOpen(false);
                        setCensusStep("family");
                      }}
                    >
                      ← Back to Family
                    </button>

                    <div className="resident-footer-center">
                      <span>
                        Resident {activeMemberIndex + 1} of {family.members.length}
                      </span>
                    </div>

                    <div className="resident-footer-actions">
                      {activeMemberIndex > 0 && (
                        <button
                          type="button"
                          className="resident-footer-secondary"
                          onClick={() =>
                            runResidentNavigation(() =>
                              setActiveMemberIndex((current) => current - 1)
                            )
                          }
                        >
                          ← Previous Member
                        </button>
                      )}

                      {activeMemberIndex < family.members.length - 1 ? (
                        <button
                          type="button"
                          className="resident-footer-primary"
                          onClick={() =>
                            runResidentNavigation(() =>
                              setActiveMemberIndex((current) => current + 1)
                            )
                          }
                        >
                          Save & Next Member →
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="resident-footer-primary"
                          onClick={() =>
                            runResidentNavigation(() => {
                            const ownFamilyMemberIndex = family.members.findIndex(
                              (residentMember) =>
                                residentMember.hasOwnFamily === "Yes"
                            );

                            if (
                              activeFamilyIndex === 0 &&
                              ownFamilyMemberIndex !== -1
                            ) {
                              const linkedResidentKey =
                                `${family.id}-${ownFamilyMemberIndex}`;

                              const linkedFamilyIndex = families.findIndex(
                                (familyItem) =>
                                  familyItem.linkedResidentKey === linkedResidentKey
                              );

                              if (linkedFamilyIndex !== -1) {
                                setActiveFamilyIndex(linkedFamilyIndex);
                              } else {
                                createFamilyFromChild(
                                  activeFamilyIndex,
                                  ownFamilyMemberIndex
                                );
                              }

                              setActiveMemberIndex(0);
                              setIsMemberEditorOpen(false);
                              setCensusStep("family");
                              return;
                            }

                            setActiveMemberIndex(0);
                            setIsMemberEditorOpen(false);
                            setCensusStep("review");
                          })}
                        >
                          Save & Continue →
                        </button>
                      )}
                    </div>
                  </div>
                )}

            </section>
            
      )
    })}

{censusStep === "review" && (
  <section className="review-submit-page">

    <div className="review-main-header">
      <div className="review-step-number">04</div>
      <div className="review-header-icon">
        <ClipboardList size={21} strokeWidth={1.8} />
      </div>
      <div>
        <h3>Review & Submit</h3>
        <p>Please review all information below before submitting the census.</p>
      </div>
    </div>

    <section className="review-section-card">
      <div className="review-section-title">
        <div>
          <House size={17} strokeWidth={1.8} />
          <strong>Household Information</strong>
        </div>
        <button
          type="button"
          className="review-edit-button"
          onClick={() => setCensusStep("household")}
        >
          Edit
        </button>
      </div>

      <div className="review-household-grid">
        <div><span>Household Number</span><strong>{householdNumber || "Not entered"}</strong></div>
        <div><span>House Number</span><strong>{houseNumber || "Not entered"}</strong></div>
        <div><span>Street</span><strong>{street || "Not selected"}</strong></div>
        <div><span>Purok</span><strong>{purok || "Not selected"}</strong></div>
        <div><span>Barangay</span><strong>{reviewBarangayName}</strong></div>
        <div><span>Municipality</span><strong>{reviewMunicipalityName}</strong></div>
        <div><span>Province</span><strong>{reviewProvinceName}</strong></div>
        <div><span>Region</span><strong>{reviewRegionName}</strong></div>
      </div>
    </section>

    <section className="review-section-card">
      <div className="review-section-title">
        <div>
          <UsersRound size={17} strokeWidth={1.8} />
          <strong>Families & Members</strong>
        </div>
        <span className="review-overview-pill">
          {families.length} {families.length === 1 ? "Family" : "Families"} • {totalResidents} Residents
        </span>
      </div>

      <div className="review-family-stack">
        {families.map((reviewFamily, reviewFamilyIndex) => {
          const reviewHead = reviewFamily.members.find(
            (member) => member.familyRelationship === "Family Head"
          );
          const isExpanded = expandedReviewFamilyIndex === reviewFamilyIndex;

          return (
            <div className={`review-family-card ${isExpanded ? "expanded" : ""}`} key={reviewFamily.id}>
              <div className="review-family-summary">
                <div className="review-family-number">{String(reviewFamilyIndex + 1).padStart(2, "0")}</div>
                <div className="review-family-summary-text">
                  <strong>Family {reviewFamilyIndex + 1}</strong>
                  <span>{reviewFamily.familyName || "Unnamed Family"}</span>
                  <small>Family Head: {reviewHead ? getResidentDisplayName(reviewHead) : "Not selected"}</small>
                </div>
                <div className="review-family-member-count">
                  <strong>{reviewFamily.members.length}</strong>
                  <span>{reviewFamily.members.length === 1 ? "Member" : "Members"}</span>
                </div>
                <div className="review-family-summary-actions">
                  <button
                    type="button"
                    className="review-edit-button"
                    onClick={() => {
                      setActiveFamilyIndex(reviewFamilyIndex);
                      setActiveMemberIndex(0);
                      setIsMemberEditorOpen(false);
                      setCensusStep("family");
                    }}
                  >
                    Edit Family
                  </button>
                  <button
                    type="button"
                    className="review-see-members-button"
                    onClick={() =>
                      setExpandedReviewFamilyIndex(isExpanded ? null : reviewFamilyIndex)
                    }
                  >
                    {isExpanded ? "Hide Members ↑" : "See Members ↓"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="review-member-list">
                  {reviewFamily.members.map((member, memberIndex) => {
                    const memberKey = `${reviewFamily.id}-${memberIndex}`;
                    const linkedFamilyIndex = families.findIndex(
                      (familyItem) => familyItem.linkedResidentKey === memberKey
                    );

                    return (
                      <div className="review-member-item" key={memberIndex}>
                        <div className="review-member-index">{memberIndex + 1}</div>
                        <div className="review-member-details">
                          <strong>{getResidentDisplayName(member)}</strong>
                          <small>{getResidentId(member) || "ID pending"}</small>
                          <span>
                            {member.familyRelationship || "Relationship not selected"}
                            {member.familyMemberStatus ? ` • ${member.familyMemberStatus}` : ""}
                            {linkedFamilyIndex !== -1 ? ` • Own Family → Family ${linkedFamilyIndex + 1}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="review-view-button"
                          onClick={() => {
                            setActiveFamilyIndex(reviewFamilyIndex);
                            setActiveMemberIndex(memberIndex);
                            setIsMemberEditorOpen(false);
                            setCensusStep("resident");
                          }}
                        >
                          View / Edit
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="review-info-note">
        <Info size={14} strokeWidth={1.8} />
        <span>Click “View / Edit” on any member to review or update resident information.</span>
      </div>
    </section>

    {validationError && (
      <div className="validation-error review-validation-error">
        {validationError}
      </div>
    )}

    <div className="review-footer">
      <div className="review-footer-left">
      <button
        type="button"
        className="review-secondary-button"
        onClick={() => {
          const lastFamilyIndex = Math.max(families.length - 1, 0);
          const lastMemberIndex = Math.max(
            (families[lastFamilyIndex]?.members.length || 1) - 1,
            0
          );
          setActiveFamilyIndex(lastFamilyIndex);
          setActiveMemberIndex(lastMemberIndex);
          setCensusStep("resident");
        }}
      >
        ← Back to Residents
      </button>
        <button type="button" className="review-secondary-button">Cancel</button>
      </div>

        <button
          type="button"
          className="review-submit-button"
          onClick={() => {
            for (let familyIndex = 0; familyIndex < families.length; familyIndex++) {
              const familyToCheck = families[familyIndex];

              if (!familyToCheck || familyToCheck.members.length === 0) {
                setValidationError(`Family ${familyIndex + 1} must have at least one resident.`);
                return;
              }

              for (let memberIndex = 0; memberIndex < familyToCheck.members.length; memberIndex++) {
                const member = familyToCheck.members[memberIndex];
                const missingFields: string[] = [];

                if (!member.firstName.trim()) missingFields.push("First Name");
                if (!member.lastName.trim()) missingFields.push("Last Name");
                if (!member.birthDate) missingFields.push("Date of Birth");
                if (!member.birthPlace.trim()) missingFields.push("Place of Birth");
                if (!member.sex) missingFields.push("Sex");
                if (!member.civilStatus) missingFields.push("Civil Status");
                if (!member.nationality) missingFields.push("Nationality");
                if (!member.religion) missingFields.push("Religion");

                if (missingFields.length > 0) {
                  setActiveFamilyIndex(familyIndex);
                  setActiveMemberIndex(memberIndex);
                  setValidationError(
                    `Family ${familyIndex + 1}, Resident ${memberIndex + 1}: Please complete ${missingFields.join(", ")}.`
                  );
                  window.setTimeout(() => setValidationError(""), 3500);
                  return;
                }
              }
            }

            setValidationError("");
            finalSubmitButtonRef.current?.click();
          }}
        >
          Submit Census
        </button>
    </div>

    <p className="review-submit-note">
      Please ensure all information is correct before submitting.
    </p>
  </section>
)}

</div>

      <aside className="census-side-panel">

  <section className="context-card review-only-card review-summary-card">
    <div className="context-card-title">
      <ClipboardList size={16} strokeWidth={1.8} />
      <span>Census Summary</span>
    </div>
    <div className="review-summary-list">
      <div><span>Household</span><strong>1</strong></div>
      <div><span>Families</span><strong>{families.length}</strong></div>
      <div><span>Total Residents</span><strong>{totalResidents}</strong></div>
      <div><span>Additional Families</span><strong>{additionalFamilyCount}</strong></div>
      <div className="review-summary-total"><span>Total Individuals</span><strong>{totalResidents}</strong></div>
    </div>
  </section>

  <section className="context-card review-only-card review-completion-card">
    <div className="context-card-title review-green-title">
      <CheckCircle2 size={16} strokeWidth={1.8} />
      <span>Completion Status</span>
    </div>
    <div className="review-completion-list">
      <div><CheckCircle2 size={14} /><span><strong>Household Information</strong><small>Completed</small></span></div>
      <div><CheckCircle2 size={14} /><span><strong>Family Information</strong><small>Completed</small></span></div>
      <div><CheckCircle2 size={14} /><span><strong>Resident Information</strong><small>Completed</small></span></div>
      <div><CheckCircle2 size={14} /><span><strong>Review & Submit</strong><small>Current Step</small></span></div>
    </div>
  </section>

  <section className="context-card review-only-card review-how-card">
    <div className="context-card-title">
      <Info size={16} strokeWidth={1.8} />
      <span>How it works</span>
    </div>
    <ol className="review-how-list">
      <li>Review all information for accuracy.</li>
      <li>Use “Edit” or “View / Edit” to make changes.</li>
      <li>Click “Submit Census” to finalize.</li>
      <li>Verify everything before submission.</li>
    </ol>
  </section>

  <section className="context-card review-only-card review-help-card">
    <div className="context-card-title">
      <Info size={16} strokeWidth={1.8} />
      <span>Need Help?</span>
    </div>
    <p>If you find any issues, go back and edit the information before submitting.</p>
  </section>

  {/* =========================================
      CONTEXT
  ========================================= */}

  <section className="context-card">

    <div className="context-card-title">
      <UsersRound size={16} strokeWidth={1.8} />

      <span>
        {censusStep === "household"
          ? "Household Context"
          : "Family Context"}
      </span>
    </div>

    {censusStep === "household" ? (

      <div className="context-details">

        <div>
          <span>Household Number</span>
          <strong>
            {householdNumber || "Not yet entered"}
          </strong>
        </div>

        <div>
          <span>House Number</span>
          <strong>
            {houseNumber || "Not yet entered"}
          </strong>
        </div>

        <div>
          <span>Purok</span>
          <strong>
            {purok || "Not selected"}
          </strong>
        </div>

        <div>
          <span>Street</span>
          <strong>
            {street || "Automatic"}
          </strong>
        </div>

      </div>

    ) : (

      <div className="context-details">

        <div>
          <span>Family Name</span>
          <strong>
            {currentFamily?.familyName ||
              "Not yet entered"}
          </strong>
        </div>

        <div>
          <span>Family Head</span>
          <strong>
            {currentFamilyHeadName ||
              "Not yet selected"}
          </strong>
        </div>

        <div>
          <span>Total Members</span>
          <strong>
            {currentFamily?.members.length || 0}
          </strong>
        </div>

        <div>
          <span>Additional Families</span>
          <strong>
            {Math.max(families.length - 1, 0)}
          </strong>
        </div>

        {activeFamilyIndex > 0 && (
          <button
            type="button"
            className="back-family-one-button"
            onClick={() => {
              setActiveFamilyIndex(0);
              setActiveMemberIndex(0);
              setIsMemberEditorOpen(false);
              setCensusStep("family");
            }}
          >
            ← Back to Family 1
          </button>
        )}

      </div>

    )}

  </section>


  {/* =========================================
      MEMBERS LIST
  ========================================= */}

  <section className="context-card">

    <div className="context-card-title">
      <UsersRound size={16} strokeWidth={1.8} />

      <span>Members List</span>
    </div>

    {censusStep === "household" ? (

      <div className="context-empty-state">

        <ClipboardList
          size={21}
          strokeWidth={1.7}
        />

        <strong>
          Family members will appear here
        </strong>

        <p>
          Complete the household information
          first, then continue to Family
          Information.
        </p>

      </div>

    ) : currentFamily?.members.length ? (

      <div className="context-member-list">

        {currentFamily.members.map(
          (member, index) => {

            const memberName =
              [
                member.firstName,
                member.middleName,
                member.lastName,
                member.suffix,
              ]
                .filter(Boolean)
                .join(" ") ||
              `Member ${index + 1}`;

            const memberLinkedFamilyKey = currentFamily
              ? `${currentFamily.id}-${index}`
              : "";

            const memberLinkedFamilyIndex = families.findIndex(
              (familyItem) =>
                familyItem.linkedResidentKey === memberLinkedFamilyKey
            );

            return (
              <div
                className="context-member-row"
                key={index}
              >

                <span className="member-number">
                  {index + 1}
                </span>

                <div className="member-summary">

                  <strong>
                    {memberName}
                  </strong>

                  {member.hasOwnFamily ===
                    "Yes" && (
                    <>
                      <small>
                        Has Own Family: Yes
                      </small>

                      <button
                        type="button"
                        className="open-own-family-button"
                        onClick={() => {
                          if (memberLinkedFamilyIndex !== -1) {
                            setActiveFamilyIndex(memberLinkedFamilyIndex);
                          } else {
                            createFamilyFromChild(activeFamilyIndex, index);
                          }

                          setActiveMemberIndex(0);
                          setIsMemberEditorOpen(false);
                          setCensusStep("family");
                        }}
                      >
                        {memberLinkedFamilyIndex !== -1
                          ? `Open Family ${memberLinkedFamilyIndex + 1} →`
                          : "Set Up Own Family →"}
                      </button>
                    </>
                  )}

                </div>

                {member.familyRelationship && (
                  <span className="member-role">
                    {member.familyRelationship}
                  </span>
                )}

              </div>
            );
          }
        )}

      </div>

    ) : (

      <div className="context-empty-state">
        No members added yet.
      </div>

    )}

  </section>


  {/* =========================================
      HOW IT WORKS
  ========================================= */}

  <section className="context-card logic-card">

    <div className="context-card-title">
      <Info size={16} strokeWidth={1.8} />

      <span>
        How it works
      </span>
    </div>

    {censusStep === "household" ? (

      <>
        <p className="logic-question">
          Complete the household first.
        </p>

        <ol className="logic-list">
          <li>
            Enter the household identification.
          </li>

          <li>
            Select the complete location.
          </li>

          <li>
            Purok automatically determines the
            street.
          </li>

          <li>
            Save & Continue opens Family
            Information.
          </li>
        </ol>

        <div className="logic-example">
          Next: Family Information
          <ArrowRight
            size={14}
            strokeWidth={1.8}
          />
        </div>
      </>

    ) : (

      <>
        <p className="logic-question">
          When you mark "Yes" in Has Own
          Family:
        </p>

        <ol className="logic-list">
          <li>
            The member is identified as having
            a separate family unit.
          </li>

          <li>
            That member may become the Family
            Head of an additional family.
          </li>

          <li>
            Members of that new family will be
            encoded separately.
          </li>
        </ol>

        {ownFamilyMembers.length > 0 && (
          <div className="logic-example">

            <CheckCircle2
              size={14}
              strokeWidth={1.8}
            />

            {ownFamilyMembers.length} member
            {ownFamilyMembers.length !== 1
              ? "s"
              : ""}{" "}
            marked Yes

          </div>
        )}
      </>

    )}

  </section>


  {/* =========================================
      PROGRESS
  ========================================= */}

  <section className="context-card progress-card">

    <div className="context-card-title">
      <ClipboardList
        size={16}
        strokeWidth={1.8}
      />

      <span>Progress</span>
    </div>

    <div className="context-progress-heading">

      <span>
        {censusStep === "household"
          ? "Household Information"
          : `Family ${activeFamilyIndex + 1}`}
      </span>

      <strong>
        {censusStep === "household"
          ? `${householdProgress}%`
          : `${currentFamily?.members.length || 0} members`}
      </strong>

    </div>

    <div className="context-progress-track">

      <div
        className="context-progress-fill"
        style={{
          width:
            censusStep === "household"
              ? `${householdProgress}%`
              : "50%",
        }}
      />

    </div>

    <p className="context-progress-text">
      {censusStep === "household"
        ? `${completedHouseholdFields} of ${householdRequiredValues.length} required household fields completed`
        : "Family information is currently being encoded."}
    </p>

  </section>


  {/* =========================================
      BOTTOM NOTE
  ========================================= */}

  <div className="context-save-note">

    <CheckCircle2
      size={16}
      strokeWidth={1.8}
    />

    <p>
      Click "Save & Continue" to proceed
      without submitting the census yet.
    </p>

  </div>

</aside>

</div>

{censusStep === "household" && (
  <section className="census-next-flow">

    <div className="census-next-flow-title">
      <span>Step 1</span>

      <div>
        <strong>Household Information</strong>
        <small>What happens next?</small>
      </div>
    </div>


    <div className="census-flow-items">

      <div className="census-flow-item active">
        <div className="census-flow-icon">
          <House size={17} strokeWidth={1.8} />
        </div>

        <div>
          <strong>Household</strong>
          <span>Complete household details</span>
        </div>
      </div>


      <ArrowRight
        className="census-flow-arrow"
        size={17}
        strokeWidth={1.7}
      />


      <div className="census-flow-item">
        <div className="census-flow-icon">
          <UsersRound size={17} strokeWidth={1.8} />
        </div>

        <div>
          <strong>Family</strong>
          <span>Add family members</span>
        </div>
      </div>


      <ArrowRight
        className="census-flow-arrow"
        size={17}
        strokeWidth={1.7}
      />


      <div className="census-flow-item">
        <div className="census-flow-icon">
          <ClipboardList size={17} strokeWidth={1.8} />
        </div>

        <div>
          <strong>Resident</strong>
          <span>Complete individual details</span>
        </div>
      </div>


      <ArrowRight
        className="census-flow-arrow"
        size={17}
        strokeWidth={1.7}
      />


      <div className="census-flow-item">
        <div className="census-flow-icon">
          <CheckCircle2 size={17} strokeWidth={1.8} />
        </div>

        <div>
          <strong>Review & Submit</strong>
          <span>Check all information</span>
        </div>
      </div>

    </div>

  </section>
)}


 
        {/* =================================================
            SUBMIT
        ================================================= */}

        
         <div className="form-actions">

  {validationError && (
    <div className="validation-error">
      ⚠️ {validationError}
    </div>
  )}

  <button
    ref={finalSubmitButtonRef}
    type="button"
    className="next-button"
    onClick={() => {

      console.log("SUBMIT BUTTON CLICKED");

  // Check household information
  if (
  !householdNumber.trim() ||
  !houseNumber.trim() ||
  !street.trim() ||
  !purok.trim()
) {
  const errors: Record<string, boolean> = {};

  if (!householdNumber.trim()) {
    errors.householdNumber = true;
  }

  if (!houseNumber.trim()) {
    errors.houseNumber = true;
  }

  if (!street.trim()) {
    errors.street = true;
  }

  if (!purok.trim()) {
    errors.purok = true;
  }

  setValidationFields(errors);
  setValidationError(
    "Please complete the required household information."
  );

  setTimeout(() => {
  setValidationError("");
}, 1500);

  return;
}

  // Check if there is at least one family
  if (families.length === 0) {
  setValidationError(
    "Please add at least one family."
  );

  setTimeout(() => {
  setValidationError("");
}, 1500);

  return;
}

  // =================================================
// CHECK ALL FAMILY RESIDENT INFORMATION
// =================================================

for (
  let familyIndex = 0;
  familyIndex < families.length;
  familyIndex++
) {
  const familyToValidate = families[familyIndex];

  if (!familyToValidate || familyToValidate.members.length === 0) {
    setValidationError(
      `Family ${familyIndex + 1} must have at least one resident.`
    );

    setTimeout(() => {
      setValidationError("");
    }, 1500);

    return;
  }

  for (
    let memberIndex = 0;
    memberIndex < familyToValidate.members.length;
    memberIndex++
  ) {
    const member = familyToValidate.members[memberIndex];
    const missingFields: string[] = [];

    if (!member.firstName.trim()) missingFields.push("First Name");
    if (!member.lastName.trim()) missingFields.push("Last Name");
    if (!member.birthDate) missingFields.push("Date of Birth");
    if (!member.birthPlace.trim()) missingFields.push("Place of Birth");
    if (!member.sex) missingFields.push("Sex");
    if (!member.civilStatus) missingFields.push("Civil Status");
    if (!member.nationality) missingFields.push("Nationality");
    if (!member.religion) missingFields.push("Religion");

    if (missingFields.length > 0) {
      setActiveFamilyIndex(familyIndex);
      setActiveMemberIndex(memberIndex);
      setValidationError(
        `Family ${familyIndex + 1}, Resident ${
          memberIndex + 1
        }: Please complete ${missingFields.join(", ")}.`
      );

      setTimeout(() => {
        setValidationError("");
      }, 3000);

      return;
    }
  }
}

setValidationError("");

const selectedRegionName =
  regions.find((item) => item.code === region)?.name || "";

const selectedProvinceName =
  provinces.find((item) => item.code === province)?.name || "";

const selectedMunicipalityName =
  municipalities.find(
    (item) => item.code === municipality
  )?.name || "";

const selectedBarangayName =
  barangays.find(
    (item) => item.code === barangay
  )?.name || "";

const censusData: CensusData = {
  householdNumber,

  household: {
    houseNumber,

    region: selectedRegionName,
    province: selectedProvinceName,
    municipality: selectedMunicipalityName,
    barangay: selectedBarangayName,

    purok,
    street,

    currentAddress,
    previousAddress,
    yearsInBarangay,
  },

  families,
};

// =================================================
// ADDITIONAL FAMILY
// ONLY FAMILY 1 CAN CREATE THE NEXT FAMILY
// =================================================

if (activeFamilyIndex === 0) {
  const memberIndex = currentFamily.members.findIndex(
    (member) => member.hasOwnFamily === "Yes"
  );

  if (memberIndex !== -1) {
    const linkedResidentKey = `${currentFamily.id}-${memberIndex}`;
    const linkedFamilyIndex = families.findIndex(
      (familyItem) =>
        familyItem.linkedResidentKey === linkedResidentKey
    );

    if (linkedFamilyIndex === -1) {
      createFamilyFromChild(activeFamilyIndex, memberIndex);

      alert(
        "Please fill up the information for the additional family."
      );

      return;
    }
  }
}

  onSubmitCensus(censusData);

  console.log(
    "BARANGAY CENSUS DATA",
    censusData
  );

  }}
style={{
  display: "none",

}}

>
            Submit Census Form →

          </button>

        </div>

      </main>

    </div>
  );
}

export default HouseholdPrototype;