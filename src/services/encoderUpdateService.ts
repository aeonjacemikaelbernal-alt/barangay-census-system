import { supabase } from "./supabaseClient";
import type { CensusData, CensusRecord, Resident } from "../types/census";
import { formatNameSuffix, toProperNameCase } from "../utils/nameFormatter";

function seniorCitizenStatusFromBirthDate(birthDate: string): string {
  if (!birthDate) throw new Error("A valid date of birth is required to calculate senior citizen status.");
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) throw new Error("Enter a valid date of birth.");
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  if (age < 0) throw new Error("Date of birth cannot be in the future.");
  return age >= 60 ? "Yes" : "No";
}

export type ResidentUpdateFields = Pick<
  Resident,
  | "firstName"
  | "middleName"
  | "lastName"
  | "suffix"
  | "birthDate"
  | "sex"
  | "civilStatus"
  | "contactNumber"
  | "email"
  | "nationality"
  | "religion"
  | "voterStatus"
  | "fourPsMember"
  | "disability"
  | "seniorCitizen"
>;

export type ResidentUpdateTarget = {
  censusRecordId: string;
  householdNumber: string;
  familyId: number;
  memberIndex: number;
  residentId: string;
};

export async function updateResidentAnnualRecord(input: {
  target: ResidentUpdateTarget;
  fields: ResidentUpdateFields;
  updateYear: number;
}): Promise<CensusRecord> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error("Your session could not be verified. Please sign in again.");

  const { data: actor, error: actorError } = await supabase
    .from("authorized_users")
    .select("auth_user_id, email, full_name, role, is_active")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (actorError) throw actorError;
  if (!actor?.is_active || !["encoder", "secretary"].includes(actor.role)) {
    throw new Error("An active Encoder account is required to submit this update.");
  }

  if (!input.fields.firstName.trim() || !input.fields.lastName.trim()) {
    throw new Error("First name and last name are required.");
  }
  const derivedSeniorCitizen = seniorCitizenStatusFromBirthDate(input.fields.birthDate);
  if (!input.target.residentId.trim()) {
    throw new Error("This resident has no stable Resident ID, so the update cannot be safely synchronized. Ask the Secretary to verify the resident record first.");
  }

  const { data: censusRow, error: lookupError } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .eq("id", input.target.censusRecordId)
    .maybeSingle();

  if (lookupError) throw lookupError;
  if (!censusRow?.data) throw new Error("The selected census record could not be found. Refresh and try again.");

  const originalData = structuredClone(censusRow.data) as CensusData;
  const updatedData = structuredClone(censusRow.data) as CensusData;
  const family = updatedData.families.find((item) => item.id === input.target.familyId);
  const member = family?.members[input.target.memberIndex];

  if (
    !member ||
    (input.target.residentId && member.residentId !== input.target.residentId)
  ) {
    throw new Error("This resident record changed since you selected it. Search again to load the latest information.");
  }

  const beforeData: ResidentUpdateFields = {
    firstName: member.firstName || "",
    middleName: member.middleName || "",
    lastName: member.lastName || "",
    suffix: member.suffix || "",
    birthDate: member.birthDate || "",
    sex: member.sex || "",
    civilStatus: member.civilStatus || "",
    contactNumber: member.contactNumber || "",
    email: member.email || "",
    nationality: member.nationality || "",
    religion: member.religion || "",
    voterStatus: member.voterStatus || "",
    fourPsMember: member.fourPsMember || "",
    disability: member.disability || "",
    seniorCitizen: member.seniorCitizen || "",
  };

  const afterData: ResidentUpdateFields = {
    ...input.fields,
    seniorCitizen: derivedSeniorCitizen,
    firstName: toProperNameCase(input.fields.firstName),
    middleName: toProperNameCase(input.fields.middleName),
    lastName: toProperNameCase(input.fields.lastName),
    suffix: formatNameSuffix(input.fields.suffix),
    contactNumber: input.fields.contactNumber.trim(),
    email: input.fields.email.trim(),
  };

  Object.assign(member, afterData);
  member.familyMemberName = [
    member.firstName,
    member.middleName,
    member.lastName,
    member.suffix,
  ].filter(Boolean).join(" ");

  const { data: updatedRows, error: updateError } = await supabase
    .from("census_records")
    .update({ data: updatedData })
    .eq("id", censusRow.id)
    .select("id");

  if (updateError) throw updateError;
  if (!updatedRows?.length) throw new Error("The census record was not updated. Check your account permissions.");

  let normalizedResidentUpdated = false;
  if (input.target.residentId) {
    const { data: residentRows, error: residentUpdateError } = await supabase
      .from("residents")
      .update({
        first_name: afterData.firstName,
        middle_name: afterData.middleName || null,
        last_name: afterData.lastName,
        suffix: afterData.suffix || null,
        birth_date: afterData.birthDate || null,
        sex: afterData.sex || null,
        civil_status: afterData.civilStatus || null,
        contact_number: afterData.contactNumber || null,
        email: afterData.email || null,
        nationality: afterData.nationality || null,
        religion: afterData.religion || null,
        voter_status: afterData.voterStatus || null,
        four_ps_member: afterData.fourPsMember || null,
        disability: afterData.disability || null,
        senior_citizen: afterData.seniorCitizen || null,
        family_member_name: member.familyMemberName,
        updated_at: new Date().toISOString(),
      })
      .eq("resident_id", input.target.residentId)
      .select("id");

    if (residentUpdateError || !residentRows?.length) {
      await supabase.from("census_records").update({ data: originalData }).eq("id", censusRow.id);
      if (residentUpdateError) throw residentUpdateError;
      throw new Error("The resident profile was not updated in the registry. The census record was restored.");
    }
    normalizedResidentUpdated = true;
  }

  const fullName = [afterData.firstName, afterData.middleName, afterData.lastName, afterData.suffix]
    .filter(Boolean)
    .join(" ");

  const { error: auditError } = await supabase.from("audit_logs").insert({
    actor_user_id: authData.user.id,
    actor_email: actor.email || authData.user.email || null,
    actor_name: actor.full_name || null,
    actor_role: actor.role,
    action: "EDIT",
    entity_type: "resident",
    entity_id: input.target.residentId || `${input.target.householdNumber}:${input.target.familyId}:${input.target.memberIndex}`,
    entity_name: fullName,
    reason: `Annual census information update (${input.updateYear})`,
    before_data: beforeData,
    after_data: afterData,
    metadata: {
      household_number: input.target.householdNumber,
      census_record_id: censusRow.id,
      update_year: input.updateYear,
    },
  });

  if (auditError) {
    if (normalizedResidentUpdated && input.target.residentId) {
      await supabase.from("residents").update({
        first_name: beforeData.firstName,
        middle_name: beforeData.middleName || null,
        last_name: beforeData.lastName,
        suffix: beforeData.suffix || null,
        birth_date: beforeData.birthDate || null,
        sex: beforeData.sex || null,
        civil_status: beforeData.civilStatus || null,
        contact_number: beforeData.contactNumber || null,
        email: beforeData.email || null,
        nationality: beforeData.nationality || null,
        religion: beforeData.religion || null,
        voter_status: beforeData.voterStatus || null,
        four_ps_member: beforeData.fourPsMember || null,
        disability: beforeData.disability || null,
        senior_citizen: beforeData.seniorCitizen || null,
        family_member_name: [beforeData.firstName, beforeData.middleName, beforeData.lastName, beforeData.suffix].filter(Boolean).join(" "),
        updated_at: new Date().toISOString(),
      }).eq("resident_id", input.target.residentId);
    }
    await supabase.from("census_records").update({ data: originalData }).eq("id", censusRow.id);
    throw new Error(`The update could not be recorded in the audit trail, so the resident changes were restored. ${auditError.message}`);
  }

  return {
    id: censusRow.id,
    data: updatedData,
    createdAt: censusRow.created_at,
  };
}
