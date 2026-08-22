import { useEffect, useState } from "react";
import "./App.css";

type Resident = {
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;

  birthDate: string;
  height?: string;
  weight?: string;
  birthPlace: string;
  sex: string;
  civilStatus: string;

  contactNumber: string;
  email: string;

  education: string;
  schoolStatus: string;
  schoolLevel: string;

  elementarySchool: string;
  juniorHighSchool: string;
  seniorHighSchool: string;
  collegeUniversity: string;
  postgraduateSchool: string;
  
  shsStrand: string;
  course: string;
  specialization: string;
  osyReason: string;
  osyOtherReason: string;

 primaryOccupation: string;
  secondaryOccupations: string[];
  employmentStatus: string;
  employer: string;
  monthlyIncome: string;


  skills: string;

  voterStatus: string;
  nationality: string;
  religion: string;
  fourPsMember: string;
  disability: string;
  seniorCitizen: string;

  hasOwnFamily: string;

  familyMemberName: string;
familyRelationship: string;
familyMemberStatus: string;
};


type Family = {
  id: number;
  familyName: string;
  linkedResidentKey: string | null;
  members: Resident[];
};
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
});
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
  members: [createResident(), createResident()],
});

type HouseholdPrototypeProps = {
  onSubmitCensus: (data: any) => void;
};

function splitFullName(fullName: string) {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: "",
      middleName: "",
      lastName: "",
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      middleName: "",
      lastName: "",
    };
  }

  if (parts.length === 2) {
    return {
      firstName: parts[0],
      middleName: "",
      lastName: parts[1],
    };
  }

  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

function HouseholdPrototype({
  onSubmitCensus,
}: HouseholdPrototypeProps) {
  /* =====================================================
     HOUSEHOLD INFORMATION
  ===================================================== */

  const [householdNumber, setHouseholdNumber] =
    useState("");

  const [houseNumber, setHouseNumber] =
    useState("");

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

  /* =====================================================
     FAMILY MEMBER COUNT
     
     IMPORTANT:
     There is NO plus/minus button.
     The user types the number directly.
  ===================================================== */

  const changeMemberCount = (
    familyIndex: number,
    value: number
  ) => {
    if (!Number.isFinite(value)) {
      return;
    }

    const count = Math.max(
      2,
      Math.min(30, Math.floor(value))
    );

    setFamilies((current) => {
      const updated = [...current];

      const family = {
        ...updated[familyIndex],
        members: [...updated[familyIndex].members],
      };

      while (family.members.length < count) {
        family.members.push(createResident());
      }

      while (family.members.length > count) {
        family.members.pop();
      }

      updated[familyIndex] = family;

      return updated;
    });
  };

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

  /* =====================================================
     DETERMINE ROLE
     
     Every family follows:

     Member 1 = Family Head
     Member 2 = Spouse
     Member 3+ = Child
  ===================================================== */
const getRelationship = (
  member: Resident,
  memberIndex: number
): string => {
  if (member.familyRelationship) {
    return member.familyRelationship;
  }

  if (memberIndex === 0) {
    return "Family Head";
  }

  return "";
};

  /* =====================================================
     CREATE FAMILY FROM CHILD
  ===================================================== */

  const createFamilyFromChild = (
    familyIndex: number,
    memberIndex: number
  ) => {
    setFamilies((current) => {
      const sourceFamily = current[familyIndex];

      if (!sourceFamily) {
        return current;
      }

      const linkedResidentKey =
        `${sourceFamily.id}-${memberIndex}`;

      const alreadyExists = current.some(
        (family) =>
          family.linkedResidentKey ===
          linkedResidentKey
      );

      if (alreadyExists) {
        return current;
      }

      const sourceResident =
        sourceFamily.members[memberIndex];

      if (!sourceResident) {
        return current;
      }

      const newFamilyId =
        Math.max(
          ...current.map(
            (family) => family.id
          )
        ) + 1;

      /*
       * The child becomes the Family Head
       * of the new family.
       *
       * We copy the child's information so the
       * new family can have its own family data.
       */

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
          createResident(),
        ],
      };

      return [
        ...current,
        newFamily,
      ];
    });
  };

  /* =====================================================
     REMOVE FAMILY CREATED BY CHILD
  ===================================================== */

  const removeFamilyFromChild = (
    familyIndex: number,
    memberIndex: number
  ) => {
    setFamilies((current) => {
      const sourceFamily =
        current[familyIndex];

      if (!sourceFamily) {
        return current;
      }

      const linkedResidentKey =
        `${sourceFamily.id}-${memberIndex}`;

      return current.filter(
        (family) =>
          family.id === 1 ||
          family.linkedResidentKey !==
            linkedResidentKey
      );
    });
  };

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

    if (value === "Yes") {
      createFamilyFromChild(
        familyIndex,
        memberIndex
      );
    }

    if (value === "No") {
      removeFamilyFromChild(
        familyIndex,
        memberIndex
      );
    }
  };

  /* =====================================================
     PAGE
  ===================================================== */

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

        {/* =================================================
            HOUSEHOLD INFORMATION
        ================================================= */}

        <section className="form-card">

          <div className="section-title">

            <span>
              01
            </span>

            <div>

              <h3>
                Household Information
              </h3>

              <p>
                Basic information about the residence
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
  className={
    validationFields.householdNumber
      ? "input-error"
      : ""
  }
  onChange={(event) => {
    setHouseholdNumber(event.target.value);

    setValidationFields((prev) => ({
      ...prev,
      householdNumber: false,
    }));
  }}
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
  className={
    validationFields.houseNumber
      ? "input-error"
      : ""
  }
  onChange={(event) => {
    setHouseNumber(event.target.value);

    setValidationFields((prev) => ({
      ...prev,
      houseNumber: false,
    }));
  }}
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

        </section>

        {/* =================================================
            FAMILIES
        ================================================= */}

        {families.map(
          (family, familyIndex) => (

            <section
              className="form-card"
              key={family.id}
            >

              {/* FAMILY HEADER */}

              <div className="section-title">

                <span>
                  {String(
                    familyIndex + 2
                  ).padStart(2, "0")}
                </span>

                <div>

                  <h3>
                    Family {familyIndex + 1}
                  </h3>

                  <p>
                    {family.linkedResidentKey
                      ? "Automatically created family"
                      : "Family information"}
                  </p>

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

              <div className="subsection">

                <h4>
                  Family Information
                </h4>

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

                  {/* NUMBER OF FAMILY MEMBERS */}

                  <div className="form-group">

                    <label>
                      Number of Family Members *
                    </label>

                    <input
                      type="number"
                      min="2"
                      max="30"
                      value={
                        family.members.length
                      }
                      onChange={(event) =>
                        changeMemberCount(
                          familyIndex,
                          Number(
                            event.target.value
                          )
                        )
                      }
                      placeholder="Enter number of members"
                    />

                  </div>

                </div>

              </div>
        

              {/* =================================================
                  FAMILY MEMBERS
              ================================================= */}

              <div className="subsection">
<h4>
  Name of Family Members
</h4>

                {family.members.map(
                  (
                    member,
                    memberIndex
                  ) => {

                    const role =
  
                    getRelationship(
                      member,
                      memberIndex
                    );

                    return (
                      <>

                        {/* FAMILY MEMBER BASIC INFORMATION */}

<div className="subsection">
  <div className="subsection-label">
    Family Member Information
  </div>

  <div className="form-grid">

    {/* FULL NAME */}

    <div className="form-group">
      <label>
        Full Name *
      </label>

      <input
        type="text"
        value={member.familyMemberName}
        onChange={(event) => {
  const fullName = event.target.value;

  const parsedName = splitFullName(fullName);

  updateMember(
    familyIndex,
    memberIndex,
    "familyMemberName",
    fullName
  );

  updateMember(
    familyIndex,
    memberIndex,
    "firstName",
    parsedName.firstName
  );

  updateMember(
    familyIndex,
    memberIndex,
    "middleName",
    parsedName.middleName
  );

  updateMember(
    familyIndex,
    memberIndex,
    "lastName",
    parsedName.lastName
  );
}}
        placeholder="Full name of family member"
      />
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
          Select relationship
        </option>

        {memberIndex === 0 && (
          <option value="Family Head">
            Family Head
          </option>
        )}

        {memberIndex !== 0 && (
          <>
            <option value="Spouse">
              Spouse
            </option>

            <option value="Child">
              Child
            </option>

            <option value="Grandchild">
              Grandchild
            </option>

            <option value="Grandparent">
              Grandparent
            </option>

            <option value="Parent">
              Parent
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
          </>
        )}
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
</div>

<div
  className="resident-card"
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
                              value={
                                member.firstName
                              }                       
                                readOnly
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
  readOnly
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
                              value={
                                member.lastName
                              }
                              readOnly
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
                                updateMember(
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

                        {memberIndex > 0 && (

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
      value={member.secondaryOccupations.join(", ")}
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
      type="number"
      min="0"
      value={member.monthlyIncome}
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
                              value={
                                member.skills
                              }
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
                </div> 
            </section>
          ))}
                

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

  // Check resident information
  for (const family of families) {
    if (family.members.length === 0) {
  setValidationError(
    "Each family must have at least one resident."
  );
  return;
}

    for (const member of family.members) {
     if (
  !member.firstName.trim() ||
  !member.lastName.trim() ||
  !member.birthDate ||
  !member.birthPlace.trim() ||
  !member.sex ||
  !member.civilStatus ||
  !member.nationality ||
  !member.religion
) {
  setValidationError(
    "Please complete all required resident information before submitting."
  );

  setTimeout(() => {
  setValidationError("");
}, 1500);

  return;
}
    }
  }

  setValidationError("");

  const censusData = {
    householdNumber,
    household: {
      houseNumber,
      street,
      purok,
      yearsInBarangay,
      previousAddress,
    },
    families,
  };

  onSubmitCensus(censusData);

  console.log(
    "BARANGAY CENSUS DATA",
    censusData
  );
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