import { useEffect, useRef, useState } from "react";
import "../../App.css";
import { supabase } from "../../services/supabaseClient";
import {
  House,
  UsersRound,
  Info,
  ClipboardList,
  CheckCircle2,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import type {
  Resident,
  Family,
  CensusData,
} from "../../types/census";

import {
  findPossibleFamilyConnections,
} from "../../services/censusStorage";
import {
  deleteCensusLocalDraft,
  getCensusLocalDrafts,
  markCensusDraftPendingSync,
  saveCensusLocalDraft,
  type CensusLocalDraft,
} from "../../services/censusDraftStorage";

import type {
  PossibleFamilyConnection,
  PendingFamilyLink,
} from "../../services/censusStorage";

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

function formatFormalName(value: string): string {
  const suffixMap: Record<string, string> = {
    "jr": "Jr.",
    "jr.": "Jr.",
    "sr": "Sr.",
    "sr.": "Sr.",
    "ii": "II",
    "iii": "III",
    "iv": "IV",
    "v": "V",
  };

  return value
    .trim()
    .split(/\s+/)
    .map((word) => {
      const suffix = suffixMap[word.toLowerCase()];
      if (suffix) return suffix;

      return word
        .toLowerCase()
        .replace(/(^|[-'])([a-z])/g, (_, prefix: string, letter: string) =>
          `${prefix}${letter.toUpperCase()}`
        );
    })
    .join(" ");
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

function createDraftId(): string {
  if (
    typeof crypto !== "undefined" &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }

  return `draft-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

type HouseholdPrototypeProps = {
  ownerId: string;
  onSubmitCensus: (
    data: CensusData
  ) => boolean | Promise<boolean>;
  draftId?: string | null;
  onDraftsChanged?: () => void;
  onSaveDraftAndExit?: () => void;
  onQueuePendingSync?: (
    draftId: string,
    data: CensusData
  ) => void;
};

function HouseholdPrototype({
  ownerId,
  onSubmitCensus,
  draftId,
  onDraftsChanged,
  onSaveDraftAndExit,
  onQueuePendingSync,
}: HouseholdPrototypeProps) {

  const [restoredDraft] = useState<CensusLocalDraft | null>(
    () =>
      draftId
        ? getCensusLocalDrafts(ownerId).find(
            (draft) => draft.draftId === draftId
          ) ?? null
        : null
  );

  const [currentDraftId] = useState(
    () => restoredDraft?.draftId ??
      draftId ??
      createDraftId()
  );

  const [censusStep, setCensusStep] = useState<
  "household" | "family" | "resident" | "review"
>(restoredDraft?.censusStep ?? "household");

  /* =====================================================
     HOUSEHOLD INFORMATION
  ===================================================== */

  const [householdNumber] = useState(() =>
    restoredDraft?.householdNumber ||
    generateHouseholdNumber()
  );

  const [houseNumber] = useState(() =>
    restoredDraft?.houseNumber ||
    generateHouseNumber(householdNumber)
  );

  const [street, setStreet] =
    useState(restoredDraft?.street ?? "");

  const [purok, setPurok] =
    useState(restoredDraft?.purok ?? "");

  type CachedBarangayProfile = {
    regionName: string;
    regionCode: string;
    province: string;
    provinceCode: string;
    municipality: string;
    municipalityCode: string;
    barangayName: string;
    barangayCode: string;
  };

  const BARANGAY_PROFILE_CACHE_KEY =
    "barangay-census:barangay-profile:v1";

  const readCachedBarangayProfile =
    (): CachedBarangayProfile | null => {
      try {
        const raw = localStorage.getItem(
          BARANGAY_PROFILE_CACHE_KEY
        );
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.barangayName
          ? (parsed as CachedBarangayProfile)
          : null;
      } catch {
        return null;
      }
    };

  const cachedBarangayProfile =
    readCachedBarangayProfile();

  const [barangayProfile, setBarangayProfile] =
    useState<CachedBarangayProfile | null>(
      cachedBarangayProfile
    );

  const [locationLoading, setLocationLoading] =
    useState(
      !cachedBarangayProfile && navigator.onLine
    );

  const [region, setRegion] = useState(
    restoredDraft?.region ||
      cachedBarangayProfile?.regionCode ||
      ""
  );
  const [province, setProvince] = useState(
    restoredDraft?.province ||
      cachedBarangayProfile?.provinceCode ||
      ""
  );
  const [municipality, setMunicipality] = useState(
    restoredDraft?.municipality ||
      cachedBarangayProfile?.municipalityCode ||
      ""
  );
  const [barangay, setBarangay] = useState(
    restoredDraft?.barangay ||
      cachedBarangayProfile?.barangayCode ||
      ""
  );

  useEffect(() => {
    let cancelled = false;

    const loadBarangayProfile = async () => {
      if (!navigator.onLine) {
        setLocationLoading(false);
        return;
      }

      setLocationLoading(true);

      const { data, error } = await supabase
        .from("barangay_settings")
        .select(`
          region_name,
          region_code,
          province,
          province_code,
          municipality,
          municipality_code,
          barangay_name,
          barangay_code
        `)
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error(
          "FAILED TO LOAD BARANGAY PROFILE:",
          error
        );
        if (!cancelled) setLocationLoading(false);
        return;
      }

      if (data?.barangay_name && !cancelled) {
        const profile: CachedBarangayProfile = {
          regionName: data.region_name || "",
          regionCode: data.region_code || "",
          province: data.province || "",
          provinceCode: data.province_code || "",
          municipality: data.municipality || "",
          municipalityCode:
            data.municipality_code || "",
          barangayName: data.barangay_name || "",
          barangayCode: data.barangay_code || "",
        };

        setBarangayProfile(profile);
        localStorage.setItem(
          BARANGAY_PROFILE_CACHE_KEY,
          JSON.stringify(profile)
        );

        setRegion((current) => current || profile.regionCode);
        setProvince((current) => current || profile.provinceCode);
        setMunicipality(
          (current) => current || profile.municipalityCode
        );
        setBarangay((current) => current || profile.barangayCode);
      }

      if (!cancelled) setLocationLoading(false);
    };

    void loadBarangayProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const [yearsInBarangay, setYearsInBarangay] =
    useState(restoredDraft?.yearsInBarangay ?? "");

  const [previousAddress, setPreviousAddress] =
    useState(restoredDraft?.previousAddress ?? "");

  const locationRegionName =
    barangayProfile?.regionName || "";
  const locationProvinceName =
    barangayProfile?.province || "";
  const locationMunicipalityName =
    barangayProfile?.municipality || "";
  const locationBarangayName =
    barangayProfile?.barangayName || "";

  const currentAddress = [
    purok,
    street,
    locationBarangayName,
    locationMunicipalityName,
    locationProvinceName,
    locationRegionName,
  ].filter(Boolean).join(", ");

    const [validationError, setValidationError] =
  useState("");

  const [validationFields, setValidationFields] =
  useState<Record<string, boolean>>({});

  const [
    draftSaveStatus,
    setDraftSaveStatus,
  ] = useState<"saving" | "saved">("saved");

  const [
    draftLastSavedAt,
    setDraftLastSavedAt,
  ] = useState<Date | null>(null);

  const draftSaveStatusTimerRef =
    useRef<number | null>(null);

  /* =====================================================
     FAMILY DATA
  ===================================================== */

  const [families, setFamilies] = useState<Family[]>(
    restoredDraft?.families?.length
      ? restoredDraft.families
      : [createFamily(1)]
  );

  const [activeFamilyIndex, setActiveFamilyIndex] =
    useState(restoredDraft?.activeFamilyIndex ?? 0);

  const [activeMemberIndex, setActiveMemberIndex] =
    useState(restoredDraft?.activeMemberIndex ?? 0);

  const [isMemberEditorOpen, setIsMemberEditorOpen] =
  useState(false);

  const [isMembersListModalOpen, setIsMembersListModalOpen] =
    useState(false);

  const [isOwnFamilyModalOpen, setIsOwnFamilyModalOpen] =
    useState(false);

  const [pendingFamilyLinks, setPendingFamilyLinks] =
    useState<PendingFamilyLink[]>(
      restoredDraft?.pendingFamilyLinks ?? []
    );

  const [
    possibleFamilyConnections,
    setPossibleFamilyConnections,
  ] = useState<PossibleFamilyConnection[]>([]);

  const [
    isPossibleFamilyModalOpen,
    setIsPossibleFamilyModalOpen,
  ] = useState(false);

  const [
    possibleFamilyTarget,
    setPossibleFamilyTarget,
  ] = useState<{
    familyIndex: number;
    memberIndex: number;
  } | null>(null);

  const [
    selectedPossibleFamilyUuids,
    setSelectedPossibleFamilyUuids,
  ] = useState<string[]>([]);

  const [
    possibleFamilyRelationship,
    setPossibleFamilyRelationship,
  ] = useState("");

  const [
    possibleFamilyChecking,
    setPossibleFamilyChecking,
  ] = useState(false);

  const [
    possibleFamilyError,
    setPossibleFamilyError,
  ] = useState("");

  const dismissedFamilyConnectionKeysRef =
    useRef<Set<string>>(new Set());

const addMemberLockRef = useRef(false);

const finalSubmitButtonRef = useRef<HTMLButtonElement | null>(null);
const residentNavLockRef = useRef(false);
const [residentTransitioning, setResidentTransitioning] = useState(false);

const [isSubmittingCensus, setIsSubmittingCensus] = useState(false);
const [expandedReviewFamilyIndex, setExpandedReviewFamilyIndex] = useState<number | null>(null);

const [
  showSaveDraftExitConfirm,
  setShowSaveDraftExitConfirm,
] = useState(false);

useEffect(() => {
  const savedAt = new Date();

  const draft: CensusLocalDraft = {
    version: 1,
    draftId: currentDraftId,
    updatedAt: savedAt.toISOString(),
    status: "draft",
    pendingData: undefined,
    censusStep,
    householdNumber,
    houseNumber,
    street,
    purok,
    region,
    province,
    municipality,
    barangay,
    yearsInBarangay,
    previousAddress,
    families,
    activeFamilyIndex,
    activeMemberIndex,
    pendingFamilyLinks,
  };

  // The status reflects the local persistence this effect performs.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setDraftSaveStatus("saving");

  if (draftSaveStatusTimerRef.current !== null) {
    window.clearTimeout(
      draftSaveStatusTimerRef.current
    );
  }

  try {
    saveCensusLocalDraft(ownerId, draft);
    setDraftLastSavedAt(savedAt);

    draftSaveStatusTimerRef.current =
      window.setTimeout(() => {
        setDraftSaveStatus("saved");
      }, 350);
  } catch (error) {
    console.error(
      "FAILED TO AUTOSAVE CENSUS DRAFT:",
      error
    );
  }

  return () => {
    if (draftSaveStatusTimerRef.current !== null) {
      window.clearTimeout(
        draftSaveStatusTimerRef.current
      );
    }
  };
}, [
  censusStep,
  currentDraftId,
  ownerId,
  householdNumber,
  houseNumber,
  street,
  purok,
  region,
  province,
  municipality,
  barangay,
  yearsInBarangay,
  previousAddress,
  families,
  activeFamilyIndex,
  activeMemberIndex,
  pendingFamilyLinks,
]);

useEffect(() => {
  onDraftsChanged?.();
}, [
  censusStep,
  street,
  purok,
  region,
  province,
  municipality,
  barangay,
  yearsInBarangay,
  previousAddress,
  families,
  activeFamilyIndex,
  activeMemberIndex,
]);


const hasMeaningfulDraftData =
  Boolean(
    street ||
    purok ||
    region ||
    province ||
    municipality ||
    barangay ||
    yearsInBarangay ||
    previousAddress ||
    families.some(
      (family) =>
        Boolean(family.familyName) ||
        family.members.some((member) =>
          Boolean(
            member.firstName ||
            member.middleName ||
            member.lastName ||
            member.birthDate ||
            member.familyRelationship ||
            member.familyMemberStatus
          )
        )
    )
  );

useEffect(() => {
  if (!hasMeaningfulDraftData) {
    return;
  }

  const handleBeforeUnload = (
    event: BeforeUnloadEvent
  ) => {
    event.preventDefault();
    event.returnValue = "";
  };

  window.addEventListener(
    "beforeunload",
    handleBeforeUnload
  );

  return () => {
    window.removeEventListener(
      "beforeunload",
      handleBeforeUnload
    );
  };
}, [hasMeaningfulDraftData]);


const runResidentNavigation = (action: () => void) => {
  if (residentNavLockRef.current) {
    return;
  }

  residentNavLockRef.current = true;
  setResidentTransitioning(true);

  action();

  window.setTimeout(() => {
    document
      .querySelector(".resident-step-mode")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, 80);

  window.setTimeout(() => {
    residentNavLockRef.current = false;
    setResidentTransitioning(false);
  }, 420);
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

const removeFamilyMember = (familyIndex: number, memberIndex: number) => {
  const targetFamily = families[familyIndex];
  const targetMember = targetFamily?.members[memberIndex];

  if (!targetFamily || !targetMember) return;

  const memberName =
    targetMember.familyMemberName ||
    [targetMember.firstName, targetMember.middleName, targetMember.lastName, targetMember.suffix]
      .filter(Boolean)
      .join(" ") ||
    `Member ${memberIndex + 1}`;

  if (!window.confirm(`Remove ${memberName} from this draft family?`)) return;

  const deletedMemberKey = `${targetFamily.id}-${memberIndex}`;

  setFamilies((current) =>
    current
      .filter((family) => family.linkedResidentKey !== deletedMemberKey)
      .map((family) => {
        if (family.id === targetFamily.id) {
          return {
            ...family,
            members: family.members.filter((_, index) => index !== memberIndex),
          };
        }

        if (!family.linkedResidentKey) return family;

        const [sourceFamilyIdText, sourceMemberIndexText] =
          family.linkedResidentKey.split("-");

        const sourceFamilyId = Number(sourceFamilyIdText);
        const sourceMemberIndex = Number(sourceMemberIndexText);

        if (
          sourceFamilyId === targetFamily.id &&
          sourceMemberIndex > memberIndex
        ) {
          return {
            ...family,
            linkedResidentKey: `${targetFamily.id}-${sourceMemberIndex - 1}`,
          };
        }

        return family;
      })
  );

  setActiveMemberIndex((current) => {
    if (current > memberIndex) return current - 1;
    if (current === memberIndex) return Math.max(0, memberIndex - 1);
    return current;
  });

  setIsMemberEditorOpen(false);
};

useEffect(() => {
  // Restore missing stable IDs after rehydrating a local draft.
  // eslint-disable-next-line react-hooks/set-state-in-effect
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

      const currentHead = family.members[0] as ResidentWithIdentity;

      const syncedHead = {
        ...sourceResident,
        residentId: getResidentId(sourceResident),
        familyRelationship:
          currentHead?.familyRelationship ?? "Family Head",
        hasOwnFamily: "",
      } as ResidentWithIdentity;

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

  const skillChoices = [
    "Farming",
    "Fishing",
    "Gardening",
    "Animal Raising",
    "Coconut Farming",
    "Carpentry",
    "Masonry",
    "Welding",
    "Electrical",
    "Plumbing",
    "Painting",
    "Mechanic / Auto Repair",
    "Driving",
    "Cooking",
    "Baking",
    "Food Processing",
    "Sewing / Dressmaking",
    "Haircut / Barbering",
    "Beauty Care",
    "Caregiving",
    "Selling / Vending",
    "Entrepreneurship",
    "Handicraft Making",
    "Computer / IT",
    "Computer Encoding",
    "Graphic Design",
    "Photography / Video Editing",
  ] as const;

  const getSelectedSkills = (resident: Resident): string[] =>
    String(resident.skills || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => item !== "Not Applicable");

  const setResidentSkills = (
    familyIndex: number,
    memberIndex: number,
    skills: string[]
  ) => {
    updateMember(
      familyIndex,
      memberIndex,
      "skills",
      Array.from(new Set(skills.map((item) => item.trim()).filter(Boolean))).join(", ")
    );
  };

  const occupationChoices = [
    "Farmer",
    "Fisherman",
    "Carpenter",
    "Construction Worker",
    "Driver",
    "Vendor",
    "Business Owner",
    "Teacher",
    "Government Employee",
    "Private Employee",
    "Housekeeper",
    "Housewife / Househusband",
    "Student",
    "Retired",
  ] as const;

  const getSelectedOccupations = (resident: Resident): string[] => {
    const values = [
      resident.primaryOccupation,
      ...(Array.isArray(resident.secondaryOccupations)
        ? resident.secondaryOccupations
        : []),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .filter((value) => value !== "Not Applicable");

    return Array.from(new Set(values));
  };

  const setResidentOccupations = (
    familyIndex: number,
    memberIndex: number,
    occupations: string[]
  ) => {
    setFamilies((current) => {
      const updated = [...current];
      const targetFamily = updated[familyIndex];
      if (!targetFamily) return current;

      const members = [...targetFamily.members];
      const currentMember = members[memberIndex];
      if (!currentMember) return current;

      const uniqueOccupations = Array.from(
        new Set(occupations.map((item) => item.trim()).filter(Boolean))
      );

      const nextMember: Resident = {
        ...currentMember,
        primaryOccupation: uniqueOccupations[0] || "",
        secondaryOccupations: uniqueOccupations.slice(1),
      };

      const fixedStatuses = uniqueOccupations
        .map((occupation) => {
          if (occupation === "Housewife / Househusband") return "Homemaker";
          if (occupation === "Student") return "Student";
          if (occupation === "Retired") return "Retired";
          return "";
        })
        .filter(Boolean);

      if (fixedStatuses.length === 1 && uniqueOccupations.length === 1) {
        nextMember.employmentStatus = fixedStatuses[0];
      } else if (
        ["Homemaker", "Student", "Retired"].includes(
          String(nextMember.employmentStatus || "")
        )
      ) {
        nextMember.employmentStatus = "";
      }

      members[memberIndex] = nextMember;
      updated[familyIndex] = { ...targetFamily, members };
      return updated;
    });
  };

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


  const updateFamilyRelationship = (
    familyIndex: number,
    memberIndex: number,
    value: string
  ) => {
    const targetFamily = families[familyIndex];
    const targetMember = targetFamily?.members[memberIndex];

    if (!targetFamily || !targetMember) return;

    if (value === "Family Head") {
      const existingHeadIndex = targetFamily.members.findIndex(
        (member, index) =>
          index !== memberIndex &&
          member.familyRelationship === "Family Head"
      );

      if (existingHeadIndex !== -1) {
        const existingHead = targetFamily.members[existingHeadIndex];

        const existingHeadName = getResidentDisplayName(existingHead);
        const newHeadName = getResidentDisplayName(targetMember);

        const confirmed = window.confirm(
          `${existingHeadName} is currently the Family Head. ` +
          `Set ${newHeadName} as the new Family Head?`
        );

        if (!confirmed) return;
      }

      setFamilies((current) => {
        const updated = [...current];
        const family = updated[familyIndex];

        if (!family) return current;

        const members = family.members.map((member, index) => {
          if (index === memberIndex) {
            return {
              ...member,
              familyRelationship: "Family Head",
            };
          }

          if (member.familyRelationship === "Family Head") {
            return {
              ...member,
              familyRelationship: "",
            };
          }

          return member;
        });

        updated[familyIndex] = {
          ...family,
          members,
        };

        return updated;
      });

      return;
    }

    updateMember(
      familyIndex,
      memberIndex,
      "familyRelationship",
      value
    );
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
    // Apply derived age rules to the census form model.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const getFamilyConnectionKey = (
    familyIndex: number,
    memberIndex: number
  ) => {
    const targetMember =
      families[familyIndex]?.members[memberIndex];

    return targetMember
      ? `${getResidentId(targetMember)}:${targetMember.middleName}:${targetMember.lastName}`
      : `${familyIndex}:${memberIndex}`;
  };

  const closePossibleFamilyModal = () => {
    if (possibleFamilyTarget) {
      dismissedFamilyConnectionKeysRef.current.add(
        getFamilyConnectionKey(
          possibleFamilyTarget.familyIndex,
          possibleFamilyTarget.memberIndex
        )
      );
    }

    setIsPossibleFamilyModalOpen(false);
    setPossibleFamilyConnections([]);
    setSelectedPossibleFamilyUuids([]);
    setPossibleFamilyRelationship("");
    setPossibleFamilyError("");
    setPossibleFamilyTarget(null);
  };

  const familyHasConfirmedExternalLink = (
    familyIndex: number
  ): boolean => {
    const targetFamily = families[familyIndex];
    if (!targetFamily) return false;

    const residentIds = new Set(
      targetFamily.members
        .map((member) => getResidentId(member))
        .filter(Boolean)
    );

    return pendingFamilyLinks.some((link) =>
      residentIds.has(link.residentId)
    );
  };

  const checkPossibleFamilyConnection = async (
    familyIndex: number,
    memberIndex: number
  ): Promise<boolean> => {
    const targetMember =
      families[familyIndex]?.members[memberIndex];

    if (!targetMember || !navigator.onLine) {
      return false;
    }

    const relationship =
      targetMember.familyRelationship || "";

    // The automatic family-origin suggestion is only useful for
    // the Family Head or Spouse. Children and other members do not
    // trigger another suggestion.
    if (
      relationship !== "Family Head" &&
      relationship !== "Spouse"
    ) {
      return false;
    }

    // Once either the Family Head or Spouse confirms an external
    // family connection, do not ask the other partner again for
    // this same household family.
    if (familyHasConfirmedExternalLink(familyIndex)) {
      return false;
    }

    if (
      targetMember.familyMemberStatus !== "Alive" ||
      !targetMember.firstName.trim() ||
      !targetMember.lastName.trim()
    ) {
      return false;
    }

    const connectionKey =
      getFamilyConnectionKey(familyIndex, memberIndex);

    if (
      dismissedFamilyConnectionKeysRef.current.has(connectionKey) ||
      pendingFamilyLinks.some(
        (link) => link.residentId === getResidentId(targetMember)
      )
    ) {
      return false;
    }

    setPossibleFamilyChecking(true);
    setPossibleFamilyError("");

    try {
      const middleNameParts =
        targetMember.middleName
          .trim()
          .split(/\s+/)
          .filter(Boolean);

      const surnameCandidates = Array.from(
        new Set(
          [
            targetMember.lastName,
            targetMember.middleName,
            middleNameParts.at(-1) || "",
          ].filter(Boolean)
        )
      );

      const matches =
        await findPossibleFamilyConnections(
          surnameCandidates
        );

      if (!matches.length) {
        dismissedFamilyConnectionKeysRef.current.add(connectionKey);
        return false;
      }

      setPossibleFamilyConnections(matches);
      setPossibleFamilyTarget({
        familyIndex,
        memberIndex,
      });
      setSelectedPossibleFamilyUuids(
        matches.length === 1
          ? [matches[0].familyUuid]
          : []
      );
      setPossibleFamilyRelationship("");
      setIsPossibleFamilyModalOpen(true);
      return true;
    } catch (error) {
      console.error(
        "FAILED TO CHECK POSSIBLE FAMILY CONNECTION:",
        error
      );
      return false;
    } finally {
      setPossibleFamilyChecking(false);
    }
  };

  const confirmPossibleFamilyConnection = () => {
    if (!possibleFamilyTarget) return;

    const selectedFamilies =
      possibleFamilyConnections.filter(
        (item) =>
          selectedPossibleFamilyUuids.includes(
            item.familyUuid
          )
      );

    const targetMember =
      families[possibleFamilyTarget.familyIndex]
        ?.members[possibleFamilyTarget.memberIndex];

    if (!selectedFamilies.length || !targetMember) {
      setPossibleFamilyError(
        "Please select the related family."
      );
      return;
    }

    if (!possibleFamilyRelationship) {
      setPossibleFamilyError(
        "Please select the resident's relationship to that family."
      );
      return;
    }

    const residentId = getResidentId(targetMember);

    if (!residentId) {
      setPossibleFamilyError(
        "Resident ID is not ready yet. Close this window and try Done again."
      );
      return;
    }

    const relationship =
      possibleFamilyRelationship as
        | "Child"
        | "Parent";

    // A child belongs to one direct parent-family context in this
    // workflow. A parent, however, may have several already-encoded
    // children living in separate households, so Parent supports
    // multiple selected family heads.
    const familiesToLink =
      relationship === "Child"
        ? selectedFamilies.slice(0, 1)
        : selectedFamilies;

    const nextLinks: PendingFamilyLink[] =
      familiesToLink.map((selectedFamily) => ({
        residentId,
        sourceFamilyNumber:
          Number(
            families[
              possibleFamilyTarget.familyIndex
            ]?.id
          ),
        targetFamilyUuid: selectedFamily.familyUuid,
        targetFamilyName: selectedFamily.familyName,
        targetHouseholdNumber:
          selectedFamily.householdNumber,
        targetFamilyHeadResidentUuid:
          selectedFamily.familyHeadResidentUuid,
        relationship,
      }));

    setPendingFamilyLinks((current) => [
      ...current.filter(
        (item) => item.residentId !== residentId
      ),
      ...nextLinks,
    ]);

    closePossibleFamilyModal();
    setIsMemberEditorOpen(false);
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
  ? formatFormalName(
      [
        currentFamilyHead.firstName,
        currentFamilyHead.middleName,
        currentFamilyHead.lastName,
        currentFamilyHead.suffix,
      ]
        .filter(Boolean)
        .join(" ")
    )
  : "";

const totalResidents = families.reduce(
  (total, family) => total + family.members.length,
  0
);

const additionalFamilyCount = Math.max(families.length - 1, 0);

const getResidentMissingFields = (member: Resident): string[] => {
  const missingFields: string[] = [];
  const age = calculateAge(member.birthDate);

  if (!member.firstName.trim()) missingFields.push("First Name");
  if (!member.lastName.trim()) missingFields.push("Last Name");
  if (!member.birthDate) missingFields.push("Date of Birth");
  if (!member.sex) missingFields.push("Sex");
  if (!member.civilStatus) missingFields.push("Civil Status");
  if (!member.familyRelationship) missingFields.push("Relationship to Family Head");
  if (!member.familyMemberStatus) missingFields.push("Member Status");

  // Residents 15+ must have at least one occupation/livelihood selected.
  // Ages 0-14 are automatically marked Not Applicable by the existing age logic.
  if (typeof age === "number" && age >= 15 && getSelectedOccupations(member).length === 0) {
    missingFields.push("Occupation / Source of Livelihood");
  }

  // Under 18 is automatically Not Eligible; adults must explicitly select voter status.
  if (!member.voterStatus) missingFields.push("Voter Status");

  // 4Ps must always be answered Yes or No.
  if (!member.fourPsMember) missingFields.push("4Ps Member");

  const requiresShsHistory =
    member.education === "Senior High School Level" ||
    member.education === "Senior High School Graduate" ||
    member.education === "Vocational / Technical" ||
    member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate";

  if (requiresShsHistory) {
    if (!member.seniorHighSchool) {
      missingFields.push("Senior High School Applicability");
    } else if (member.seniorHighSchool === "__SHS_APPLICABLE__") {
      missingFields.push("Senior High School");
    }

    if (
      member.seniorHighSchool &&
      member.seniorHighSchool !== "__SHS_APPLICABLE__" &&
      member.seniorHighSchool !== "Not Applicable - Pre-K-12 Curriculum" &&
      !member.shsStrand
    ) {
      missingFields.push("SHS Strand");
    }
  }

  return missingFields;
};

const getResidentDisplayName = (member: Resident) => {
  const rawName =
    [
      member.firstName,
      member.middleName,
      member.lastName,
      member.suffix,
    ]
      .filter(Boolean)
      .join(" ") ||
    member.familyMemberName ||
    "";

  return rawName
    ? formatFormalName(rawName)
    : "Unnamed Resident";
};

const reviewRegionName =
  locationRegionName || region || "Not configured";
const reviewProvinceName =
  locationProvinceName || province || "Not configured";
const reviewMunicipalityName =
  locationMunicipalityName || municipality || "Not configured";
const reviewBarangayName =
  locationBarangayName || barangay || "Not configured";

const ownFamilySetupItems = families.flatMap((sourceFamily, sourceFamilyIndex) =>
  sourceFamily.members
    .map((member, memberIndex) => ({
      sourceFamily,
      sourceFamilyIndex,
      member,
      memberIndex,
      linkedResidentKey: `${sourceFamily.id}-${memberIndex}`,
    }))
    .filter(({ member }) => member.hasOwnFamily === "Yes")
    .map((item) => ({
      ...item,
      linkedFamilyIndex: families.findIndex(
        (familyItem) =>
          familyItem.linkedResidentKey === item.linkedResidentKey
      ),
    }))
);

const pendingOwnFamilyCount = ownFamilySetupItems.filter(
  (item) => item.linkedFamilyIndex === -1
).length;

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
            {locationBarangayName
              ? `${locationBarangayName} • ${locationMunicipalityName} • ${locationProvinceName}`
              : "Barangay location not configured"}
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

          <div
            aria-live="polite"
            style={{
              marginTop: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "999px",
              border:
                draftSaveStatus === "saving"
                  ? "1px solid #bfdbfe"
                  : "1px solid #bbf7d0",
              background:
                draftSaveStatus === "saving"
                  ? "#eff6ff"
                  : "#f0fdf4",
              color:
                draftSaveStatus === "saving"
                  ? "#1d4ed8"
                  : "#15803d",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background:
                  draftSaveStatus === "saving"
                    ? "#2563eb"
                    : "#16a34a",
              }}
            />

            <span>
              {draftSaveStatus === "saving"
                ? "Saving draft..."
                : "Saved to Draft"}
            </span>

            {draftSaveStatus === "saved" &&
              draftLastSavedAt && (
                <span
                  style={{
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  •{" "}
                  {draftLastSavedAt.toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </span>
              )}
          </div>

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

        {censusStep === "resident" && (
          <div className="resident-section-stepper" aria-label="Resident progress">
            {(currentFamily?.members || []).map((residentOption: Resident, residentOptionIndex: number) => (
              <div className="resident-section-step-item" key={residentOptionIndex}>
                <button
                  type="button"
                  className={`resident-section-step ${residentOptionIndex === activeMemberIndex ? "active" : ""} ${residentOptionIndex < activeMemberIndex ? "completed" : ""}`}
                  onClick={() =>
                    runResidentNavigation(() => {
                      setActiveMemberIndex(residentOptionIndex);
                    })
                  }
                  aria-current={residentOptionIndex === activeMemberIndex ? "step" : undefined}
                  title={getResidentDisplayName(residentOption)}
                >
                  <span>{residentOptionIndex < activeMemberIndex ? "✓" : residentOptionIndex + 1}</span>
                  <small>Resident {residentOptionIndex + 1}</small>
                </button>
                {residentOptionIndex < (currentFamily?.members.length || 0) - 1 && (
                  <div className={`resident-section-line ${residentOptionIndex < activeMemberIndex ? "completed" : ""}`} />
                )}
              </div>
            ))}
          </div>
        )}

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

            {/* REGISTERED BARANGAY LOCATION */}
<div
  className="form-group full-width"
  style={{
    padding: "16px",
    border: "1px solid #dbe7f3",
    borderRadius: "12px",
    background: "#f8fbff",
  }}
>
  <label>Registered Barangay Location</label>

  {locationLoading ? (
    <div style={{ color: "#64748b" }}>
      Loading configured barangay...
    </div>
  ) : barangayProfile ? (
    <>
      <strong
        style={{
          display: "block",
          color: "#172033",
          fontSize: "15px",
        }}
      >
        {[
          locationBarangayName,
          locationMunicipalityName,
          locationProvinceName,
          locationRegionName,
        ]
          .filter(Boolean)
          .join(", ")}
      </strong>

      <small
        style={{
          display: "block",
          marginTop: "5px",
          color: "#64748b",
        }}
      >
        Configured by the Secretary in System Settings.
        This location is automatically used for this census.
      </small>
    </>
  ) : (
    <div
      style={{
        color: "#b42318",
        fontWeight: 700,
      }}
    >
      Barangay location is not available on this device.
      Configure Barangay Information in Settings while
      online first.
    </div>
  )}
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
      onClick={() =>
        setShowSaveDraftExitConfirm(true)
      }
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
            navigator.onLine
              ? "Barangay location is not configured. Please configure Barangay Information in Settings first."
              : "Barangay location is not available offline on this device. Connect while online and open the census form once to load the configured location before continuing offline."
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
                      onBlur={() => {
                        if (family.familyName.trim()) {
                          updateFamilyName(
                            familyIndex,
                            formatFormalName(
                              family.familyName
                            )
                          );
                        }
                      }}
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

      const tableMemberRawName =
        tableMember.familyMemberName ||
        [
          tableMember.firstName,
          tableMember.middleName,
          tableMember.lastName,
          tableMember.suffix,
        ]
          .filter(Boolean)
          .join(" ");

      const tableMemberName = tableMemberRawName
        ? formatFormalName(tableMemberRawName)
        : `Member ${tableMemberIndex + 1}`;

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

            <>
              <button
                type="button"
                className="family-icon-action family-edit-member"
                onClick={() => {
                  setActiveMemberIndex(tableMemberIndex);
                  setIsMemberEditorOpen(true);
                }}
                title="Edit member"
                aria-label={`Edit ${tableMemberName}`}
              >
                <Pencil size={15} strokeWidth={1.9} />
              </button>

              <button
                type="button"
                className="family-icon-action family-remove-member"
                onClick={() =>
                  removeFamilyMember(familyIndex, tableMemberIndex)
                }
                title="Remove member from draft"
                aria-label={`Remove ${tableMemberName}`}
              >
                <Trash2 size={15} strokeWidth={1.9} />
              </button>
            </>

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
  .map((member) => {

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


                        {/* FAMILY MEMBER BASIC INFORMATION */}

{isMemberEditorOpen && (
  <div
    className="family-member-modal-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setIsMemberEditorOpen(false);
      }
    }}
  >
    <div
      className="subsection family-member-edit-panel family-member-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="family-member-modal-title"
    >

  <div className="family-member-modal-header">
    <div>
      <span className="family-member-modal-kicker">Family {familyIndex + 1} • Member {memberIndex + 1}</span>
      <div className="subsection-label" id="family-member-modal-title">
        Family Member Information
      </div>
    </div>
    <button
      type="button"
      className="family-modal-close-icon"
      onClick={() => setIsMemberEditorOpen(false)}
      title="Close"
      aria-label="Close family member editor"
    >
      <X size={18} strokeWidth={1.9} />
    </button>
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
    updateFamilyRelationship(
      familyIndex,
      memberIndex,
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
      disabled={possibleFamilyChecking}
      onClick={async () => {
        if (
          !member.firstName.trim() ||
          !member.lastName.trim() ||
          !member.familyRelationship ||
          !member.familyMemberStatus
        ) {
          setValidationError(
            "Please complete the required Family Member Information first."
          );
          window.setTimeout(
            () => setValidationError(""),
            2500
          );
          return;
        }

        const openedConnectionModal =
          await checkPossibleFamilyConnection(
            familyIndex,
            memberIndex
          );

        if (!openedConnectionModal) {
          setIsMemberEditorOpen(false);
        }
      }}
    >
      {possibleFamilyChecking
        ? "Checking..."
        : "Done"}
    </button>
  </div>

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
        <h3>{getResidentDisplayName(member) || `Resident ${memberIndex + 1}`}</h3>
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
            {getResidentDisplayName(residentOption) ||
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

<>
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


</>

<>
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
                          


</>

<>
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

</>

<>
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
      JUNIOR HIGH / OLD-CURRICULUM HIGH SCHOOL HISTORY
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
          Junior High School / High School (Old Curriculum)
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
          placeholder="ENTER JUNIOR HIGH SCHOOL OR OLD-CURRICULUM HIGH SCHOOL"
        />

      </div>

  )}


  {/* ================================================
      SENIOR HIGH SCHOOL HISTORY / PRE-K-12
  ================================================ */}

  {(member.education === "Senior High School Level" ||
    member.education === "Senior High School Graduate" ||
    member.education === "Vocational / Technical" ||
    member.education === "College Undergraduate" ||
    member.education === "College Graduate" ||
    member.education === "Postgraduate") && (

    <>
      <div className="form-group full-width">

        <label>
          Senior High School Applicability
        </label>

        <select
          value={
            member.seniorHighSchool === "Not Applicable - Pre-K-12 Curriculum"
              ? "NOT_APPLICABLE_PRE_K12"
              : member.seniorHighSchool === "__SHS_APPLICABLE__" ||
                Boolean(member.seniorHighSchool) ||
                Boolean(member.shsStrand)
              ? "APPLICABLE"
              : ""
          }
          onChange={(event) => {
            const value = event.target.value;

            if (value === "NOT_APPLICABLE_PRE_K12") {
              updateMember(
                familyIndex,
                memberIndex,
                "seniorHighSchool",
                "Not Applicable - Pre-K-12 Curriculum"
              );
              updateMember(
                familyIndex,
                memberIndex,
                "shsStrand",
                ""
              );
              return;
            }

            if (value === "APPLICABLE") {
              if (
                !member.seniorHighSchool ||
                member.seniorHighSchool ===
                  "Not Applicable - Pre-K-12 Curriculum"
              ) {
                updateMember(
                  familyIndex,
                  memberIndex,
                  "seniorHighSchool",
                  "__SHS_APPLICABLE__"
                );
              }
              return;
            }

            updateMember(
              familyIndex,
              memberIndex,
              "seniorHighSchool",
              ""
            );
            updateMember(
              familyIndex,
              memberIndex,
              "shsStrand",
              ""
            );
          }}
        >

          <option value="">
            SELECT APPLICABILITY
          </option>

          <option value="APPLICABLE">
            APPLICABLE — ATTENDED / ATTENDING SENIOR HIGH SCHOOL
          </option>

          <option value="NOT_APPLICABLE_PRE_K12">
            NOT APPLICABLE — PRE-K-12 / OLD CURRICULUM
          </option>

        </select>

        <small style={{ display: "block", marginTop: "6px", color: "#64748b" }}>
          Select Not Applicable for residents whose high-school education followed
          the old curriculum before Senior High School was part of K-12.
        </small>

      </div>

      {member.seniorHighSchool !== "Not Applicable - Pre-K-12 Curriculum" &&
        Boolean(member.seniorHighSchool || member.shsStrand) && (

        <>
          <div className="form-group full-width">

            <label>
              Senior High School
            </label>

            <input
              type="text"
              value={
                member.seniorHighSchool === "__SHS_APPLICABLE__"
                  ? ""
                  : member.seniorHighSchool
              }
              onChange={(event) =>
                updateMember(
                  familyIndex,
                  memberIndex,
                  "seniorHighSchool",
                  event.target.value || "__SHS_APPLICABLE__"
                )
              }
              placeholder="ENTER SENIOR HIGH SCHOOL"
            />

          </div>

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

              <option value="STEM">STEM</option>
              <option value="ABM">ABM</option>
              <option value="HUMSS">HUMSS</option>
              <option value="GAS">GAS</option>
              <option value="TVL">TVL</option>
              <option value="Arts and Design">ARTS AND DESIGN</option>
              <option value="Sports">SPORTS</option>
              <option value="Other">OTHER</option>

            </select>

          </div>
        </>

      )}

    </>

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



</>

<>
                        {/* =================================================
    EMPLOYMENT & OCCUPATION
================================================= */}

<div className="subsection-label">
  Employment & Occupation
</div>

<div className="form-grid">

  {/* MULTIPLE OCCUPATIONS / SOURCES OF LIVELIHOOD */}
  <div className="form-group full-width">
    <label>Occupations / Sources of Livelihood *</label>

    {typeof calculateAge(member.birthDate) === "number" &&
    Number(calculateAge(member.birthDate)) <= 14 ? (
      <input
        type="text"
        value="NOT APPLICABLE"
        disabled
        className="age-auto-field"
      />
    ) : (
      <>
        <small style={{ display: "block", marginBottom: "10px" }}>
          Select all occupations that apply to this resident.
        </small>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
            gap: "4px 12px",
          }}
        >
          {occupationChoices.map((occupation) => {
            const selectedOccupations = getSelectedOccupations(member);
            const checked = selectedOccupations.includes(occupation);

            return (
              <label
                key={occupation}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "3px 2px",
                  border: "none",
                  borderRadius: "4px",
                  background: "transparent",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11px",
                  lineHeight: 1.2,
                }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  style={{
                    width: "14px",
                    height: "14px",
                    minWidth: "14px",
                    margin: 0,
                    cursor: "pointer",
                  }}
                  onChange={(event) => {
                    const current = getSelectedOccupations(member);
                    const customOccupations = current.filter(
                      (item) =>
                        !occupationChoices.includes(
                          item as (typeof occupationChoices)[number]
                        )
                    );

                    const standardOccupations = current.filter((item) =>
                      occupationChoices.includes(
                        item as (typeof occupationChoices)[number]
                      )
                    );

                    const nextStandard = event.target.checked
                      ? Array.from(new Set([...standardOccupations, occupation]))
                      : standardOccupations.filter(
                          (item) => item !== occupation
                        );

                    setResidentOccupations(
                      familyIndex,
                      memberIndex,
                      [...nextStandard, ...customOccupations]
                    );
                  }}
                />
                <span>{occupation.toUpperCase()}</span>
              </label>
            );
          })}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 2px",
              border: "none",
              borderRadius: "4px",
              background: "transparent",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "11px",
              lineHeight: 1.2,
            }}
          >
            <input
              type="checkbox"
              style={{
                width: "14px",
                height: "14px",
                minWidth: "14px",
                margin: 0,
                cursor: "pointer",
              }}
              checked={getSelectedOccupations(member).some(
                (item) =>
                  !occupationChoices.includes(
                    item as (typeof occupationChoices)[number]
                  )
              )}
              onChange={(event) => {
                const current = getSelectedOccupations(member);
                const standard = current.filter((item) =>
                  occupationChoices.includes(
                    item as (typeof occupationChoices)[number]
                  )
                );

                setResidentOccupations(
                  familyIndex,
                  memberIndex,
                  event.target.checked ? [...standard, "Other"] : standard
                );
              }}
            />
            <span>OTHER</span>
          </label>
        </div>

        {getSelectedOccupations(member).some(
          (item) =>
            !occupationChoices.includes(
              item as (typeof occupationChoices)[number]
            )
        ) && (
          <div style={{ marginTop: "10px" }}>
            <label>Specify Other Occupation(s)</label>
            <input
              type="text"
              value={getSelectedOccupations(member)
                .filter(
                  (item) =>
                    !occupationChoices.includes(
                      item as (typeof occupationChoices)[number]
                    ) && item !== "Other"
                )
                .join(", ")}
              onChange={(event) => {
                const standard = getSelectedOccupations(member).filter(
                  (item) =>
                    occupationChoices.includes(
                      item as (typeof occupationChoices)[number]
                    )
                );

                const custom = event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean);

                setResidentOccupations(
                  familyIndex,
                  memberIndex,
                  [...standard, ...(custom.length ? custom : ["Other"])]
                );
              }}
              placeholder="Example: Tailor, Mechanic, Online Seller"
            />
            <small>Separate multiple occupations with commas.</small>
          </div>
        )}
      </>
    )}
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

                        <div className="form-group full-width" style={{ marginTop: "14px", marginBottom: "14px" }}>
                          <label>Skills / Specialties</label>

                          {typeof calculateAge(member.birthDate) === "number" &&
                          Number(calculateAge(member.birthDate)) <= 14 ? (
                            <input
                              type="text"
                              value="NOT APPLICABLE"
                              disabled
                              className="age-auto-field"
                            />
                          ) : (
                            (() => {
                              const selectedSkills = getSelectedSkills(member);
                              const customSkills = selectedSkills.filter(
                                (skill) => !skillChoices.includes(skill as (typeof skillChoices)[number])
                              );
                              const hasOtherSkill = customSkills.length > 0;

                              return (
                                <>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                                      gap: "4px 12px",
                                      padding: "4px 0",
                                    }}
                                  >
                                    {skillChoices.map((skill) => {
                                      const checked = selectedSkills.includes(skill);

                                      return (
                                        <label
                                          key={skill}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            padding: "3px 2px",
                                            cursor: "pointer",
                                            fontWeight: 600,
                                            fontSize: "11px",
                                            lineHeight: 1.2,
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) => {
                                              const nextSkills = event.target.checked
                                                ? [...selectedSkills, skill]
                                                : selectedSkills.filter((item) => item !== skill);
                                              setResidentSkills(familyIndex, memberIndex, nextSkills);
                                            }}
                                            style={{
                                              width: "14px",
                                              height: "14px",
                                              minWidth: "14px",
                                              margin: 0,
                                              cursor: "pointer",
                                            }}
                                          />
                                          <span>{skill}</span>
                                        </label>
                                      );
                                    })}

                                    <label
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        padding: "3px 2px",
                                        cursor: "pointer",
                                        fontWeight: 600,
                                        fontSize: "11px",
                                        lineHeight: 1.2,
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={hasOtherSkill}
                                        onChange={(event) => {
                                          if (!event.target.checked) {
                                            setResidentSkills(
                                              familyIndex,
                                              memberIndex,
                                              selectedSkills.filter((item) =>
                                                skillChoices.includes(item as (typeof skillChoices)[number])
                                              )
                                            );
                                          }
                                        }}
                                        style={{
                                          width: "14px",
                                          height: "14px",
                                          minWidth: "14px",
                                          margin: 0,
                                          cursor: "pointer",
                                        }}
                                      />
                                      <span>Other</span>
                                    </label>
                                  </div>

                                  {hasOtherSkill && (
                                    <input
                                      type="text"
                                      value={customSkills.join(", ")}
                                      onChange={(event) => {
                                        const standardSkills = selectedSkills.filter((item) =>
                                          skillChoices.includes(item as (typeof skillChoices)[number])
                                        );
                                        const nextCustomSkills = event.target.value
                                          .split(",")
                                          .map((item) => item.trim())
                                          .filter(Boolean);
                                        setResidentSkills(
                                          familyIndex,
                                          memberIndex,
                                          [...standardSkills, ...nextCustomSkills]
                                        );
                                      }}
                                      placeholder="Specify other skill(s), separated by commas"
                                      style={{ marginTop: "6px" }}
                                    />
                                  )}

                                  {!hasOtherSkill && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setResidentSkills(
                                          familyIndex,
                                          memberIndex,
                                          [...selectedSkills, "Other skill"]
                                        )
                                      }
                                      style={{
                                        marginTop: "5px",
                                        padding: 0,
                                        border: 0,
                                        background: "transparent",
                                        color: "#2563eb",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                      }}
                                    >
                                      + Specify another skill
                                    </button>
                                  )}
                                </>
                              );
                            })()
                          )}
                        </div>


</>

<>
                        {/* =================================================
                            VOTER & OTHER INFORMATION
                        ================================================= */}

                        <div
                          className="subsection-label"
                          style={{ marginTop: "14px", marginBottom: "10px" }}
                        >
                          Other Information
                        </div>

                        <div
                          className="form-grid"
                          style={{
                            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                            gap: "10px 12px",
                            marginTop: 0,
                          }}
                        >
                          <div className="form-group">
                            <label>Voter Status *</label>
                            <select
                              value={member.voterStatus}
                              disabled={
                                typeof calculateAge(member.birthDate) === "number" &&
                                Number(calculateAge(member.birthDate)) < 18
                              }
                              className={
                                typeof calculateAge(member.birthDate) === "number" &&
                                Number(calculateAge(member.birthDate)) < 18
                                  ? "age-auto-field"
                                  : ""
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
                              <option value="">Select status</option>
                              <option value="Registered Voter">Registered Voter</option>
                              <option value="Not Registered">Not Registered</option>
                              <option value="Not Eligible">Not Eligible</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Person with Disability</label>
                            <select
                              value={member.disability}
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "disability",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select</option>
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>4Ps Member *</label>
                            <select
                              value={member.fourPsMember}
                              onChange={(event) =>
                                updateMember(
                                  familyIndex,
                                  memberIndex,
                                  "fourPsMember",
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select</option>
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Senior Citizen</label>
                            <input
                              type="text"
                              value={
                                (() => {
                                  const age = Number(calculateAge(member.birthDate));

                                  if (!member.birthDate || Number.isNaN(age)) {
                                    return "";
                                  }

                                  return age >= 60 ? "YES" : "NO";
                                })()
                              }
                              readOnly
                              className="age-auto-field"
                              placeholder="AUTO FROM AGE"
                            />
                          </div>
                        </div>

</>

</div>

</>         
                    );
                  }
                )} 

                <div
  className="legacy-member-nav"
  style={{
    display: censusStep === "resident" ? "none" : "flex",
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

  {activeMemberIndex < (currentFamily?.members.length || 0) - 1 && (
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

                          const familyHeadCount =
                            family.members.filter(
                              (member) =>
                                member.familyRelationship === "Family Head"
                            ).length;

                          if (familyHeadCount !== 1) {
                            setValidationError(
                              familyHeadCount === 0
                                ? "Please select exactly one Family Head for this family."
                                : "This family has more than one Family Head. Please keep only one."
                            );

                            window.setTimeout(() => {
                              setValidationError("");
                            }, 2500);

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
                      disabled={residentTransitioning}
                      onClick={() => {
                        if (activeMemberIndex > 0) {
                          runResidentNavigation(() => {
                            setActiveMemberIndex((current) => current - 1);
                          });
                          return;
                        }
                        setIsMemberEditorOpen(false);
                        setCensusStep("family");
                      }}
                    >
                      {activeMemberIndex > 0 ? "← Previous Resident" : "← Back to Family"}
                    </button>

                    <div className="resident-footer-center">
                      <span>
                        Resident {activeMemberIndex + 1} of {currentFamily?.members.length || 0}
                        {" • "}
                        {currentFamily?.members[activeMemberIndex] ? getResidentDisplayName(currentFamily.members[activeMemberIndex]) : "Resident"}
                      </span>
                    </div>

                    <div className="resident-footer-actions">
                      {activeMemberIndex < family.members.length - 1 ? (
                        <button
                          type="button"
                          className="resident-footer-primary"
                          disabled={residentTransitioning}
                          onClick={() =>
                            runResidentNavigation(() => {
                              setActiveMemberIndex((current) => current + 1);
                            })
                          }
                        >
                          {residentTransitioning ? "Loading Next Resident..." : "Save & Next Resident →"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="resident-footer-primary"
                          disabled={residentTransitioning}
                          onClick={() =>
                            runResidentNavigation(() => {
                              const ownFamilyMemberIndex = family.members.findIndex(
                                (residentMember) => residentMember.hasOwnFamily === "Yes"
                              );

                              if (activeFamilyIndex === 0 && ownFamilyMemberIndex !== -1) {
                                const linkedResidentKey = `${family.id}-${ownFamilyMemberIndex}`;
                                const linkedFamilyIndex = families.findIndex(
                                  (familyItem) => familyItem.linkedResidentKey === linkedResidentKey
                                );

                                if (linkedFamilyIndex !== -1) {
                                  setActiveFamilyIndex(linkedFamilyIndex);
                                } else {
                                  createFamilyFromChild(activeFamilyIndex, ownFamilyMemberIndex);
                                }

                                setActiveMemberIndex(0);
                                setIsMemberEditorOpen(false);
                                setCensusStep("family");
                                return;
                              }

                              setCensusStep("review");
                            })
                          }
                        >
                          Continue to Review →
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
        <button
          type="button"
          className="review-secondary-button"
          onClick={() =>
            setShowSaveDraftExitConfirm(true)
          }
        >
          Cancel
        </button>
      </div>

        <button
          type="button"
          className="review-submit-button"
          disabled={isSubmittingCensus}
          onClick={() => {
            for (let familyIndex = 0; familyIndex < families.length; familyIndex++) {
              const familyToCheck = families[familyIndex];

              if (!familyToCheck || familyToCheck.members.length === 0) {
                setValidationError(`Family ${familyIndex + 1} must have at least one resident.`);
                return;
              }

              const familyHeadCount = familyToCheck.members.filter(
                (resident) => resident.familyRelationship === "Family Head"
              ).length;

              if (familyHeadCount !== 1) {
                setValidationError(
                  familyHeadCount === 0
                    ? `Family ${familyIndex + 1} must have exactly one Family Head.`
                    : `Family ${familyIndex + 1} has more than one Family Head. Please keep only one.`
                );
                window.setTimeout(() => setValidationError(""), 3500);
                return;
              }

              for (let memberIndex = 0; memberIndex < familyToCheck.members.length; memberIndex++) {
                const member = familyToCheck.members[memberIndex];
                const missingFields = getResidentMissingFields(member);

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
          {isSubmittingCensus
            ? "Submitting Census..."
            : "Submit Census"}
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


  {/* =========================================
      CONTEXT
  ========================================= */}

  <section className="context-card">

    <div className="context-card-title">
      <UsersRound size={16} strokeWidth={1.8} />

      <span>
        {censusStep === "household"
          ? "Household Context"
          : censusStep === "review"
          ? "Household Family Summary"
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

    ) : censusStep === "review" ? (

      <div className="context-details">
        <div>
          <span>Total Families</span>
          <strong>{families.length}</strong>
        </div>

        <div>
          <span>Total Residents</span>
          <strong>{totalResidents}</strong>
        </div>

        <div>
          <span>Additional Families</span>
          <strong>{additionalFamilyCount}</strong>
        </div>

        <div>
          <span>Pending Family Setup</span>
          <strong>{pendingOwnFamilyCount}</strong>
        </div>
      </div>

    ) : (

      <div className="context-details">

        <div>
          <span>Family Name</span>
          <strong>
            {currentFamily?.familyName
              ? formatFormalName(currentFamily.familyName)
              : "Not yet entered"}
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
          <span>Family Position</span>
          <strong>
            Family {activeFamilyIndex + 1} of {families.length}
          </strong>
        </div>

      </div>

    )}

  </section>


  {/* =========================================
      MEMBERS — COMPACT SUMMARY
  ========================================= */}

  <section className="context-card context-members-compact">
    <div className="context-card-title">
      <UsersRound size={16} strokeWidth={1.8} />
      <span>
        {censusStep === "review" ? "All Members" : "Members"}
      </span>
    </div>

    <div className="context-members-compact-row">
      <div>
        <strong>
          {censusStep === "household"
            ? 0
            : censusStep === "review"
            ? totalResidents
            : currentFamily?.members.length || 0}
        </strong>
        <span>
          {censusStep === "household"
            ? "Available after Household Information"
            : censusStep === "review"
            ? `member(s) across ${families.length} family/families`
            : "member(s) in this family"}
        </span>
      </div>

      {censusStep !== "household" && (
        <button
          type="button"
          className="context-view-members-button"
          onClick={() => setIsMembersListModalOpen(true)}
          disabled={
            censusStep === "review"
              ? totalResidents === 0
              : !currentFamily?.members.length
          }
        >
          View Details
        </button>
      )}
    </div>
  </section>

  {censusStep !== "household" && ownFamilySetupItems.length > 0 && (
    <section className="context-card context-own-family-compact">
      <div className="context-card-title">
        <UsersRound size={16} strokeWidth={1.8} />
        <span>Own Family Setup</span>
      </div>

      <div className="context-own-family-row">
        <div>
          <strong>{ownFamilySetupItems.length}</strong>
          <span>
            {pendingOwnFamilyCount > 0
              ? `${pendingOwnFamilyCount} still need setup`
              : "all linked families are ready"}
          </span>
        </div>

        <button
          type="button"
          className="context-manage-own-family-button"
          onClick={() => setIsOwnFamilyModalOpen(true)}
        >
          Manage
        </button>
      </div>
    </section>
  )}

  {(censusStep === "family" || censusStep === "resident") &&
    families.length > 1 && (
      <section className="context-card family-navigator-card">
        <div className="context-card-title">
          <UsersRound size={16} strokeWidth={1.8} />
          <span>Families in Household</span>
        </div>

        <div className="family-navigator-list">
          {families.map((familyItem, familyIndex) => (
            <div
              className={`family-navigator-row ${
                familyIndex === activeFamilyIndex ? "current" : ""
              }`}
              key={familyItem.id}
            >
              <div>
                <strong>Family {familyIndex + 1}</strong>
                <span>
                  {familyItem.familyName ? formatFormalName(familyItem.familyName) : "Surname not entered"}
                  {" • "}
                  {familyItem.members.length} member(s)
                </span>
              </div>

              {familyIndex === activeFamilyIndex ? (
                <span className="family-navigator-current">
                  Current
                </span>
              ) : (
                <button
                  type="button"
                  className="family-navigator-open"
                  onClick={() => {
                    setActiveFamilyIndex(familyIndex);
                    setActiveMemberIndex(0);
                    setIsMemberEditorOpen(false);
                    setCensusStep("family");
                  }}
                >
                  Open
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    )}


</aside>

</div>

{isMembersListModalOpen && censusStep !== "household" && (
  <div
    className="family-member-modal-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setIsMembersListModalOpen(false);
      }
    }}
  >
    <section
      className="context-members-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="members-list-modal-title"
    >
      <div className="family-member-modal-header">
        <div>
          <span className="family-member-modal-kicker">
            {censusStep === "review"
              ? "Household Review"
              : `Family ${activeFamilyIndex + 1}`}
          </span>
          <h3 id="members-list-modal-title">
            {censusStep === "review"
              ? "All Family Members"
              : "Members Details"}
          </h3>
        </div>

        <button
          type="button"
          className="family-modal-close-icon"
          onClick={() => setIsMembersListModalOpen(false)}
          aria-label="Close members details"
          title="Close"
        >
          <X size={18} strokeWidth={1.9} />
        </button>
      </div>

      <div className="context-members-modal-list">
        {censusStep === "review" ? (
          families.map((familyItem, familyIndex) => (
            <div className="context-members-family-group" key={familyItem.id}>
              <div className="context-members-family-heading">
                <strong>Family {familyIndex + 1}</strong>
                <span>
                  {familyItem.familyName ? formatFormalName(familyItem.familyName) : "Surname not entered"}
                  {" • "}
                  {familyItem.members.length} member(s)
                </span>
              </div>

              {familyItem.members.map((member, memberIndex) => {
                const memberRawName =
              [
                member.firstName,
                member.middleName,
                member.lastName,
                member.suffix,
              ]
                .filter(Boolean)
                .join(" ");

            const memberName = memberRawName
              ? formatFormalName(memberRawName)
              : `Member ${memberIndex + 1}`;

                return (
                  <div
                    className="context-members-modal-row"
                    key={`${familyItem.id}-${memberIndex}`}
                  >
                    <span className="member-number">
                      {memberIndex + 1}
                    </span>

                    <div className="context-members-modal-name">
                      <strong>{memberName}</strong>
                      <small>
                        {member.familyRelationship ||
                          "Relationship not selected"}
                        {" • "}
                        {member.familyMemberStatus ||
                          "Status not selected"}
                      </small>
                    </div>

                    {member.hasOwnFamily === "Yes" && (
                      <span className="member-role">Own Family</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          currentFamily?.members.map((member, index) => {
            const memberRawName =
              [
                member.firstName,
                member.middleName,
                member.lastName,
                member.suffix,
              ]
                .filter(Boolean)
                .join(" ");

            const memberName = memberRawName
              ? formatFormalName(memberRawName)
              : `Member ${index + 1}`;

            return (
              <div className="context-members-modal-row" key={index}>
                <span className="member-number">{index + 1}</span>

                <div className="context-members-modal-name">
                  <strong>{memberName}</strong>
                  <small>
                    {member.familyRelationship ||
                      "Relationship not selected"}
                    {" • "}
                    {member.familyMemberStatus ||
                      "Status not selected"}
                  </small>
                </div>

                {member.hasOwnFamily === "Yes" && (
                  <span className="member-role">Own Family</span>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="context-members-modal-footer">
        <button
          type="button"
          className="census-cancel-button"
          onClick={() => setIsMembersListModalOpen(false)}
        >
          Close
        </button>
      </div>
    </section>
  </div>
)}

{isOwnFamilyModalOpen && censusStep !== "household" && (
  <div
    className="family-member-modal-backdrop"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        setIsOwnFamilyModalOpen(false);
      }
    }}
  >
    <section
      className="context-own-family-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="own-family-modal-title"
    >
      <div className="family-member-modal-header">
        <div>
          <span className="family-member-modal-kicker">
            Household Families
          </span>
          <h3 id="own-family-modal-title">
            Own Family Setup
          </h3>
          <p>
            Manage every member in this household who is marked as having an own family.
          </p>
        </div>

        <button
          type="button"
          className="family-modal-close-icon"
          onClick={() => setIsOwnFamilyModalOpen(false)}
          aria-label="Close own family setup"
          title="Close"
        >
          <X size={18} strokeWidth={1.9} />
        </button>
      </div>

      <div className="context-own-family-modal-list">
        {ownFamilySetupItems.map(
          ({
            sourceFamily,
            sourceFamilyIndex,
            member,
            memberIndex,
            linkedFamilyIndex,
          }) => {
            const memberRawName =
              [
                member.firstName,
                member.middleName,
                member.lastName,
                member.suffix,
              ]
                .filter(Boolean)
                .join(" ");

            const memberName = memberRawName
              ? formatFormalName(memberRawName)
              : `Member ${memberIndex + 1}`;

            const hasLinkedFamily = linkedFamilyIndex !== -1;

            return (
              <div
                className="context-own-family-modal-row"
                key={`${sourceFamily.id}-${memberIndex}`}
              >
                <div className="context-own-family-person">
                  <span className="member-number">
                    {memberIndex + 1}
                  </span>

                  <div>
                    <strong>{memberName}</strong>
                    <small>
                      From Family {sourceFamilyIndex + 1}
                      {" • "}
                      {member.familyRelationship ||
                        "Relationship not selected"}
                    </small>
                  </div>
                </div>

                <div className="context-own-family-status">
                  <span
                    className={
                      hasLinkedFamily
                        ? "own-family-status ready"
                        : "own-family-status pending"
                    }
                  >
                    {hasLinkedFamily
                      ? `Family ${linkedFamilyIndex + 1} ready`
                      : "Needs setup"}
                  </span>

                  <button
                    type="button"
                    className="context-own-family-action"
                    onClick={() => {
                      setIsMemberEditorOpen(false);

                      if (hasLinkedFamily) {
                        setActiveFamilyIndex(linkedFamilyIndex);
                        setActiveMemberIndex(0);
                      } else {
                        setActiveFamilyIndex(sourceFamilyIndex);
                        setActiveMemberIndex(memberIndex);
                        createFamilyFromChild(
                          sourceFamilyIndex,
                          memberIndex
                        );
                      }

                      setCensusStep("family");
                      setIsOwnFamilyModalOpen(false);
                    }}
                  >
                    {hasLinkedFamily
                      ? "Open Family"
                      : "Set Up Family"}
                  </button>
                </div>
              </div>
            );
          }
        )}
      </div>

      <div className="context-own-family-modal-footer">
        <button
          type="button"
          className="census-cancel-button"
          onClick={() => setIsOwnFamilyModalOpen(false)}
        >
          Close
        </button>
      </div>
    </section>
  </div>
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
    onClick={async () => {

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
// CHECK EXACTLY ONE FAMILY HEAD PER FAMILY
// =================================================

for (
  let familyIndex = 0;
  familyIndex < families.length;
  familyIndex++
) {
  const familyToValidate = families[familyIndex];

  const familyHeadCount =
    familyToValidate?.members.filter(
      (member) =>
        member.familyRelationship === "Family Head"
    ).length ?? 0;

  if (familyHeadCount !== 1) {
    setActiveFamilyIndex(familyIndex);
    setCensusStep("family");

    setValidationError(
      familyHeadCount === 0
        ? `Family ${familyIndex + 1} must have exactly one Family Head.`
        : `Family ${familyIndex + 1} has more than one Family Head. Please keep only one.`
    );

    setTimeout(() => {
      setValidationError("");
    }, 3000);

    return;
  }
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
    const missingFields = getResidentMissingFields(member);

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

const selectedRegionName = locationRegionName;

const selectedProvinceName = locationProvinceName;

const selectedMunicipalityName = locationMunicipalityName;

const selectedBarangayName = locationBarangayName;

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

(
  censusData as CensusData & {
    __pendingFamilyLinks?: PendingFamilyLink[];
  }
).__pendingFamilyLinks = pendingFamilyLinks;

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

  if (!navigator.onLine) {
    markCensusDraftPendingSync(
      ownerId,
      currentDraftId,
      censusData
    );
    onQueuePendingSync?.(
      currentDraftId,
      censusData
    );
    onDraftsChanged?.();
    return;
  }

  setIsSubmittingCensus(true);

  const submitSucceeded =
    await onSubmitCensus(censusData);

  if (!submitSucceeded) {
    setIsSubmittingCensus(false);
    return;
  }

  deleteCensusLocalDraft(
    ownerId,
    currentDraftId
  );
  onDraftsChanged?.();

  }}
style={{
  display: "none",

}}

>
            Submit Census Form →

          </button>

        </div>




        {isSubmittingCensus && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100001,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(15, 23, 42, 0.58)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              role="status"
              aria-live="polite"
              style={{
                width: "min(420px, 100%)",
                padding: "30px 26px",
                borderRadius: "18px",
                background: "#ffffff",
                boxShadow:
                  "0 25px 60px rgba(15, 23, 42, 0.28)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  margin: "0 auto 16px",
                  borderRadius: "50%",
                  border: "4px solid #dbeafe",
                  borderTopColor: "#2563eb",
                  animation: "censusSubmitSpin .8s linear infinite",
                }}
              />

              <h2
                style={{
                  margin: "0 0 8px",
                  color: "#172033",
                  fontSize: "21px",
                }}
              >
                Submitting Census
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "13px",
                  lineHeight: 1.6,
                }}
              >
                Saving the household, families, residents,
                and confirmed family connections. Please wait.
              </p>

              <style>
                {`@keyframes censusSubmitSpin {
                  to { transform: rotate(360deg); }
                }`}
              </style>
            </div>
          </div>
        )}

        {isPossibleFamilyModalOpen && possibleFamilyTarget && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(4px)",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="possible-family-title"
              style={{
                width: "min(620px, 100%)",
                maxHeight: "86vh",
                overflowY: "auto",
                padding: "24px",
                borderRadius: "18px",
                background: "#ffffff",
                boxShadow:
                  "0 25px 60px rgba(15, 23, 42, 0.28)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "14px",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <span
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      color: "#2563eb",
                      fontSize: "11px",
                      fontWeight: 800,
                      letterSpacing: ".08em",
                    }}
                  >
                    POSSIBLE FAMILY CONNECTION
                  </span>

                  <h2
                    id="possible-family-title"
                    style={{
                      margin: 0,
                      color: "#172033",
                      fontSize: "21px",
                    }}
                  >
                    Possible related family found
                  </h2>

                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "#64748b",
                      fontSize: "13px",
                      lineHeight: 1.55,
                    }}
                  >
                    The current surname or middle/maiden surname
                    matches an existing family. Only a direct
                    Parent ↔ Child connection is saved. If this person
                    is only a sibling or another relative, choose
                    No, Continue.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePossibleFamilyModal}
                  style={{
                    border: 0,
                    width: "34px",
                    height: "34px",
                    borderRadius: "9px",
                    background: "#f1f5f9",
                    cursor: "pointer",
                  }}
                  aria-label="Close possible family connection"
                >
                  <X size={17} />
                </button>
              </div>

              <div
                style={{
                  marginTop: "18px",
                  padding: "12px 14px",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "13px",
                }}
              >
                Resident:{" "}
                <strong>
                  {formatFormalName(
                    [
                      families[possibleFamilyTarget.familyIndex]
                        ?.members[possibleFamilyTarget.memberIndex]
                        ?.firstName,
                      families[possibleFamilyTarget.familyIndex]
                        ?.members[possibleFamilyTarget.memberIndex]
                        ?.middleName,
                      families[possibleFamilyTarget.familyIndex]
                        ?.members[possibleFamilyTarget.memberIndex]
                        ?.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  )}
                </strong>
              </div>

              <div
                style={{
                  marginTop: "16px",
                  padding: "10px 12px",
                  borderRadius: "9px",
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: "12px",
                  lineHeight: 1.55,
                }}
              >
                If this resident is the <strong>Parent</strong>,
                you may select more than one existing child living
                in different households. If this resident is the
                <strong> Child</strong>, select only the one parent-family.
              </div>

              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "9px",
                }}
              >
                {possibleFamilyConnections.map(
                  (connection) => {
                    const selected =
                      selectedPossibleFamilyUuids.includes(
                        connection.familyUuid
                      );

                    return (
                      <button
                        key={connection.familyUuid}
                        type="button"
                        onClick={() => {
                          setSelectedPossibleFamilyUuids(
                            (current) => {
                              // Parent can select several existing
                              // child-family heads. Child stays single-select.
                              if (
                                possibleFamilyRelationship ===
                                "Parent"
                              ) {
                                return current.includes(
                                  connection.familyUuid
                                )
                                  ? current.filter(
                                      (id) =>
                                        id !==
                                        connection.familyUuid
                                    )
                                  : [
                                      ...current,
                                      connection.familyUuid,
                                    ];
                              }

                              return [
                                connection.familyUuid,
                              ];
                            }
                          );
                          setPossibleFamilyError("");
                        }}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "13px 14px",
                          border: selected
                            ? "1px solid #2563eb"
                            : "1px solid #e2e8f0",
                          borderRadius: "11px",
                          background: selected
                            ? "#eff6ff"
                            : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <strong
                          style={{
                            display: "block",
                            color: "#172033",
                          }}
                        >
                          {formatFormalName(
                            connection.familyName ||
                              "Unnamed Family"
                          )}{" "}
                          Family
                        </strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "#64748b",
                            fontSize: "12px",
                          }}
                        >
                          Head:{" "}
                          {formatFormalName(
                            connection.familyHeadName
                          )}
                          {" • "}
                          Household{" "}
                          {connection.householdNumber}
                          {connection.purok
                            ? ` • ${connection.purok}`
                            : ""}
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {selectedPossibleFamilyUuids.length > 0 && (
                <div style={{ marginTop: "17px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "7px",
                      color: "#475569",
                      fontSize: "12px",
                      fontWeight: 800,
                    }}
                  >
                    Direct relationship to the selected Family Head
                    {selectedPossibleFamilyUuids.length > 1
                      ? `s (${selectedPossibleFamilyUuids.length} selected)`
                      : ""}
                  </label>

                  <select
                    value={possibleFamilyRelationship}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPossibleFamilyRelationship(value);

                      if (
                        value === "Child" &&
                        selectedPossibleFamilyUuids.length > 1
                      ) {
                        setSelectedPossibleFamilyUuids(
                          (current) =>
                            current.length
                              ? [current[0]]
                              : []
                        );
                      }

                      setPossibleFamilyError("");
                    }}
                    style={{
                      width: "100%",
                      padding: "11px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "9px",
                      background: "#ffffff",
                    }}
                  >
                    <option value="">
                      Select relationship
                    </option>
                    <option value="Child">
                      Child of the Family Head
                    </option>
                    <option value="Parent">
                      Parent of the Family Head
                    </option>
                  </select>
                </div>
              )}

              {possibleFamilyError && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px 12px",
                    borderRadius: "9px",
                    background: "#fff1f2",
                    color: "#b42318",
                    fontSize: "12px",
                  }}
                >
                  {possibleFamilyError}
                </div>
              )}

              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "9px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={closePossibleFamilyModal}
                  style={{
                    padding: "10px 14px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "9px",
                    background: "#ffffff",
                    color: "#334155",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  No, Continue
                </button>

                <button
                  type="button"
                  onClick={confirmPossibleFamilyConnection}
                  disabled={
                    selectedPossibleFamilyUuids.length === 0 ||
                    !possibleFamilyRelationship
                  }
                  style={{
                    padding: "10px 14px",
                    border: "none",
                    borderRadius: "9px",
                    background: "#2563eb",
                    color: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 700,
                    opacity:
                      !selectedPossibleFamilyUuids ||
                      !possibleFamilyRelationship
                        ? 0.55
                        : 1,
                  }}
                >
                  Yes, Link Family
                </button>
              </div>
            </section>
          </div>
        )}

        {showSaveDraftExitConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              background: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(4px)",
            }}
          >
            <div
              style={{
                width: "430px",
                maxWidth: "100%",
                padding: "28px",
                borderRadius: "18px",
                background: "#ffffff",
                boxShadow:
                  "0 25px 60px rgba(15, 23, 42, 0.25)",
              }}
            >
              <h2
                style={{
                  margin: "0 0 10px",
                  color: "#172033",
                  fontSize: "21px",
                }}
              >
                Save Census Draft?
              </h2>

              <p
                style={{
                  margin: "0 0 22px",
                  color: "#64748b",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                Your current census progress is saved
                locally. You can return to Census Drafts
                now and resume this household later.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowSaveDraftExitConfirm(false)
                  }
                  style={{
                    padding: "10px 16px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "9px",
                    background: "#ffffff",
                    color: "#334155",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Continue Editing
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSaveDraftExitConfirm(false);
                    onDraftsChanged?.();
                    onSaveDraftAndExit?.();
                  }}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "9px",
                    background: "#15803d",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Save Draft & Exit
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}

export default HouseholdPrototype;


