/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase normalized tables lack generated row types in this project; query rows are runtime schema records. */
import { supabase } from "./supabaseClient";
import { formatResidentRecordName } from "../utils/nameFormatter";
import type {
  CensusData,
  CensusRecord,
  Resident,
  Family,
} from "../types/census";

// ======================================================
// LOAD LEGACY CENSUS RECORDS
// KEEP THIS WORKING FOR NOW
// ======================================================

export async function getCensusRecords(): Promise<CensusRecord[]> {
  // NOTE: Supabase/PostgREST defaults to capping results at 1,000 rows.
  // Without an explicit limit, this call would silently return only the
  // newest 1,000 records once the barangay has more households than that,
  // with no error to signal the truncation. Raising the limit here buys
  // headroom; if the barangay is expected to exceed this count, this
  // should be converted to real pagination (range()/Load More) instead.
  const { data, error } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error(
      "Failed to load census records:",
      error
    );

    throw error;
  }

  return (data ?? []).map((record) => ({
    id: record.id,
    data: record.data,
    createdAt: record.created_at,
  }));
}


// ======================================================
// HELPER
// CONVERT MONTHLY INCOME TO NUMBER
// ======================================================

function parseMonthlyIncome(
  value: string
): number | null {

  const cleaned = value
    .replace(/[^\d.]/g, "")
    .trim();

  if (!cleaned) {
    return null;
  }

  const amount = Number(cleaned);

  return Number.isFinite(amount)
    ? amount
    : null;
}


// ======================================================
// HELPER
// CHECK IF FAMILY HEAD
// ======================================================

function isFamilyHead(
  relationship: string
): boolean {

  return (
    relationship
      .trim()
      .toLowerCase() === "family head"
  );
}


// ======================================================
// SAVE TO NORMALIZED TABLES
// SHADOW / DUAL-WRITE MODE
// ======================================================

async function saveNormalizedCensus(
  data: CensusData,
  pendingFamilyLinks: PendingFamilyLink[] = []
): Promise<void> {

  const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

if (sessionError) {
  console.error(
    "Failed to check Supabase session:",
    sessionError
  );
}

if (!session) {
  throw new Error(
    "No authenticated Supabase session. Please log in through Supabase Auth."
  );
}


  // ====================================================
  // 1. HOUSEHOLD
  // ====================================================

  const {
    data: existingHousehold,
    error: householdLookupError,
  } = await supabase
    .from("households")
    .select("id")
    .eq(
      "household_number",
      data.householdNumber
    )
    .maybeSingle();

  if (householdLookupError) {
    throw householdLookupError;
  }


  let householdId: number;


  if (existingHousehold) {

    householdId = existingHousehold.id;

  } else {

    const {
      data: savedHousehold,
      error: householdError,
    } = await supabase
      .from("households")
      .insert({
        household_number:
          data.householdNumber,

        house_number:
          data.household.houseNumber,

        region:
          data.household.region || null,

        province:
          data.household.province || null,

        municipality:
          data.household.municipality || null,

        barangay:
          data.household.barangay || null,

        purok:
          data.household.purok,

        street:
          data.household.street,

        current_address:
          data.household.currentAddress || null,

        previous_address:
          data.household.previousAddress || null,

        years_in_barangay:
          data.household.yearsInBarangay
            ? Number(
                data.household.yearsInBarangay
              )
            : null,

        updated_at:
          new Date().toISOString(),
      })
      .select("id")
      .single();


    if (householdError) {
      throw householdError;
    }


    householdId = savedHousehold.id;
  }


  // ====================================================
  // 2. COLLECT UNIQUE RESIDENTS
  // ====================================================

  const uniqueResidents =
    new Map<string, Resident>();


  const normalizedFamilyUuidMap =
    new Map<number, string>();

  for (const family of data.families) {

    for (const member of family.members) {

      if (!member.residentId) {

        throw new Error(
          `Resident ID missing for ${member.firstName} ${member.lastName}`
        );
      }


      if (
        !uniqueResidents.has(
          member.residentId
        )
      ) {

        uniqueResidents.set(
          member.residentId,
          member
        );
      }
    }
  }


  // Maps business Resident ID
  // to database UUID
  const residentUuidMap =
    new Map<string, string>();


  // ====================================================
  // 3. RESIDENTS
  // ====================================================

  for (
    const [
      residentId,
      resident,
    ] of uniqueResidents
  ) {

    const {
      data: existingResident,
      error: residentLookupError,
    } = await supabase
      .from("residents")
      .select("id")
      .eq(
        "resident_id",
        residentId
      )
      .maybeSingle();


    if (residentLookupError) {
      throw residentLookupError;
    }


    let residentUuid: string;


    if (existingResident) {

      residentUuid =
        existingResident.id;

    } else {

      const {
        data: savedResident,
        error: residentError,
      } = await supabase
        .from("residents")
        .insert({
          resident_id:
            residentId,

          household_id:
            householdId,

          first_name:
            resident.firstName,

          middle_name:
            resident.middleName || null,

          last_name:
            resident.lastName,

          suffix:
            resident.suffix || null,

          birth_date:
            resident.birthDate,

          height:
            resident.height || null,

          weight:
            resident.weight || null,

          birth_place:
            resident.birthPlace || null,

          sex:
            resident.sex || null,

          civil_status:
            resident.civilStatus || null,

          contact_number:
            resident.contactNumber || null,

          email:
            resident.email || null,

          nationality:
            resident.nationality || null,

          religion:
            resident.religion || null,

          voter_status:
            resident.voterStatus || null,

          four_ps_member:
            resident.fourPsMember || null,

          disability:
            resident.disability || null,

          senior_citizen:
            resident.seniorCitizen || null,

          has_own_family:
            resident.hasOwnFamily || null,

          family_member_name:
            resident.familyMemberName || null,

          family_member_status:
            resident.familyMemberStatus || null,

          updated_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();


      if (residentError) {
        throw residentError;
      }


      residentUuid =
        savedResident.id;
    }


    residentUuidMap.set(
      residentId,
      residentUuid
    );


    // ================================================
    // 3A. EDUCATION
    // ================================================

    const {
      error: educationError,
    } = await supabase
      .from("resident_education")
      .upsert(
        {
          resident_id:
            residentUuid,

          educational_attainment:
            resident.education || null,

          school_status:
            resident.schoolStatus || null,

          school_level:
            resident.schoolLevel || null,

          elementary_school:
            resident.elementarySchool || null,

          junior_high_school:
            resident.juniorHighSchool || null,

          senior_high_school:
            resident.seniorHighSchool || null,

          college_university:
            resident.collegeUniversity || null,

          postgraduate_school:
            resident.postgraduateSchool || null,

          shs_strand:
            resident.shsStrand || null,

          course:
            resident.course || null,

          specialization:
            resident.specialization || null,

          osy_reason:
            resident.osyReason || null,

          osy_other_reason:
            resident.osyOtherReason || null,

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "resident_id",
        }
      );


    if (educationError) {
      throw educationError;
    }


    // ================================================
    // 3B. EMPLOYMENT
    // ================================================

    const {
      error: employmentError,
    } = await supabase
      .from("resident_employment")
      .upsert(
        {
          resident_id:
            residentUuid,

          employment_status:
            resident.employmentStatus || null,

          employer:
            resident.employer || null,

          monthly_income:
            parseMonthlyIncome(
              resident.monthlyIncome
            ),

          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "resident_id",
        }
      );


    if (employmentError) {
      throw employmentError;
    }


    // ================================================
    // 3C. PRIMARY OCCUPATION
    // ================================================

    if (
      resident.primaryOccupation.trim()
    ) {

      const {
        error: primaryOccupationError,
      } = await supabase
        .from("resident_occupations")
        .upsert(
          {
            resident_id:
              residentUuid,

            occupation_name:
              resident.primaryOccupation.trim(),

            occupation_type:
              "Primary",
          },
          {
            onConflict:
              "resident_id,occupation_name,occupation_type",

            ignoreDuplicates: true,
          }
        );


      if (primaryOccupationError) {
        throw primaryOccupationError;
      }
    }


    // ================================================
    // 3D. SECONDARY OCCUPATIONS
    // ================================================

    for (
      const occupation
      of resident.secondaryOccupations
    ) {

      const occupationName =
        occupation.trim();


      if (!occupationName) {
        continue;
      }


      const {
        error: secondaryOccupationError,
      } = await supabase
        .from("resident_occupations")
        .upsert(
          {
            resident_id:
              residentUuid,

            occupation_name:
              occupationName,

            occupation_type:
              "Secondary",
          },
          {
            onConflict:
              "resident_id,occupation_name,occupation_type",

            ignoreDuplicates: true,
          }
        );


      if (
        secondaryOccupationError
      ) {
        throw secondaryOccupationError;
      }
    }


    // ================================================
    // 3E. SKILLS
    // ================================================

    const skills =
      resident.skills
        .split(/[,;]/)
        .map((skill) =>
          skill.trim()
        )
        .filter(Boolean);


    for (const skill of skills) {

      const {
        error: skillError,
      } = await supabase
        .from("resident_skills_new")
        .upsert(
          {
            resident_id:
              residentUuid,

            skill_name:
              skill,
          },
          {
            onConflict:
              "resident_id,skill_name",

            ignoreDuplicates: true,
          }
        );


      if (skillError) {
        throw skillError;
      }
    }
  }


  // ====================================================
  // 4. FAMILIES
  // ====================================================

  for (const family of data.families) {

    const familyNumber =
      Number(family.id);


    const {
      data: existingFamily,
      error: familyLookupError,
    } = await supabase
      .from("families")
      .select(
        "id, linked_resident_id"
      )
      .eq(
        "household_id",
        householdId
      )
      .eq(
        "family_number",
        familyNumber
      )
      .maybeSingle();


    if (familyLookupError) {
      throw familyLookupError;
    }


    let familyUuid: string;


    if (existingFamily) {

      familyUuid =
        existingFamily.id;

    } else {

      const {
        data: savedFamily,
        error: familyError,
      } = await supabase
        .from("families")
        .insert({
          household_id:
            householdId,

          family_number:
            familyNumber,

          family_name:
            family.familyName || null,

          updated_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();


      if (familyError) {
        throw familyError;
      }


      familyUuid =
        savedFamily.id;
    }


    normalizedFamilyUuidMap.set(
      familyNumber,
      familyUuid
    );


    // ================================================
    // 5. FAMILY MEMBERSHIPS
    // ================================================

    for (
      const member of family.members
    ) {

      const residentUuid =
        residentUuidMap.get(
          member.residentId
        );


      if (!residentUuid) {

        throw new Error(
          `Database UUID missing for Resident ID ${member.residentId}`
        );
      }


      const {
        error: membershipError,
      } = await supabase
        .from("family_memberships")
        .upsert(
          {
            family_id:
              familyUuid,

            resident_id:
              residentUuid,

            relationship:
              member.familyRelationship,

            member_status:
              member.familyMemberStatus || null,

            is_family_head:
              isFamilyHead(
                member.familyRelationship
              ),

            updated_at:
              new Date().toISOString(),
          },
          {
            onConflict:
              "family_id,resident_id",
          }
        );


      if (membershipError) {
        throw membershipError;
      }
    }


    // ================================================
    // 6. LINK ADDITIONAL FAMILY
    // ================================================

    if (family.linkedResidentKey) {

      const familyHead =
        family.members.find(
          (member) =>
            isFamilyHead(
              member.familyRelationship
            )
        );


      if (familyHead) {

        const linkedResidentUuid =
          residentUuidMap.get(
            familyHead.residentId
          );


        if (linkedResidentUuid) {

          const {
            error: linkError,
          } = await supabase
            .from("families")
            .update({
              linked_resident_id:
                linkedResidentUuid,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              familyUuid
            );


          if (linkError) {
            throw linkError;
          }
        }
      }
    }
  }



  await persistPendingFamilyLinks(
    pendingFamilyLinks,
    residentUuidMap,
    normalizedFamilyUuidMap
  );
}



// ======================================================
// POSSIBLE / CONFIRMED CROSS-HOUSEHOLD FAMILY LINKS
// ======================================================

export type PossibleFamilyConnection = {
  familyUuid: string;
  familyNumber: number;
  familyName: string;
  householdId: number;
  householdNumber: string;
  purok: string;
  street: string;
  familyHeadName: string;
  familyHeadResidentUuid: string;
};

export type PendingFamilyLink = {
  residentId: string;
  sourceFamilyNumber: number;
  targetFamilyUuid: string;
  targetFamilyName: string;
  targetHouseholdNumber: string;
  targetFamilyHeadResidentUuid: string;
  relationship: "Child" | "Parent";
};

function normalizedDisplayName(row: any): string {
  return [
    row?.first_name,
    row?.middle_name,
    row?.last_name,
    row?.suffix,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

export async function findPossibleFamilyConnections(
  surnameInputs: string[]
): Promise<PossibleFamilyConnection[]> {
  const surnames = Array.from(
    new Set(
      surnameInputs
        .map((value) => value.trim())
        .filter((value) => value.length >= 2)
    )
  );

  if (!surnames.length || !navigator.onLine) {
    return [];
  }

  const familyFilter = surnames
    .map((surname) => `family_name.ilike.${surname}`)
    .join(",");

  const { data: familyRows, error: familyError } = await supabase
    .from("families")
    .select("id, household_id, family_number, family_name")
    .or(familyFilter)
    .limit(12);

  if (familyError) throw familyError;
  if (!familyRows?.length) return [];

  const householdIds = Array.from(
    new Set(
      familyRows
        .map((row: any) => row.household_id)
        .filter(Boolean)
    )
  );

  const { data: householdRows, error: householdError } = await supabase
    .from("households")
    .select("id, household_number, purok, street")
    .in("id", householdIds);

  if (householdError) throw householdError;

  const householdMap = new Map(
    (householdRows ?? []).map((row: any) => [row.id, row])
  );

  const familyIds = familyRows.map((row: any) => row.id);

  const { data: headMemberships, error: headMembershipError } = await supabase
    .from("family_memberships")
    .select("family_id, resident_id")
    .in("family_id", familyIds)
    .eq("is_family_head", true);

  if (headMembershipError) throw headMembershipError;

  const headResidentIds = Array.from(
    new Set(
      (headMemberships ?? [])
        .map((row: any) => row.resident_id)
        .filter(Boolean)
    )
  );

  let headResidents: any[] = [];

  if (headResidentIds.length) {
    const { data, error } = await supabase
      .from("residents")
      .select("id, first_name, middle_name, last_name, suffix")
      .in("id", headResidentIds);

    if (error) throw error;
    headResidents = data ?? [];
  }

  const residentMap = new Map(
    headResidents.map((row: any) => [String(row.id), row])
  );

  const headByFamily = new Map<
    string,
    { name: string; residentUuid: string }
  >();

  for (const membership of headMemberships ?? []) {
    const residentUuid = String(
      (membership as any).resident_id
    );
    const resident = residentMap.get(residentUuid);

    if (resident) {
      headByFamily.set(
        String((membership as any).family_id),
        {
          name: normalizedDisplayName(resident),
          residentUuid,
        }
      );
    }
  }

  return familyRows
    .map((row: any) => {
      const household = householdMap.get(row.household_id);

      return {
        familyUuid: String(row.id),
        familyNumber: Number(row.family_number),
        familyName: String(row.family_name || ""),
        householdId: Number(row.household_id),
        householdNumber: String(household?.household_number || ""),
        purok: String(household?.purok || ""),
        street: String(household?.street || ""),
        familyHeadName:
          headByFamily.get(String(row.id))?.name ||
          "Family Head not available",
        familyHeadResidentUuid:
          headByFamily.get(String(row.id))?.residentUuid || "",
      };
    })
    .filter((row) => Boolean(row.householdNumber));
}


export type ExternalFamilyMember = {
  residentUuid: string;
  residentId: string;
  fullName: string;
  householdNumber: string;
  purok: string;
  street: string;
  relationship: string;
};

export async function getExternalFamilyMembers(
  householdNumberInput: string,
  familyNumberInput: string
): Promise<ExternalFamilyMember[]> {
  const householdNumber = householdNumberInput.trim();
  const familyNumber = Number(familyNumberInput);

  const { data: householdRow, error: householdError } = await supabase
    .from("households")
    .select("id")
    .eq("household_number", householdNumber)
    .maybeSingle();

  if (householdError) throw householdError;
  if (!householdRow?.id) return [];

  const { data: familyRow, error: familyError } = await supabase
    .from("families")
    .select("id")
    .eq("household_id", householdRow.id)
    .eq("family_number", familyNumber)
    .maybeSingle();

  if (familyError) throw familyError;
  if (!familyRow?.id) return [];

  const { data: memberships, error: membershipError } = await supabase
    .from("family_memberships")
    .select("resident_id, relationship")
    .eq("family_id", familyRow.id)
    .eq("relationship", "Child");

  if (membershipError) throw membershipError;
  if (!memberships?.length) return [];

  const residentIds = memberships
    .map((row: any) => row.resident_id)
    .filter(Boolean);

  const { data: residentRows, error: residentError } = await supabase
    .from("residents")
    .select(`
      id,
      resident_id,
      household_id,
      first_name,
      middle_name,
      last_name,
      suffix
    `)
    .in("id", residentIds);

  if (residentError) throw residentError;

  const externalResidents = (residentRows ?? []).filter(
    (row: any) =>
      Number(row.household_id) !== Number(householdRow.id)
  );

  if (!externalResidents.length) return [];

  const externalHouseholdIds = Array.from(
    new Set(
      externalResidents
        .map((row: any) => row.household_id)
        .filter(Boolean)
    )
  );

  const { data: externalHouseholds, error: externalHouseholdError } =
    await supabase
      .from("households")
      .select("id, household_number, purok, street")
      .in("id", externalHouseholdIds);

  if (externalHouseholdError) throw externalHouseholdError;

  const householdMap = new Map(
    (externalHouseholds ?? []).map((row: any) => [row.id, row])
  );
  const membershipMap = new Map(
    memberships.map((row: any) => [
      String(row.resident_id),
      row,
    ])
  );

  return externalResidents.map((row: any) => {
    const sourceHousehold = householdMap.get(row.household_id);
    const membership = membershipMap.get(String(row.id));

    return {
      residentUuid: String(row.id),
      residentId: String(row.resident_id || ""),
      fullName:
        formatResidentRecordName(row) || "Unnamed Resident",
      householdNumber: String(
        sourceHousehold?.household_number || ""
      ),
      purok: String(sourceHousehold?.purok || ""),
      street: String(sourceHousehold?.street || ""),
      relationship: String(
        membership?.relationship || ""
      ),
    };
  });
}


async function persistPendingFamilyLinks(
  links: PendingFamilyLink[],
  residentUuidMap: Map<string, string>,
  normalizedFamilyUuidMap: Map<number, string>
): Promise<void> {
  if (!links.length) return;

  for (const link of links) {
    // --------------------------------------------------
    // CASE 1: NEW RESIDENT IS THE CHILD
    // Parent family already exists.
    // Add the new resident to that existing parent family.
    // --------------------------------------------------
    if (link.relationship === "Child") {
      const newChildUuid =
        residentUuidMap.get(link.residentId);

      if (!newChildUuid) {
        console.error(
          "FAMILY LINK SKIPPED: new child UUID was not resolved.",
          link
        );
        continue;
      }

      const { data: targetFamily, error: targetFamilyError } =
        await supabase
          .from("families")
          .select("id")
          .eq("id", link.targetFamilyUuid)
          .maybeSingle();

      if (targetFamilyError || !targetFamily?.id) {
        console.error(
          "FAMILY LINK SKIPPED: parent family no longer exists.",
          targetFamilyError || link
        );
        continue;
      }

      const { error: childLinkError } = await supabase
        .from("family_memberships")
        .upsert(
          {
            family_id: link.targetFamilyUuid,
            resident_id: newChildUuid,
            relationship: "Child",
            member_status: "Alive",
            is_family_head: false,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "family_id,resident_id",
          }
        );

      if (childLinkError) {
        console.error(
          "FAILED TO SAVE CHILD FAMILY LINK:",
          childLinkError
        );
      }

      continue;
    }

    // --------------------------------------------------
    // CASE 2: NEW RESIDENT IS THE PARENT
    // The previously saved matched Family Head is the child.
    // Do NOT add the parent to the child's family.
    // Instead add the existing child to the NEW parent's family.
    // --------------------------------------------------
    if (link.relationship === "Parent") {
      const newParentFamilyUuid =
        normalizedFamilyUuidMap.get(
          link.sourceFamilyNumber
        );

      if (
        !newParentFamilyUuid ||
        !link.targetFamilyHeadResidentUuid
      ) {
        console.error(
          "FAMILY LINK SKIPPED: parent family or existing child UUID is missing.",
          link
        );
        continue;
      }

      const { error: reverseChildLinkError } =
        await supabase
          .from("family_memberships")
          .upsert(
            {
              family_id: newParentFamilyUuid,
              resident_id:
                link.targetFamilyHeadResidentUuid,
              relationship: "Child",
              member_status: "Alive",
              is_family_head: false,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "family_id,resident_id",
            }
          );

      if (reverseChildLinkError) {
        console.error(
          "FAILED TO SAVE REVERSED PARENT-CHILD FAMILY LINK:",
          reverseChildLinkError
        );
      }
    }
  }
}


// ======================================================
// MAIN SAVE
// EXISTING JSON + NEW NORMALIZED STORAGE
// ======================================================

export async function saveCensusRecord(
  data: CensusData
): Promise<CensusRecord> {

  const pendingFamilyLinks =
    (
      data as CensusData & {
        __pendingFamilyLinks?: PendingFamilyLink[];
      }
    ).__pendingFamilyLinks ?? [];

  const cleanData = structuredClone(data) as CensusData & {
    __pendingFamilyLinks?: PendingFamilyLink[];
  };

  delete cleanData.__pendingFamilyLinks;

  const censusRecordId =
    crypto.randomUUID();

  // ====================================================
  // 1. KEEP EXISTING WORKING JSON SAVE
  // ====================================================

  const {
    data: savedData,
    error,
  } = await supabase
    .from("census_records")
    .insert({
      id:
        censusRecordId,

      data: cleanData,

      created_at:
        new Date().toISOString(),
    })
    .select(
      "id, data, created_at"
    )
    .single();


  if (error) {

    console.error(
      "Failed to save census record:",
      error
    );

    throw error;
  }


  // ====================================================
  // 2. SAVE TO NORMALIZED DATABASE
  // The submission is only considered complete when
  // both the JSON record and normalized data succeed.
  // If normalization fails, remove the JSON record so
  // the UI cannot report a partial save as successful.
  // ====================================================

  try {

    await saveNormalizedCensus(
      cleanData,
      pendingFamilyLinks
    );

  } catch (normalizedError) {

    console.error(
      "NORMALIZED SAVE FAILED:",
      normalizedError
    );

    const {
      error: rollbackError,
    } = await supabase
      .from("census_records")
      .delete()
      .eq("id", censusRecordId);

    if (rollbackError) {
      console.error(
        "FAILED TO ROLLBACK PARTIAL CENSUS RECORD:",
        rollbackError
      );

      throw new Error(
        "Census submission was only partially saved. Please contact the system administrator before retrying.", { cause: normalizedError }
      );
    }

    throw new Error(
      "Census submission failed and was not completed. Please try again.", { cause: normalizedError }
    );
  }


  // ====================================================
  // RETURN EXISTING RECORD FORMAT
  // ====================================================

  return {
    id:
      savedData.id,

    data:
      savedData.data,

    createdAt:
      savedData.created_at,
  };
}

// ======================================================
// UPDATE HOUSEHOLD
// KEEP JSON + NORMALIZED HOUSEHOLD IN SYNC
// ======================================================

export type HouseholdUpdateInput = {
  householdNumber: string;
  houseNumber: string;
  street: string;
  purok: string;
  yearsInBarangay: string;
};

type AuditActor = {
  userId: string;
  email: string | null;
  name: string | null;
  role: string | null;
};

async function getCurrentAuditActor(): Promise<AuditActor> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (!user) {
    throw new Error(
      "Your session could not be verified. Please sign in again."
    );
  }

  const {
    data: authorizedUser,
    error: authorizedUserError,
  } = await supabase
    .from("authorized_users")
    .select("email, full_name, role, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (authorizedUserError) {
    throw authorizedUserError;
  }

  if (
    !authorizedUser?.is_active ||
    authorizedUser.role !== "secretary"
  ) {
    throw new Error(
      "Only an active Secretary account can edit household records."
    );
  }

  return {
    userId: user.id,
    email: authorizedUser.email || user.email || null,
    name: authorizedUser.full_name || null,
    role: authorizedUser.role || null,
  };
}

export async function updateHousehold(
  input: HouseholdUpdateInput
): Promise<CensusRecord> {
  const householdNumber = input.householdNumber.trim();

  if (!householdNumber) {
    throw new Error("Household number is required.");
  }

  const actor = await getCurrentAuditActor();

  const {
    data: censusRow,
    error: censusLookupError,
  } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .eq(
      "data->>householdNumber",
      householdNumber
    )
    .maybeSingle();

  if (censusLookupError) {
    throw censusLookupError;
  }

  if (!censusRow?.data) {
    throw new Error(
      "The original census record could not be found."
    );
  }

  const originalData =
    structuredClone(censusRow.data) as CensusData;

  const updatedData =
    structuredClone(censusRow.data) as CensusData;

  if (!updatedData.household) {
    throw new Error(
      "Household information is missing from the census record."
    );
  }

  const beforeHousehold = {
    householdNumber,
    houseNumber:
      updatedData.household.houseNumber || "",
    street:
      updatedData.household.street || "",
    purok:
      updatedData.household.purok || "",
    yearsInBarangay:
      updatedData.household.yearsInBarangay || "",
  };

  updatedData.household.houseNumber =
    input.houseNumber.trim();
  updatedData.household.street =
    input.street.trim();
  updatedData.household.purok =
    input.purok.trim();
  updatedData.household.yearsInBarangay =
    input.yearsInBarangay.trim();

  const afterHousehold = {
    householdNumber,
    houseNumber:
      updatedData.household.houseNumber || "",
    street:
      updatedData.household.street || "",
    purok:
      updatedData.household.purok || "",
    yearsInBarangay:
      updatedData.household.yearsInBarangay || "",
  };

  const {
    data: updatedJsonRows,
    error: censusUpdateError,
  } = await supabase
    .from("census_records")
    .update({
      data: updatedData,
    })
    .eq("id", censusRow.id)
    .select("id");

  if (censusUpdateError) {
    throw censusUpdateError;
  }

  if (!updatedJsonRows?.length) {
    throw new Error(
      "The household census JSON record was not updated."
    );
  }

  try {
    const yearsValue =
      input.yearsInBarangay.trim() === ""
        ? null
        : Number(input.yearsInBarangay);

    if (
      yearsValue !== null &&
      !Number.isFinite(yearsValue)
    ) {
      throw new Error(
        "Years in Barangay must be a valid number."
      );
    }

    const {
      data: updatedHouseholdRows,
      error: householdUpdateError,
    } = await supabase
      .from("households")
      .update({
        house_number:
          input.houseNumber.trim() || null,
        street:
          input.street.trim() || null,
        purok:
          input.purok.trim() || null,
        years_in_barangay:
          yearsValue,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "household_number",
        householdNumber
      )
      .select("id");

    if (householdUpdateError) {
      throw householdUpdateError;
    }

    if (!updatedHouseholdRows?.length) {
      throw new Error(
        "The normalized household record was not updated."
      );
    }
  } catch (normalizedError) {
    const { error: rollbackError } =
      await supabase
        .from("census_records")
        .update({
          data: originalData,
        })
        .eq("id", censusRow.id);

    if (rollbackError) {
      console.error(
        "FAILED TO ROLLBACK HOUSEHOLD JSON AFTER NORMALIZED UPDATE ERROR:",
        rollbackError
      );
    }

    throw normalizedError;
  }

  const {
    error: auditError,
  } = await supabase
    .from("audit_logs")
    .insert({
      actor_user_id: actor.userId,
      actor_email: actor.email,
      actor_name: actor.name,
      actor_role: actor.role,
      action: "EDIT",
      entity_type: "household",
      entity_id: householdNumber,
      entity_name: householdNumber,
      reason: "Household information updated",
      before_data: beforeHousehold,
      after_data: afterHousehold,
      metadata: {
        household_number: householdNumber,
        census_record_id: censusRow.id,
      },
    });

  if (auditError) {
    const yearsValue = beforeHousehold.yearsInBarangay.trim() === ""
      ? null
      : Number(beforeHousehold.yearsInBarangay);
    const [censusRollback, householdRollback] = await Promise.all([
      supabase.from("census_records").update({ data: originalData }).eq("id", censusRow.id),
      supabase.from("households").update({
        house_number: beforeHousehold.houseNumber || null,
        street: beforeHousehold.street || null,
        purok: beforeHousehold.purok || null,
        years_in_barangay: Number.isFinite(yearsValue) ? yearsValue : null,
        updated_at: new Date().toISOString(),
      }).eq("household_number", householdNumber),
    ]);
    if (censusRollback.error || householdRollback.error) {
      console.error("HOUSEHOLD UPDATE ROLLBACK FAILED:", censusRollback.error, householdRollback.error);
      throw new Error("The audit entry failed and the household update could not be fully restored. Contact the system administrator before retrying.", { cause: auditError });
    }
    throw new Error(`The household update was restored because the Audit Trail entry failed: ${auditError.message}`, { cause: auditError });
  }

  return {
    id: censusRow.id,
    data: updatedData,
    createdAt: censusRow.created_at,
  };
}


export type HouseholdDeleteResult = {
  recycleBinId: string;
  censusRecordId: string;
  householdNumber: string;
};

export async function deleteHouseholdToRecycleBin(
  householdNumberInput: string,
  reasonInput: string
): Promise<HouseholdDeleteResult> {
  const householdNumber = householdNumberInput.trim();
  const reason = reasonInput.trim();

  if (!householdNumber) throw new Error("Household number is required.");
  if (!reason) throw new Error("A deletion reason is required.");

  const actor = await getCurrentAuditActor();

  const { data: censusRow, error: censusError } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .eq("data->>householdNumber", householdNumber)
    .maybeSingle();
  if (censusError) throw censusError;
  if (!censusRow?.data) throw new Error("The household census record could not be found.");

  const { data: householdRow, error: householdError } = await supabase
    .from("households")
    .select("*")
    .eq("household_number", householdNumber)
    .maybeSingle();
  if (householdError) throw householdError;
  if (!householdRow?.id) throw new Error("The normalized household record could not be found.");

  const householdId = householdRow.id;
  const { data: familyRows, error: familiesError } = await supabase
    .from("families").select("*").eq("household_id", householdId);
  if (familiesError) throw familiesError;

  const { data: residentRows, error: residentsError } = await supabase
    .from("residents").select("*").eq("household_id", householdId);
  if (residentsError) throw residentsError;

  const residentIds = (residentRows || []).map((row: any) => row.id);
  const familyIds = (familyRows || []).map((row: any) => row.id);
  const childRows: Record<string, any[]> = {};

  for (const table of ["resident_education", "resident_employment", "resident_occupations", "resident_skills_new"]) {
    if (!residentIds.length) { childRows[table] = []; continue; }
    const { data, error } = await supabase.from(table).select("*").in("resident_id", residentIds);
    if (error) throw error;
    childRows[table] = data || [];
  }

  if (familyIds.length) {
    const { data, error } = await supabase.from("family_memberships").select("*").in("family_id", familyIds);
    if (error) throw error;
    childRows.family_memberships = data || [];
  } else {
    childRows.family_memberships = [];
  }

  const snapshot = {
    census_record: censusRow,
    household: householdRow,
    families: familyRows || [],
    residents: residentRows || [],
    child_rows: childRows,
  };

  const { data: recycleRow, error: recycleError } = await supabase
    .from("recycle_bin")
    .insert({
      deleted_by_user_id: actor.userId,
      deleted_by_email: actor.email,
      deleted_by_name: actor.name,
      deleted_by_role: actor.role,
      entity_type: "household",
      entity_id: String(householdId),
      entity_name: householdNumber,
      household_number: householdNumber,
      delete_reason: reason,
      snapshot,
      metadata: { census_record_id: censusRow.id },
    })
    .select("id")
    .single();
  if (recycleError) throw recycleError;

  try {
    if (familyIds.length) {
      const { error } = await supabase.from("family_memberships").delete().in("family_id", familyIds);
      if (error) throw error;
    }
    for (const table of ["resident_education", "resident_employment", "resident_occupations", "resident_skills_new"]) {
      if (!residentIds.length) continue;
      const { error } = await supabase.from(table).delete().in("resident_id", residentIds);
      if (error) throw error;
    }
    if (familyIds.length) {
      const { error } = await supabase.from("families").delete().in("id", familyIds);
      if (error) throw error;
    }
    if (residentIds.length) {
      const { error } = await supabase.from("residents").delete().in("id", residentIds);
      if (error) throw error;
    }
    const { error: householdDeleteError } = await supabase.from("households").delete().eq("id", householdId);
    if (householdDeleteError) throw householdDeleteError;
    const { error: censusDeleteError } = await supabase.from("census_records").delete().eq("id", censusRow.id);
    if (censusDeleteError) throw censusDeleteError;

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_user_id: actor.userId,
      actor_email: actor.email,
      actor_name: actor.name,
      actor_role: actor.role,
      action: "DELETE",
      entity_type: "household",
      entity_id: String(householdId),
      entity_name: householdNumber,
      reason,
      before_data: snapshot,
      after_data: { status: "in_recycle_bin", recycle_bin_id: recycleRow.id },
      metadata: { household_number: householdNumber, census_record_id: censusRow.id },
    });
    if (auditError) throw auditError;
  } catch (deleteError) {
    // The backup is intentionally kept if a multi-table delete stops part-way.
    // This preserves recovery evidence for the Secretary instead of destroying it.
    throw new Error(
      `Household deletion did not fully complete. Its Recycle Bin backup was preserved. ${deleteError instanceof Error ? deleteError.message : ""}`.trim(), { cause: deleteError }
    );
  }

  return { recycleBinId: recycleRow.id, censusRecordId: censusRow.id, householdNumber };
}

// ======================================================
// UPDATE FAMILY
// KEEP JSON + NORMALIZED FAMILY IN SYNC
// ======================================================

export type FamilyUpdateInput = {
  householdNumber: string;
  familyId: string;
  familyName: string;
};

function findFamilyIndex(
  data: CensusData,
  familyId: string
): number {
  return Array.isArray(data.families)
    ? data.families.findIndex(
        (family) => String(family.id) === String(familyId)
      )
    : -1;
}

export async function updateFamily(
  input: FamilyUpdateInput
): Promise<CensusRecord> {
  const householdNumber = input.householdNumber.trim();
  const familyId = String(input.familyId).trim();
  const familyName = input.familyName.trim();

  if (!householdNumber) throw new Error("Household number is required.");
  if (!familyId) throw new Error("Family ID is required.");
  if (!familyName) throw new Error("Family name is required.");

  const actor = await getCurrentAuditActor();

  const { data: censusRow, error: censusError } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .eq("data->>householdNumber", householdNumber)
    .maybeSingle();

  if (censusError) throw censusError;
  if (!censusRow?.data) throw new Error("The family census record could not be found.");

  const originalData = structuredClone(censusRow.data) as CensusData;
  const updatedData = structuredClone(censusRow.data) as CensusData;
  const familyIndex = findFamilyIndex(updatedData, familyId);

  if (familyIndex < 0) throw new Error("The family could not be found in the census record.");

  const family = updatedData.families[familyIndex];
  const beforeFamily = {
    householdNumber,
    familyId: String(family.id),
    familyName: family.familyName || "",
  };

  family.familyName = familyName;

  const afterFamily = {
    householdNumber,
    familyId: String(family.id),
    familyName: family.familyName || "",
  };

  const { data: updatedRows, error: jsonError } = await supabase
    .from("census_records")
    .update({ data: updatedData })
    .eq("id", censusRow.id)
    .select("id");

  if (jsonError) throw jsonError;
  if (!updatedRows?.length) throw new Error("The family census JSON record was not updated.");

  try {
    const { data: householdRow, error: householdError } = await supabase
      .from("households")
      .select("id")
      .eq("household_number", householdNumber)
      .maybeSingle();

    if (householdError) throw householdError;
    if (!householdRow?.id) throw new Error("The normalized household record could not be found.");

    const familyNumber = Number(familyId);
    if (!Number.isFinite(familyNumber)) throw new Error("The family number is invalid.");

    const { data: normalizedRows, error: normalizedError } = await supabase
      .from("families")
      .update({
        family_name: familyName,
        updated_at: new Date().toISOString(),
      })
      .eq("household_id", householdRow.id)
      .eq("family_number", familyNumber)
      .select("id");

    if (normalizedError) throw normalizedError;
    if (!normalizedRows?.length) throw new Error("The normalized family record was not updated.");
  } catch (normalizedError) {
    await supabase
      .from("census_records")
      .update({ data: originalData })
      .eq("id", censusRow.id);
    throw normalizedError;
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    actor_name: actor.name,
    actor_role: actor.role,
    action: "EDIT",
    entity_type: "family",
    entity_id: `${householdNumber}:${familyId}`,
    entity_name: familyName,
    reason: "Family information updated",
    before_data: beforeFamily,
    after_data: afterFamily,
    metadata: {
      household_number: householdNumber,
      family_number: Number(familyId),
      census_record_id: censusRow.id,
    },
  });

  if (auditError) {
    const { data: householdRow, error: householdLookupError } = await supabase
      .from("households")
      .select("id")
      .eq("household_number", householdNumber)
      .maybeSingle();
    const censusRollback = await supabase
      .from("census_records")
      .update({ data: originalData })
      .eq("id", censusRow.id);
    const familyRollback = householdRow?.id
      ? await supabase.from("families").update({
          family_name: beforeFamily.familyName || null,
          updated_at: new Date().toISOString(),
        }).eq("household_id", householdRow.id).eq("family_number", Number(familyId))
      : { error: householdLookupError || new Error("Household not found during rollback.") };
    if (householdLookupError || censusRollback.error || familyRollback.error) {
      console.error("FAMILY UPDATE ROLLBACK FAILED:", householdLookupError, censusRollback.error, familyRollback.error);
      throw new Error("The audit entry failed and the family update could not be fully restored. Contact the system administrator before retrying.", { cause: auditError });
    }
    throw new Error(`The family update was restored because the Audit Trail entry failed: ${auditError.message}`, { cause: auditError });
  }

  return {
    id: censusRow.id,
    data: updatedData,
    createdAt: censusRow.created_at,
  };
}

// ======================================================
// DELETE FAMILY TO RECYCLE BIN
// Residents stay active; only the family and its
// memberships are removed.
// ======================================================

export type FamilyDeleteResult = {
  recycleBinId: string;
  censusRecordId: string;
  householdNumber: string;
  familyId: string;
};

export async function deleteFamilyToRecycleBin(
  householdNumberInput: string,
  familyIdInput: string,
  reasonInput: string
): Promise<FamilyDeleteResult> {
  const householdNumber = householdNumberInput.trim();
  const familyId = String(familyIdInput).trim();
  const reason = reasonInput.trim();

  if (!householdNumber) throw new Error("Household number is required.");
  if (!familyId) throw new Error("Family ID is required.");
  if (!reason) throw new Error("A deletion reason is required.");

  const actor = await getCurrentAuditActor();

  const { data: censusRow, error: censusError } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .eq("data->>householdNumber", householdNumber)
    .maybeSingle();

  if (censusError) throw censusError;
  if (!censusRow?.data) {
    throw new Error("The family census record could not be found.");
  }

  const currentData = structuredClone(censusRow.data) as CensusData;
  const familyIndex = findFamilyIndex(currentData, familyId);

  if (familyIndex < 0) {
    throw new Error("The family could not be found in the census record.");
  }

  const familySnapshot =
    structuredClone(currentData.families[familyIndex]) as Family;

  const familyNumber = Number(familyId);
  if (!Number.isFinite(familyNumber)) {
    throw new Error("The family number is invalid.");
  }

  // Some older census records may exist in census_records JSON but may not
  // have a matching normalized household/family row. Do not block a safe
  // recycle-bin delete in that case; keep whatever normalized data exists.
  const { data: householdRow, error: householdError } = await supabase
    .from("households")
    .select("*")
    .eq("household_number", householdNumber)
    .maybeSingle();

  if (householdError) throw householdError;

  let normalizedFamily: Record<string, any> | null = null;
  let memberships: Record<string, any>[] = [];

  if (householdRow?.id) {
    const { data: familyRow, error: familyError } = await supabase
      .from("families")
      .select("*")
      .eq("household_id", householdRow.id)
      .eq("family_number", familyNumber)
      .maybeSingle();

    if (familyError) throw familyError;

    normalizedFamily = familyRow || null;

    if (normalizedFamily?.id) {
      const { data: membershipRows, error: membershipError } =
        await supabase
          .from("family_memberships")
          .select("*")
          .eq("family_id", normalizedFamily.id);

      if (membershipError) throw membershipError;
      memberships = membershipRows || [];
    }
  }

  const snapshot = {
    census_record_id: censusRow.id,
    household_number: householdNumber,
    family_index: familyIndex,
    source_family: familySnapshot,
    normalized_household: householdRow || null,
    normalized_family: normalizedFamily,
    family_memberships: memberships,
  };

  const entityId = normalizedFamily?.id
    ? String(normalizedFamily.id)
    : `${householdNumber}:${familyId}`;

  const { data: recycleRow, error: recycleError } = await supabase
    .from("recycle_bin")
    .insert({
      deleted_by_user_id: actor.userId,
      deleted_by_email: actor.email,
      deleted_by_name: actor.name,
      deleted_by_role: actor.role,
      entity_type: "family",
      entity_id: entityId,
      entity_name:
        familySnapshot.familyName || `Family ${familyId}`,
      household_number: householdNumber,
      delete_reason: reason,
      snapshot,
      metadata: {
        census_record_id: censusRow.id,
        family_number: familyNumber,
        normalized_household_found: Boolean(householdRow?.id),
        normalized_family_found: Boolean(normalizedFamily?.id),
      },
    })
    .select("id")
    .single();

  if (recycleError) throw recycleError;

  const updatedData = structuredClone(currentData) as CensusData;
  updatedData.families.splice(familyIndex, 1);

  try {
    const { data: jsonRows, error: jsonDeleteError } = await supabase
      .from("census_records")
      .update({ data: updatedData })
      .eq("id", censusRow.id)
      .select("id");

    if (jsonDeleteError) throw jsonDeleteError;
    if (!jsonRows?.length) {
      throw new Error("The family was not removed from the census JSON.");
    }

    if (normalizedFamily?.id) {
      const { error: membershipsDeleteError } = await supabase
        .from("family_memberships")
        .delete()
        .eq("family_id", normalizedFamily.id);

      if (membershipsDeleteError) throw membershipsDeleteError;

      const { data: deletedFamilyRows, error: normalizedDeleteError } =
        await supabase
          .from("families")
          .delete()
          .eq("id", normalizedFamily.id)
          .select("id");

      if (normalizedDeleteError) throw normalizedDeleteError;

      if (!deletedFamilyRows?.length) {
        throw new Error("The normalized family record was not deleted.");
      }
    }

    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        actor_user_id: actor.userId,
        actor_email: actor.email,
        actor_name: actor.name,
        actor_role: actor.role,
        action: "DELETE",
        entity_type: "family",
        entity_id: entityId,
        entity_name:
          familySnapshot.familyName || `Family ${familyId}`,
        reason,
        before_data: snapshot,
        after_data: {
          status: "in_recycle_bin",
          recycle_bin_id: recycleRow.id,
        },
        metadata: {
          household_number: householdNumber,
          family_number: familyNumber,
          census_record_id: censusRow.id,
          normalized_household_found: Boolean(householdRow?.id),
          normalized_family_found: Boolean(normalizedFamily?.id),
        },
      });

    if (auditError) throw auditError;
  } catch (deleteError) {
    throw new Error(
      `Family deletion did not fully complete. Its Recycle Bin backup was preserved. ${
        deleteError instanceof Error ? deleteError.message : ""
      }`.trim(), { cause: deleteError }
    );
  }

  return {
    recycleBinId: recycleRow.id,
    censusRecordId: censusRow.id,
    householdNumber,
    familyId,
  };
}


