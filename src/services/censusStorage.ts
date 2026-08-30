import { supabase } from "./supabaseClient";
import type {
  CensusData,
  CensusRecord,
  Resident,
} from "../types/census";

console.log("🔥 CENSUS STORAGE FILE LOADED 🔥");

supabase.auth.getSession().then(({ data, error }) => {
 console.log("🔐 CURRENT SUPABASE SESSION:", data.session);

console.log(
  "👤 LOGGED-IN AUTH USER ID:",
  data.session?.user?.id
);

console.log(
  "📧 LOGGED-IN EMAIL:",
  data.session?.user?.email
);

  if (error) {
    console.error("SESSION CHECK ERROR:", error);
  }
});


// ======================================================
// LOAD LEGACY CENSUS RECORDS
// KEEP THIS WORKING FOR NOW
// ======================================================

export async function getCensusRecords(): Promise<CensusRecord[]> {
  const { data, error } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .order("created_at", { ascending: false });

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
  data: CensusData
): Promise<void> {

  console.log(
    "🟦 NORMALIZED CENSUS SAVE STARTED"
  );
  const {
  data: { session },
  error: sessionError,
} = await supabase.auth.getSession();

console.log("🔐 SUPABASE SESSION:", session);

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


  console.log(
    "✅ Household saved:",
    householdId
  );


  // ====================================================
  // 2. COLLECT UNIQUE RESIDENTS
  // ====================================================

  const uniqueResidents =
    new Map<string, Resident>();


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


  console.log(
    "✅ NORMALIZED CENSUS SAVE COMPLETED"
  );
}


// ======================================================
// MAIN SAVE
// EXISTING JSON + NEW NORMALIZED STORAGE
// ======================================================

export async function saveCensusRecord(
  data: CensusData
): Promise<CensusRecord> {

  console.log(
    "🔥 NEW saveCensusRecord() IS RUNNING"
  );

  console.log(
    "CENSUS DATA TO SAVE:",
    data
  );


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

      data,

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


  console.log(
    "✅ CENSUS RECORD JSON SAVED:",
    savedData
  );


  // ====================================================
  // 2. SHADOW SAVE TO NORMALIZED DATABASE
  // IMPORTANT:
  // DO NOT BREAK WORKING SUBMISSION YET
  // ====================================================

  try {

    await saveNormalizedCensus(
      data
    );

  } catch (normalizedError) {

    console.error(
      "⚠️ NORMALIZED SAVE FAILED:",
      normalizedError
    );

    console.warn(
      "JSON census record was still saved successfully."
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