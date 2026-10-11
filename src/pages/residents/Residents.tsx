import { useState } from "react";
import "../dashboard/dashboard.css";
import { supabase } from "../../services/supabaseClient";
import { UserRound, Cake, Vote, Search, X, Pencil, Save, Trash2, AlertTriangle, List, ChartNoAxesColumnIncreasing, Printer } from "lucide-react";
import type {
  CensusData,
  Family,
  Resident,
} from "../../types/census";
import { formatResidentRecordName, compareResidentNames } from "../../utils/nameFormatter";
import ResidentsDemographics from "./ResidentsDemographics";
import barangayLogo from "../../assets/barangay-pambuhan-logo.png";
import residentPrintCssUrl from "./ResidentPrint.css?url";


type ResidentRow = {
  resident_id: string;
  source_resident_id: string | null;
  record_index: number;
  family_index: number;
  member_index: number;
  household_id: string | null;
  purok: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  suffix: string | null;
  sex: string | null;
  birth_date: string | null;
  civil_status: string | null;
  relationship: string | null;
  resident_type: string | null;
  has_own_family: boolean | null;
  nationality: string | null;
  religion: string | null;
  disability: string | null;
  senior_citizen: string | null;
  contact_number: string | null;
};

 type ResidentsProps = {
  censusRecords: CensusData[];
};

type ResidentEditDraft = {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  sex: string;
  birth_date: string;
  civil_status: string;
};

function formatResidentFullName(resident: ResidentRow): string {
  return formatResidentRecordName(resident);
}


type AuditActor = {
  user_id: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
};

async function getAuditActor(): Promise<AuditActor> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) {
    throw authError;
  }

  const user = authData.user;

  if (!user) {
    throw new Error("Your session could not be verified. Please sign in again.");
  }

  const { data: authorizedUser, error: authorizedUserError } =
    await supabase
      .from("authorized_users")
      .select("email, full_name, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (authorizedUserError) {
    throw authorizedUserError;
  }

  return {
    user_id: user.id,
    email: authorizedUser?.email || user.email || null,
    name: authorizedUser?.full_name || null,
    role: authorizedUser?.role || null,
  };
}

async function writeResidentAuditLog(input: {
  actor: AuditActor;
  action: "EDIT" | "DELETE";
  residentId: string;
  residentName: string;
  reason?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  householdNumber?: string | null;
  recycleBinId?: string | null;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: input.actor.user_id,
    actor_email: input.actor.email,
    actor_name: input.actor.name,
    actor_role: input.actor.role,
    action: input.action,
    entity_type: "resident",
    entity_id: input.residentId,
    entity_name: input.residentName,
    reason: input.reason || null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: {
      household_number: input.householdNumber || null,
      recycle_bin_id: input.recycleBinId || null,
    },
  });

  if (error) {
    throw error;
  }
}

function Residents({
  censusRecords,
}: ResidentsProps) {

 

  // =========================
  // SEARCH & FILTER STATES
  // =========================

  const [viewMode, setViewMode] = useState<"list" | "demographics">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [sexFilter, setSexFilter] = useState("");
  const [civilStatusFilter, setCivilStatusFilter] = useState("");
  const [residentTypeFilter, setResidentTypeFilter] = useState("");
  const [purokFilter, setPurokFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filtersApplied, setFiltersApplied] = useState(false);
  const ITEMS_PER_PAGE = 5;

  type ResidentPrintType = "masterlist" | "attendance" | "assistance";
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [residentPrintType, setResidentPrintType] =
    useState<ResidentPrintType>("masterlist");
  const [printPurpose, setPrintPurpose] = useState("");

  const purokOptions = [
    "PUROK 1",
    "PUROK 2",
    "PUROK 3",
    "PUROK 4A",
    "PUROK 4B",
    "PUROK 5",
    "PUROK 6",
  ];

  const [editingResident, setEditingResident] =
    useState<ResidentRow | null>(null);

  const [editDraft, setEditDraft] =
    useState<ResidentEditDraft | null>(null);

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [editSuccess, setEditSuccess] =
    useState("");

  const [residentOverrides, setResidentOverrides] =
    useState<Record<string, Partial<ResidentRow>>>({});

  const [deletingResident, setDeletingResident] =
    useState<ResidentRow | null>(null);

  const [deleteReason, setDeleteReason] =
    useState("");

  const [deleteOtherReason, setDeleteOtherReason] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  const [deletedResidentIds, setDeletedResidentIds] =
    useState<Set<string>>(() => new Set());

 const baseResidents: ResidentRow[] = (
  Array.isArray(censusRecords)
    ? censusRecords
    : []
).flatMap((record: CensusData, recordIndex: number) => {
  const families = Array.isArray(record?.families)
    ? record.families
    : [];

  return families.flatMap(
   (family: Family, familyIndex: number) => {
      const members = Array.isArray(family?.members)
        ? family.members
        : [];

      return members.map(
       (member: Resident, memberIndex: number) => ({
          resident_id:
            `${recordIndex}-${familyIndex}-${memberIndex}`,

          source_resident_id:
            String(
              (member as Resident & { residentId?: string })
                .residentId || ""
            ) || null,

          record_index: recordIndex,
          family_index: familyIndex,
          member_index: memberIndex,

         household_id:
  record.householdNumber || null,

          purok:
            record.household?.purok || null,

          first_name: member?.firstName || null,
          middle_name: member?.middleName || null,
          last_name: member?.lastName || null,
          suffix: member?.suffix || null,

          sex: member?.sex || null,
          birth_date: member?.birthDate || null,
          civil_status: member?.civilStatus || null,

          relationship:
            member?.familyRelationship || null,

          resident_type:
            member?.familyRelationship === "Family Head"
              ? "Family Head"
              : "Family Member",

          has_own_family:
            member?.hasOwnFamily === "Yes"
              ? true
              : member?.hasOwnFamily === "No"
              ? false
              : null,

          nationality: member?.nationality || null,
          religion: member?.religion || null,
          disability: member?.disability || null,
          senior_citizen: member?.seniorCitizen || null,
          contact_number: member?.contactNumber || null,
        })
      );
    }
  );
});

  const residents: ResidentRow[] =
    baseResidents
      .filter(
        (resident) =>
          !deletedResidentIds.has(
            resident.resident_id
          )
      )
      .map((resident) => ({
        ...resident,
        ...(residentOverrides[resident.resident_id] || {}),
      }));

  function openEditResident(resident: ResidentRow) {
    setEditingResident(resident);
    setEditDraft({
      first_name: resident.first_name || "",
      middle_name: resident.middle_name || "",
      last_name: resident.last_name || "",
      suffix: resident.suffix || "",
      sex: resident.sex || "",
      birth_date: resident.birth_date || "",
      civil_status: resident.civil_status || "",
    });
    setEditError("");
    setEditSuccess("");
  }

  function closeEditResident() {
    if (savingEdit) return;
    setEditingResident(null);
    setEditDraft(null);
    setEditError("");
  }

  function updateEditField(
    field: keyof ResidentEditDraft,
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

  async function saveResidentEdit() {
    if (!editingResident || !editDraft) return;

    const householdNumber =
      editingResident.household_id;

    if (!householdNumber) {
      setEditError(
        "Household number is missing for this resident."
      );
      return;
    }

    if (
      !editDraft.first_name.trim() ||
      !editDraft.last_name.trim()
    ) {
      setEditError(
        "First name and last name are required."
      );
      return;
    }

    setSavingEdit(true);
    setEditError("");
    setEditSuccess("");

    try {
      const auditActor = await getAuditActor();

      const { data: censusRow, error: censusLookupError } =
        await supabase
          .from("census_records")
          .select("id, data")
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

      const originalCensus =
        structuredClone(censusRow.data) as CensusData;

      const updatedCensus =
        structuredClone(censusRow.data) as CensusData;

      const sourceResidentId =
        editingResident.source_resident_id;

      let updatedMemberFound = false;

      (updatedCensus.families || []).forEach(
        (family, familyIndex) => {
          (family.members || []).forEach(
            (member, memberIndex) => {
              const memberResidentId = String(
                (
                  member as Resident & {
                    residentId?: string;
                  }
                ).residentId || ""
              );

              const matchesBusinessId =
                Boolean(sourceResidentId) &&
                memberResidentId === sourceResidentId;

              const matchesOriginalPosition =
                !sourceResidentId &&
                familyIndex ===
                  editingResident.family_index &&
                memberIndex ===
                  editingResident.member_index;

              if (
                !matchesBusinessId &&
                !matchesOriginalPosition
              ) {
                return;
              }

              member.firstName =
                editDraft.first_name.trim();
              member.middleName =
                editDraft.middle_name.trim();
              member.lastName =
                editDraft.last_name.trim();
              member.suffix =
                editDraft.suffix.trim();
              member.sex = editDraft.sex;
              member.birthDate =
                editDraft.birth_date;
              member.civilStatus =
                editDraft.civil_status;

              member.familyMemberName = [
                member.firstName,
                member.middleName,
                member.lastName,
                member.suffix,
              ]
                .filter(Boolean)
                .join(" ");

              updatedMemberFound = true;
            }
          );
        }
      );

      if (!updatedMemberFound) {
        throw new Error(
          "The resident could not be located inside the census record."
        );
      }

      const { error: censusUpdateError } =
        await supabase
          .from("census_records")
          .update({
            data: updatedCensus,
          })
          .eq("id", censusRow.id);

      if (censusUpdateError) {
        throw censusUpdateError;
      }

      if (sourceResidentId) {
        const { error: residentUpdateError } =
          await supabase
            .from("residents")
            .update({
              first_name:
                editDraft.first_name.trim(),
              middle_name:
                editDraft.middle_name.trim() || null,
              last_name:
                editDraft.last_name.trim(),
              suffix:
                editDraft.suffix.trim() || null,
              sex:
                editDraft.sex || null,
              birth_date:
                editDraft.birth_date || null,
              civil_status:
                editDraft.civil_status || null,
              family_member_name: [
                editDraft.first_name.trim(),
                editDraft.middle_name.trim(),
                editDraft.last_name.trim(),
                editDraft.suffix.trim(),
              ]
                .filter(Boolean)
                .join(" "),
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "resident_id",
              sourceResidentId
            );

        if (residentUpdateError) {
          // Restore the JSON record if normalized update fails.
          const { error: rollbackError } =
            await supabase
              .from("census_records")
              .update({
                data: censusRow.data,
              })
              .eq("id", censusRow.id);

          if (rollbackError) {
            console.error(
              "FAILED TO ROLLBACK RESIDENT EDIT:",
              rollbackError
            );
          }

          throw residentUpdateError;
        }
      }

      const beforeAuditData = {
        first_name: editingResident.first_name,
        middle_name: editingResident.middle_name,
        last_name: editingResident.last_name,
        suffix: editingResident.suffix,
        sex: editingResident.sex,
        birth_date: editingResident.birth_date,
        civil_status: editingResident.civil_status,
        relationship: editingResident.relationship,
        resident_type: editingResident.resident_type,
      };

      const afterAuditData = {
        first_name: editDraft.first_name.trim(),
        middle_name: editDraft.middle_name.trim() || null,
        last_name: editDraft.last_name.trim(),
        suffix: editDraft.suffix.trim() || null,
        sex: editDraft.sex || null,
        birth_date: editDraft.birth_date || null,
        civil_status: editDraft.civil_status || null,
        relationship: editingResident.relationship,
        resident_type: editingResident.resident_type,
      };

      try {
        await writeResidentAuditLog({
          actor: auditActor,
          action: "EDIT",
          residentId:
            sourceResidentId || editingResident.resident_id,
          residentName: [
            editDraft.first_name.trim(),
            editDraft.middle_name.trim(),
            editDraft.last_name.trim(),
            editDraft.suffix.trim(),
          ]
            .filter(Boolean)
            .join(" "),
          beforeData: beforeAuditData,
          afterData: afterAuditData,
          householdNumber,
        });
      } catch (auditError) {
        const { error: jsonRollbackError } =
          await supabase
            .from("census_records")
            .update({ data: originalCensus })
            .eq("id", censusRow.id);

        if (jsonRollbackError) {
          console.error(
            "FAILED TO ROLLBACK CENSUS JSON AFTER AUDIT ERROR:",
            jsonRollbackError
          );
        }

        if (sourceResidentId) {
          const { error: residentRollbackError } =
            await supabase
              .from("residents")
              .update({
                first_name: editingResident.first_name,
                middle_name: editingResident.middle_name,
                last_name: editingResident.last_name,
                suffix: editingResident.suffix,
                sex: editingResident.sex,
                birth_date: editingResident.birth_date,
                civil_status: editingResident.civil_status,
                family_member_name: [
                  editingResident.first_name,
                  editingResident.middle_name,
                  editingResident.last_name,
                  editingResident.suffix,
                ]
                  .filter(Boolean)
                  .join(" "),
                updated_at: new Date().toISOString(),
              })
              .eq("resident_id", sourceResidentId);

          if (residentRollbackError) {
            console.error(
              "FAILED TO ROLLBACK NORMALIZED RESIDENT AFTER AUDIT ERROR:",
              residentRollbackError
            );
          }
        }

        throw new Error(
          "The resident update was cancelled because the audit log could not be saved.",
          { cause: auditError }
        );
      }

      const rowPatch: Partial<ResidentRow> = {
        first_name:
          editDraft.first_name.trim(),
        middle_name:
          editDraft.middle_name.trim() || null,
        last_name:
          editDraft.last_name.trim(),
        suffix:
          editDraft.suffix.trim() || null,
        sex:
          editDraft.sex || null,
        birth_date:
          editDraft.birth_date || null,
        civil_status:
          editDraft.civil_status || null,
      };

      setResidentOverrides((current) => {
        const updated = { ...current };

        baseResidents.forEach((resident) => {
          const sameResident =
            sourceResidentId
              ? resident.source_resident_id ===
                sourceResidentId
              : resident.resident_id ===
                editingResident.resident_id;

          if (sameResident) {
            updated[resident.resident_id] =
              rowPatch;
          }
        });

        return updated;
      });

      setEditSuccess(
        "Resident information updated successfully."
      );

      window.setTimeout(() => {
        setEditingResident(null);
        setEditDraft(null);
        setEditSuccess("");
      }, 900);
    } catch (error) {
      console.error(
        "FAILED TO UPDATE RESIDENT:",
        error
      );

      setEditError(
        error instanceof Error
          ? error.message
          : "Unable to update resident information."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function requestDeleteResident(
    resident: ResidentRow
  ) {
    setDeleteError("");
    setDeleteReason("");
    setDeleteOtherReason("");

    if (
      resident.relationship === "Family Head"
    ) {
      setDeletingResident(resident);
      setDeleteError(
        "This resident is a Family Head. Reassign the Family Head first before deleting this resident."
      );
      return;
    }

    if (resident.has_own_family === true) {
      setDeletingResident(resident);
      setDeleteError(
        "This resident has their own family record. The linked family must be handled first before this resident can be deleted."
      );
      return;
    }

    setDeletingResident(resident);
  }

  function closeDeleteResident() {
    if (deleting) return;
    setDeletingResident(null);
    setDeleteReason("");
    setDeleteOtherReason("");
    setDeleteError("");
  }

  async function confirmDeleteResident() {
    if (!deletingResident) return;

    const finalReason =
      deleteReason === "Other"
        ? deleteOtherReason.trim()
        : deleteReason.trim();

    if (!finalReason) {
      setDeleteError(
        "Please select or enter a reason for deleting this resident."
      );
      return;
    }

    if (
      deletingResident.relationship ===
        "Family Head" ||
      deletingResident.has_own_family === true
    ) {
      setDeleteError(
        "This resident cannot be deleted until their family relationship is resolved."
      );
      return;
    }

    const householdNumber =
      deletingResident.household_id;

    if (!householdNumber) {
      setDeleteError(
        "Household number is missing for this resident."
      );
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const auditActor = await getAuditActor();

      const { data: censusRow, error: censusLookupError } =
        await supabase
          .from("census_records")
          .select("id, data")
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

      const originalCensus =
        structuredClone(censusRow.data) as CensusData;

      const updatedCensus =
        structuredClone(censusRow.data) as CensusData;

      const sourceResidentId =
        deletingResident.source_resident_id;

      let sourceMemberSnapshot: Resident | null = null;
      let found = false;
      let protectedByFamilyHead = false;
      let protectedByOwnFamily = false;

      const targetMatches = (
        member: Resident,
        familyIndex: number,
        memberIndex: number
      ) => {
        const memberResidentId = String(
          (
            member as Resident & {
              residentId?: string;
            }
          ).residentId || ""
        );

        if (sourceResidentId) {
          return (
            memberResidentId ===
            sourceResidentId
          );
        }

        return (
          familyIndex ===
            deletingResident.family_index &&
          memberIndex ===
            deletingResident.member_index
        );
      };

      (updatedCensus.families || []).forEach(
        (family, familyIndex) => {
          (family.members || []).forEach(
            (member, memberIndex) => {
              if (
                !targetMatches(
                  member,
                  familyIndex,
                  memberIndex
                )
              ) {
                return;
              }

              found = true;
              sourceMemberSnapshot =
                structuredClone(member) as Resident;

              if (
                member.familyRelationship ===
                "Family Head"
              ) {
                protectedByFamilyHead = true;
              }

              if (
                member.hasOwnFamily === "Yes"
              ) {
                protectedByOwnFamily = true;
              }
            }
          );
        }
      );

      if (!found) {
        throw new Error(
          "The resident could not be located inside the census record."
        );
      }

      if (protectedByFamilyHead) {
        throw new Error(
          "This resident is used as a Family Head in the census. Reassign the Family Head first."
        );
      }

      if (protectedByOwnFamily) {
        throw new Error(
          "This resident has a linked own-family record. Resolve that family record first."
        );
      }

      updatedCensus.families =
        (updatedCensus.families || []).map(
          (family, familyIndex) => ({
            ...family,
            members: (family.members || []).filter(
              (member, memberIndex) =>
                !targetMatches(
                  member,
                  familyIndex,
                  memberIndex
                )
            ),
          })
        );

      let normalizedResidentSnapshot: Record<string, unknown> | null = null;
      const childTableSnapshots: Record<string, unknown[]> = {};

      if (sourceResidentId) {
        const {
          data: normalizedResidentForSnapshot,
          error: residentSnapshotError,
        } = await supabase
          .from("residents")
          .select("*")
          .eq("resident_id", sourceResidentId)
          .maybeSingle();

        if (residentSnapshotError) {
          throw residentSnapshotError;
        }

        if (normalizedResidentForSnapshot?.id) {
          normalizedResidentSnapshot =
            normalizedResidentForSnapshot as Record<string, unknown>;

          const residentUuid = normalizedResidentForSnapshot.id;
          const childTablesForSnapshot = [
            "resident_education",
            "resident_employment",
            "resident_occupations",
            "resident_skills_new",
            "family_memberships",
          ];

          for (const table of childTablesForSnapshot) {
            const { data: childRows, error: childLookupError } =
              await supabase
                .from(table)
                .select("*")
                .eq("resident_id", residentUuid);

            if (childLookupError) {
              throw childLookupError;
            }

            childTableSnapshots[table] = childRows || [];
          }
        }
      }

      const recycleSnapshot = {
        census_record_id: censusRow.id,
        household_number: householdNumber,
        family_index: deletingResident.family_index,
        member_index: deletingResident.member_index,
        source_resident_id: sourceResidentId,
        source_member: sourceMemberSnapshot,
        normalized_resident: normalizedResidentSnapshot,
        child_rows: childTableSnapshots,
      };

      const { data: recycleRow, error: recycleInsertError } =
        await supabase
          .from("recycle_bin")
          .insert({
            deleted_by_user_id: auditActor.user_id,
            deleted_by_email: auditActor.email,
            deleted_by_name: auditActor.name,
            deleted_by_role: auditActor.role,
            entity_type: "resident",
            entity_id:
              sourceResidentId || deletingResident.resident_id,
            entity_name:
              formatResidentFullName(deletingResident) ||
              "Unnamed Resident",
            household_number: householdNumber,
            delete_reason: finalReason,
            snapshot: recycleSnapshot,
            metadata: {
              relationship: deletingResident.relationship,
              resident_type: deletingResident.resident_type,
            },
          })
          .select("id")
          .single();

      if (recycleInsertError) {
        throw recycleInsertError;
      }

      const recycleBinId = recycleRow.id;

      const { data: updatedJsonRows, error: censusUpdateError } =
        await supabase
          .from("census_records")
          .update({
            data: updatedCensus,
          })
          .eq("id", censusRow.id)
          .select("id");

      if (censusUpdateError) {
        throw censusUpdateError;
      }

      if (!updatedJsonRows?.length) {
        throw new Error(
          "The census record was not updated. Check the Secretary UPDATE policy for census_records."
        );
      }

      if (sourceResidentId) {
        const {
          data: normalizedResident,
          error: residentLookupError,
        } = await supabase
          .from("residents")
          .select("id")
          .eq(
            "resident_id",
            sourceResidentId
          )
          .maybeSingle();

        if (residentLookupError) {
          throw residentLookupError;
        }

        if (normalizedResident?.id) {
          const residentUuid =
            normalizedResident.id;

          const childTables = [
            "resident_education",
            "resident_employment",
            "resident_occupations",
            "resident_skills_new",
            "family_memberships",
          ];

          for (const table of childTables) {
            const { error: childDeleteError } =
              await supabase
                .from(table)
                .delete()
                .eq(
                  "resident_id",
                  residentUuid
                );

            if (childDeleteError) {
              const { error: rollbackError } =
                await supabase
                  .from("census_records")
                  .update({
                    data: originalCensus,
                  })
                  .eq("id", censusRow.id);

              if (rollbackError) {
                console.error(
                  "FAILED TO ROLLBACK CENSUS JSON AFTER CHILD DELETE ERROR:",
                  rollbackError
                );
              }

              throw childDeleteError;
            }
          }

          const {
            data: deletedResidentRows,
            error: residentDeleteError,
          } = await supabase
            .from("residents")
            .delete()
            .eq("id", residentUuid)
            .select("id");

          if (residentDeleteError) {
            const { error: rollbackError } =
              await supabase
                .from("census_records")
                .update({
                  data: originalCensus,
                })
                .eq("id", censusRow.id);

            if (rollbackError) {
              console.error(
                "FAILED TO ROLLBACK CENSUS JSON AFTER RESIDENT DELETE ERROR:",
                rollbackError
              );
            }

            throw residentDeleteError;
          }

          if (!deletedResidentRows?.length) {
            const { error: rollbackError } =
              await supabase
                .from("census_records")
                .update({
                  data: originalCensus,
                })
                .eq("id", censusRow.id);

            if (rollbackError) {
              console.error(
                "FAILED TO ROLLBACK CENSUS JSON AFTER ZERO-ROW RESIDENT DELETE:",
                rollbackError
              );
            }

            throw new Error(
              "The normalized resident was not deleted. Check the Secretary DELETE policies."
            );
          }
        }
      }

      try {
        await writeResidentAuditLog({
          actor: auditActor,
          action: "DELETE",
          residentId:
            sourceResidentId || deletingResident.resident_id,
          residentName:
            formatResidentFullName(deletingResident) ||
            "Unnamed Resident",
          reason: finalReason,
          beforeData: recycleSnapshot,
          afterData: {
            status: "moved_to_recycle_bin",
            recycle_bin_id: recycleBinId,
          },
          householdNumber,
          recycleBinId,
        });
      } catch (auditError) {
        console.error(
          "RESIDENT MOVED TO RECYCLE BIN BUT AUDIT LOG FAILED:",
          auditError
        );

        throw new Error(
          "The resident was moved to the Recycle Bin, but the audit log could not be saved. Do not permanently delete this Recycle Bin item until the audit issue is resolved.",
          { cause: auditError }
        );
      }

      setDeletedResidentIds((current) => {
        const updated = new Set(current);

        baseResidents.forEach((resident) => {
          const sameResident =
            sourceResidentId
              ? resident.source_resident_id ===
                sourceResidentId
              : resident.resident_id ===
                deletingResident.resident_id;

          if (sameResident) {
            updated.add(
              resident.resident_id
            );
          }
        });

        return updated;
      });

      setDeletingResident(null);
      setDeleteReason("");
      setDeleteOtherReason("");
      setDeleteError("");
    } catch (error) {
      console.error(
        "FAILED TO DELETE RESIDENT:",
        error
      );

      setDeleteError(
        error instanceof Error
          ? error.message
          : "Unable to delete resident."
      );
    } finally {
      setDeleting(false);
    }
  }

  // =========================
  // FILTER RESIDENTS
  // =========================

  const hasDisplayQuery = true;

  const filteredResidents = residents.filter((resident) => {
    const fullName = formatResidentRecordName(resident).toLowerCase();

    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      search === "" ||
      fullName.includes(search);

    const matchesSex =
      sexFilter === "" ||
      resident.sex === sexFilter;

    const matchesCivilStatus =
      civilStatusFilter === "" ||
      resident.civil_status === civilStatusFilter;

    const matchesResidentType =
      residentTypeFilter === "" ||
      resident.resident_type === residentTypeFilter;

    const matchesPurok =
      purokFilter === "" ||
      String(resident.purok || "")
        .trim()
        .toUpperCase() ===
        purokFilter.toUpperCase();

    return (
      matchesSearch &&
      matchesSex &&
      matchesCivilStatus &&
      matchesResidentType &&
      matchesPurok
    );
  }).sort(compareResidentNames);

  // =========================
  // CLEAR FILTERS
  // =========================

  function clearFilters() {
    setSearchTerm("");
    setSexFilter("");
    setCivilStatusFilter("");
    setResidentTypeFilter("");
    setPurokFilter("");
    setCurrentPage(1);
    setFiltersApplied(false);
  }

  const hasActiveFilters =
    searchTerm !== "" ||
    sexFilter !== "" ||
    civilStatusFilter !== "" ||
    residentTypeFilter !== "" ||
    purokFilter !== "";

  function toFormalNamePart(value: string | null | undefined): string {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/(^|[\\s.'-])([a-z])/g, (_match, prefix, letter) => {
        return `${prefix}${letter.toUpperCase()}`;
      });
  }

  function formatOfficialResidentName(resident: ResidentRow): string {
    const surname = String(resident.last_name || "").trim().toUpperCase();
    const firstName = toFormalNamePart(resident.first_name);
    const middleName = toFormalNamePart(resident.middle_name);
    const suffix = toFormalNamePart(resident.suffix);

    const givenNames = [firstName, middleName, suffix].filter(Boolean).join(" ");

    if (surname && givenNames) return `${surname}, ${givenNames}`;
    return surname || givenNames || "UNNAMED RESIDENT";
  }

  function getResidentAge(birthDate: string | null): string {
    if (!birthDate) return "—";

    const birth = new Date(`${birthDate}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return "—";

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDifference = today.getMonth() - birth.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birth.getDate())
    ) {
      age -= 1;
    }

    return age >= 0 ? String(age) : "—";
  }

  function escapePrintHtml(value: unknown): string {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function printResidentList() {
    const sortedResidents = [...filteredResidents].sort(compareResidentNames);

    if (sortedResidents.length === 0) {
      window.alert("There are no residents to print for the current filters.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1100,height=800");

    if (!printWindow) {
      window.alert("The print preview could not be opened. Please allow pop-ups for this site.");
      return;
    }

    const selectedPurok =
      purokFilter || (hasActiveFilters ? "FILTERED RESIDENTS" : "ALL PUROK");

    const reportTitle =
      residentPrintType === "attendance"
        ? "BARANGAY MEETING ATTENDANCE SHEET"
        : residentPrintType === "assistance"
        ? "BARANGAY ASSISTANCE DISTRIBUTION LIST"
        : "RESIDENT MASTERLIST";

    const purposeLabel =
      residentPrintType === "attendance"
        ? "Meeting / Purpose"
        : residentPrintType === "assistance"
        ? "Program / Assistance"
        : "Remarks";

    const rows = sortedResidents
      .map((resident, index) => {
        const name = escapePrintHtml(formatOfficialResidentName(resident));
        const purok = escapePrintHtml(resident.purok || "—");

        if (residentPrintType === "attendance") {
          return `<tr>
            <td class="number">${index + 1}</td>
            <td class="name">${name}</td>
            <td>${purok}</td>
            <td class="signature"></td>
          </tr>`;
        }

        if (residentPrintType === "assistance") {
          return `<tr>
            <td class="number">${index + 1}</td>
            <td class="name">${name}</td>
            <td>${purok}</td>
            <td>${escapePrintHtml(resident.contact_number || "—")}</td>
            <td class="signature"></td>
          </tr>`;
        }

        return `<tr>
          <td class="number">${index + 1}</td>
          <td class="name">${name}</td>
          <td>${escapePrintHtml(resident.sex || "—")}</td>
          <td>${escapePrintHtml(getResidentAge(resident.birth_date))}</td>
          <td>${escapePrintHtml(resident.civil_status || "—")}</td>
          <td>${purok}</td>
        </tr>`;
      })
      .join("");

    const tableHead =
      residentPrintType === "attendance"
        ? `<tr><th>No.</th><th>Name of Resident</th><th>Purok</th><th>Signature</th></tr>`
        : residentPrintType === "assistance"
        ? `<tr><th>No.</th><th>Name of Resident</th><th>Purok</th><th>Contact No.</th><th>Signature / Received</th></tr>`
        : `<tr><th>No.</th><th>Name of Resident</th><th>Sex</th><th>Age</th><th>Civil Status</th><th>Purok</th></tr>`;

    const purposeSection =
      residentPrintType === "masterlist" && !printPurpose.trim()
        ? ""
        : `<div class="detail-row"><strong>${purposeLabel}:</strong> ${
            printPurpose.trim()
              ? escapePrintHtml(printPurpose.trim())
              : "____________________________________________"
          }</div>`;

    const resolvedBarangayLogo = new URL(
      barangayLogo,
      window.location.href
    ).href;

    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${reportTitle}</title>
  <link rel="stylesheet" href="${residentPrintCssUrl}" />
</head>
<body>
  <div class="print-actions">
    <button onclick="window.close()">Close</button>
    <button class="primary" onclick="window.print()">Print</button>
  </div>

  <div class="sheet">
    <div class="header">
      <img class="header-logo" src="${resolvedBarangayLogo}" alt="Barangay Pambuhan Logo" />
      <div class="header-text">
        <div class="republic">Republic of the Philippines</div>
        <div>Province of Camarines Norte</div>
        <div>Municipality of Mercedes</div>
        <div class="barangay">BARANGAY PAMBUHAN</div>
        <div class="office">Office of the Barangay</div>
      </div>
    </div>

    <div class="rule"></div>
    <h1>${reportTitle}</h1>

    <div class="details">
      <div class="detail-row"><strong>Coverage:</strong> ${escapePrintHtml(selectedPurok)}</div>
      <div class="detail-row"><strong>Date:</strong> ${escapePrintHtml(
        new Date().toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      )}</div>
      ${purposeSection}
      <div class="detail-row"><strong>Total Residents:</strong> ${sortedResidents.length}</div>
    </div>

    <table class="${
      residentPrintType === "attendance"
        ? "attendance"
        : residentPrintType === "assistance"
        ? "assistance"
        : "masterlist"
    }">
      <thead>${tableHead}</thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="footer">
      <div class="total">Total Listed Residents: ${sortedResidents.length}</div>
      <div class="prepared">
        <div class="prepared-line">Barangay Secretary</div>
        <div class="prepared-role">Prepared by</div>
      </div>
    </div>
  </div>
</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();
    setShowPrintOptions(false);
  }

  const totalPages = Math.max(
    1,
    Math.ceil(filteredResidents.length / ITEMS_PER_PAGE)
  );

  const effectivePage = Math.min(
    currentPage,
    totalPages
  );

  const paginatedResidents = filteredResidents.slice(
    (effectivePage - 1) * ITEMS_PER_PAGE,
    effectivePage * ITEMS_PER_PAGE
  );

  return (
    <main className="dashboard-main records-page-shell records-page-residents">

      <header
        className="records-page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 7px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "#7e8a9f",
            }}
          >
            BARANGAY MANAGEMENT SYSTEM
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "32px",
              lineHeight: 1.15,
              fontWeight: 700,
              color: "#172033",
            }}
          >
            Residents
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#758094",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            View and manage registered resident census records.
          </p>
        </div>

      </header>

      <div className="residents-view-switcher records-page-tabs">
        <button
          type="button"
          className={viewMode === "list" ? "residents-view-button active" : "residents-view-button"}
          onClick={() => setViewMode("list")}
        >
          <List size={16} strokeWidth={1.8} />
          Residents List
        </button>

        <button
          type="button"
          className={viewMode === "demographics" ? "residents-view-button active" : "residents-view-button"}
          onClick={() => setViewMode("demographics")}
        >
          <ChartNoAxesColumnIncreasing size={16} strokeWidth={1.8} />
          Demographics
        </button>
      </div>

      <section className="dashboard-section">
        {viewMode === "demographics" ? (
          <ResidentsDemographics residents={residents} />
        ) : (
          <>

        {/* =========================
            SEARCH & FILTERS
        ========================= */}

        <div className="records-filter-panel"
          style={{
            background: "white",
            border: "1px solid #e7eaf0",
            borderRadius: "12px",
            padding: "10px",
            marginBottom: "14px",
          }}
        >

          {/* FILTERS — PRIMARY */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(150px, 1fr))",
            gap: "8px",
          }}>
            <select value={sexFilter} onChange={(event) => {
              setSexFilter(event.target.value);
              setCurrentPage(1);
            }} style={{border:"1px solid #dfe4eb",borderRadius:"8px",padding:"8px 10px",background:"white",fontSize:"12px"}}>
              <option value="">ALL SEX</option>
              <option value="Male">MALE</option>
              <option value="Female">FEMALE</option>
            </select>

            <select value={civilStatusFilter} onChange={(event) => {
              setCivilStatusFilter(event.target.value);
              setCurrentPage(1);
            }} style={{border:"1px solid #dfe4eb",borderRadius:"8px",padding:"8px 10px",background:"white",fontSize:"12px"}}>
              <option value="">ALL CIVIL STATUS</option>
              {Array.from(
                new Set(
                  residents
                    .map(
                      (resident) =>
                        resident.civil_status
                    )
                    .filter(Boolean)
                )
              ).map((status) => (
                <option
                  key={status}
                  value={status || ""}
                >
                  {String(status).toUpperCase()}
                </option>
              ))}
            </select>

            <select value={residentTypeFilter} onChange={(event) => {
              setResidentTypeFilter(event.target.value);
              setCurrentPage(1);
            }} style={{border:"1px solid #dfe4eb",borderRadius:"8px",padding:"8px 10px",background:"white",fontSize:"12px"}}>
              <option value="">
                ALL RESIDENT TYPES
              </option>

              {Array.from(
                new Set(
                  residents
                    .map(
                      (resident) =>
                        resident.resident_type
                    )
                    .filter(Boolean)
                )
              ).map((type) => (
                <option
                  key={type}
                  value={type || ""}
                >
                  {String(type).toUpperCase()}
                </option>
              ))}
            </select>

            <select
              value={purokFilter}
              onChange={(event) => {
                setPurokFilter(
                  event.target.value
                );
                setCurrentPage(1);
              }}
              style={{
                border: "1px solid #dfe4eb",
                borderRadius: "8px",
                padding: "8px 10px",
                background: "white",
                fontSize: "12px",
              }}
            >
              <option value="">
                ALL PUROK
              </option>

              {purokOptions.map((purok) => (
                <option
                  key={purok}
                  value={purok}
                >
                  {purok}
                </option>
              ))}
            </select>
          </div>

          <div style={{
            marginTop:"8px",
            display:"flex",
            alignItems:"center",
            gap:"8px",
            flexWrap:"wrap",
          }}>
            <button type="button" onClick={() => {
              setFiltersApplied(true);
              setCurrentPage(1);
            }} style={{
              border:"1px solid #bfd3ee",background:"#f7fbff",color:"#2458a6",
              borderRadius:"8px",padding:"7px 11px",cursor:"pointer",
              fontWeight:700,fontSize:"12px"
            }}>
              Apply Filters
            </button>

            {(hasActiveFilters || filtersApplied) && (
              <button type="button" onClick={clearFilters} style={{
                border:"1px solid #dfe4eb",background:"white",borderRadius:"8px",
                padding:"7px 10px",cursor:"pointer",fontWeight:600,fontSize:"12px",
                display:"flex",alignItems:"center",gap:"5px"
              }}>
                <X size={14} strokeWidth={1.8} /> Clear
              </button>
            )}

            <div style={{marginLeft:"auto",width:"min(260px, 100%)",position:"relative"}}>
              <Search size={15} strokeWidth={1.7} style={{
                position:"absolute",left:"10px",top:"50%",transform:"translateY(-50%)",
                color:"#94a3b8",pointerEvents:"none"
              }} />
              <input type="text" value={searchTerm} onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }} placeholder="Search specific resident..." style={{
                width:"100%",boxSizing:"border-box",border:"1px solid #dfe4eb",
                borderRadius:"8px",padding:"8px 10px 8px 32px",fontSize:"12px",
                outline:"none",background:"white"
              }} />
            </div>
          </div>

          <div
            style={{
              marginTop: "7px",
              color: "#758094",
              fontSize: "11px",
              lineHeight: 1.4,
            }}
          >
            {hasActiveFilters
              ? `${filteredResidents.length} resident record${
                  filteredResidents.length !== 1 ? "s" : ""
                } found from ${residents.length} registered residents`
              : `${residents.length} registered resident${
                  residents.length !== 1 ? "s" : ""
                }`}
          </div>

        </div>

        {/* =========================
            RESIDENT DIRECTORY TOOLBAR
        ========================= */}
        <div className="residents-directory-toolbar records-directory-head">
          <div>
            <span className="residents-directory-eyebrow">RESIDENT DIRECTORY</span>
            <strong>{filteredResidents.length} Registered Resident{filteredResidents.length !== 1 ? "s" : ""}</strong>
          </div>
          <div className="residents-directory-actions">
            <div className="residents-directory-status">
              {hasActiveFilters ? "Filtered results" : "All registered residents"}
            </div>

            <button
              type="button"
              className="residents-print-button"
              onClick={() => setShowPrintOptions(true)}
              disabled={filteredResidents.length === 0}
            >
              <Printer size={15} strokeWidth={1.8} />
              Print List
            </button>
          </div>
        </div>

        {/* =========================
            RECORDS
        ========================= */}

       <div className="recent-records residents-directory-list">

  {filteredResidents.length === 0 ? (

            <div
              className="recent-record-card"
              style={{
                padding: "18px",
                color: "#758094",
              }}
            >
              No residents match the current search or filters.
            </div>

          ) : (

            paginatedResidents.map((resident) => (

              <div
                className="recent-record-card"
                key={resident.resident_id}
                style={{
                  padding: "10px 12px",
                  minHeight: "72px",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >

                <div className="recent-record-icon">

                  <UserRound
                    size={22}
                    strokeWidth={1.8}
                  />

                </div>

                <div
                  className="recent-record-main"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    paddingRight: "270px",
                  }}
                >

                  <div className="recent-record-title">

                    <strong>

{formatResidentFullName(resident) || "Unnamed Resident"}

                    </strong>

                    <span>
                      {resident.sex || "—"}
                    </span>

                  </div>

                  <div className="recent-record-location">

                    <span>
                      Relationship:{" "}
                      {resident.relationship || "—"}
                    </span>

                    <span>
                      Resident Type:{" "}
                      {resident.resident_type || "—"}
                    </span>

                    <span>
                      Civil Status:{" "}
                      {resident.civil_status || "—"}
                    </span>

                  </div>

                  <div
                    className="recent-record-stats"
                    style={{
                      marginTop: "4px",
                    }}
                  >

                    <span>

                      <Cake
                        size={16}
                        strokeWidth={1.8}
                      />

                      {resident.birth_date || "—"}

                    </span>

                    <span>

                      <Vote
                        size={16}
                        strokeWidth={1.8}
                      />

                      {resident.has_own_family === true
                        ? "Has Own Family"
                        : resident.has_own_family === false
                        ? "No Own Family"
                        : "—"}

                    </span>

                  </div>

                  <div
                    style={{
                      marginTop: 0,
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      flexWrap: "nowrap",
                      position: "absolute",
                      right: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        openEditResident(resident)
                      }
                      style={{
                        border: "1px solid #bfd3ee",
                        background: "#f7fbff",
                        color: "#2458a6",
                        borderRadius: "8px",
                        padding: "6px 9px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <Pencil
                        size={15}
                        strokeWidth={1.8}
                      />
                      Edit Resident
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        requestDeleteResident(
                          resident
                        )
                      }
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fff7f7",
                        color: "#b42318",
                        borderRadius: "8px",
                        padding: "6px 9px",
                        fontSize: "12px",
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                      }}
                    >
                      <Trash2
                        size={15}
                        strokeWidth={1.8}
                      />
                      Delete Resident
                    </button>
                  </div>

                </div>

              </div>

            ))

          )}

        </div>

      {hasDisplayQuery && (
        <div
          style={{
            marginTop: "12px",
            fontSize: "12px",
            color: "#758094",
            textAlign: "right",
          }}
        >
          Page {effectivePage} of {totalPages}
        </div>
      )}

      {hasDisplayQuery && totalPages > 1 && (
        <div className="records-pagination"
          style={{
            marginTop: "16px",
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
          <span style={{ fontSize: "12px", color: "#758094" }}>
            Page {effectivePage} of {totalPages} · {`${filteredResidents.length} resident${filteredResidents.length !== 1 ? "s" : ""}`}
          </span>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={effectivePage <= 1}
              onClick={() =>
                setCurrentPage((page) => Math.max(1, page - 1))
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
                opacity: effectivePage <= 1 ? 0.5 : 1,
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
                  Math.abs(page - effectivePage) <= 1
              )
              .map((page, index, visiblePages) => (
                <span
                  key={page}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {index > 0 &&
                    page - visiblePages[index - 1] > 1 && (
                      <span style={{ color: "#94a3b8" }}>
                        …
                      </span>
                    )}

                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    style={{
                      minWidth: "32px",
                      height: "32px",
                      border:
                        page === effectivePage
                          ? "1px solid #2563eb"
                          : "1px solid #dfe4eb",
                      background:
                        page === effectivePage
                          ? "#eff6ff"
                          : "white",
                      color:
                        page === effectivePage
                          ? "#1d4ed8"
                          : "#475569",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "12px",
                    }}
                  >
                    {page}
                  </button>
                </span>
              ))}

            <button
              type="button"
              disabled={effectivePage >= totalPages}
              onClick={() =>
                setCurrentPage((page) =>
                  Math.min(totalPages, page + 1)
                )
              }
              style={{
                border: "1px solid #dfe4eb",
                background: "white",
                borderRadius: "8px",
                padding: "6px 9px",
                fontSize: "12px",
                cursor:
                  effectivePage >= totalPages
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  effectivePage >= totalPages
                    ? 0.5
                    : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      )}

          </>
        )}
      </section>

      {showPrintOptions && (
        <div
          className="residents-print-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Print resident list"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setShowPrintOptions(false);
            }
          }}
        >
          <div className="residents-print-modal">
            <div className="residents-print-modal-head">
              <div>
                <span>RESIDENT REPORTS</span>
                <h2>Print Resident List</h2>
                <p>
                  The report will include all {filteredResidents.length} resident
                  {filteredResidents.length !== 1 ? "s" : ""} matching the current filters,
                  not only the residents shown on this page.
                </p>
              </div>

              <button
                type="button"
                className="residents-print-close"
                onClick={() => setShowPrintOptions(false)}
                aria-label="Close print options"
              >
                <X size={17} />
              </button>
            </div>

            <div className="residents-print-types">
              <button
                type="button"
                className={residentPrintType === "masterlist" ? "active" : ""}
                onClick={() => setResidentPrintType("masterlist")}
              >
                <strong>Resident Masterlist</strong>
                <span>Formal resident record with sex, age, civil status and purok.</span>
              </button>

              <button
                type="button"
                className={residentPrintType === "attendance" ? "active" : ""}
                onClick={() => setResidentPrintType("attendance")}
              >
                <strong>Attendance Sheet</strong>
                <span>Resident names with purok and a blank signature column.</span>
              </button>

              <button
                type="button"
                className={residentPrintType === "assistance" ? "active" : ""}
                onClick={() => setResidentPrintType("assistance")}
              >
                <strong>Assistance Distribution</strong>
                <span>For ayuda or distribution with contact and received/signature column.</span>
              </button>
            </div>

            <label className="residents-print-purpose">
              <span>
                {residentPrintType === "attendance"
                  ? "Meeting / Purpose"
                  : residentPrintType === "assistance"
                  ? "Program / Assistance"
                  : "Optional Remarks"}
              </span>
              <input
                type="text"
                value={printPurpose}
                onChange={(event) => setPrintPurpose(event.target.value)}
                placeholder={
                  residentPrintType === "attendance"
                    ? "Example: Barangay General Assembly"
                    : residentPrintType === "assistance"
                    ? "Example: Food Assistance Distribution"
                    : "Optional report note"
                }
              />
            </label>

            <div className="residents-print-summary">
              <div>
                <span>Residents to print</span>
                <strong>{filteredResidents.length}</strong>
              </div>
              <div>
                <span>Coverage</span>
                <strong>{purokFilter || "All Purok"}</strong>
              </div>
              <div>
                <span>Name format</span>
                <strong>SURNAME, First Middle Suffix</strong>
              </div>
            </div>

            <div className="residents-print-modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setShowPrintOptions(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={printResidentList}
              >
                <Printer size={16} strokeWidth={1.8} />
                Open Print Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingResident && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete resident"
          style={{
            position: "fixed",
            inset: 0,
            background:
              "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1100,
          }}
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              closeDeleteResident();
            }
          }}
        >
          <div
            style={{
              width: "min(560px, 100%)",
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  flex: "0 0 42px",
                  borderRadius: "11px",
                  background: "#fff1f2",
                  color: "#b42318",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={21} />
              </div>

              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    margin: "0 0 6px",
                    fontSize: "20px",
                    color: "#172033",
                  }}
                >
                  Move Resident to Recycle Bin
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#667085",
                    fontSize: "13px",
                    lineHeight: 1.55,
                  }}
                >
                  The selected resident will be removed from active records
                  and stored in the Recycle Bin. The household and family
                  will remain.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDeleteResident}
                disabled={deleting}
                aria-label="Close delete resident"
                style={{
                  border: "none",
                  background: "#f2f4f7",
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                marginTop: "18px",
                padding: "13px 14px",
                border: "1px solid #eef0f4",
                borderRadius: "10px",
                background: "#fafbfc",
                fontSize: "13px",
                color: "#475467",
              }}
            >
              <strong>
{formatResidentFullName(deletingResident) || "Unnamed Resident"}
              </strong>

              <div
                style={{
                  marginTop: "5px",
                  color: "#758094",
                }}
              >
                Household:{" "}
                {deletingResident.household_id ||
                  "—"}
                {" • "}
                Relationship:{" "}
                {deletingResident.relationship ||
                  "—"}
              </div>
            </div>

            {deleteError &&
              (deletingResident.relationship ===
                "Family Head" ||
                deletingResident.has_own_family ===
                  true) && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "12px 13px",
                    borderRadius: "9px",
                    background: "#fff7ed",
                    border:
                      "1px solid #fed7aa",
                    color: "#9a3412",
                    fontSize: "13px",
                    fontWeight: 700,
                    lineHeight: 1.45,
                  }}
                >
                  {deleteError}
                </div>
              )}

            {deletingResident.relationship !==
              "Family Head" &&
              deletingResident.has_own_family !==
                true && (
                <>
                  <label
                    style={{
                      display: "grid",
                      gap: "7px",
                      marginTop: "17px",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#475467",
                    }}
                  >
                    Reason for deletion
                    <select
                      value={deleteReason}
                      onChange={(event) => {
                        setDeleteReason(
                          event.target.value
                        );
                        setDeleteError("");
                      }}
                      style={{
                        border:
                          "1px solid #dfe4eb",
                        borderRadius: "9px",
                        padding: "11px 12px",
                        background: "white",
                        fontSize: "14px",
                      }}
                    >
                      <option value="">
                        Select reason
                      </option>
                      <option value="Duplicate Entry">
                        Duplicate Entry
                      </option>
                      <option value="Incorrectly Added">
                        Incorrectly Added
                      </option>
                      <option value="Test Record">
                        Test Record
                      </option>
                      <option value="Other">
                        Other
                      </option>
                    </select>
                  </label>

                  {deleteReason === "Other" && (
                    <label
                      style={{
                        display: "grid",
                        gap: "7px",
                        marginTop: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#475467",
                      }}
                    >
                      Specify reason
                      <textarea
                        value={
                          deleteOtherReason
                        }
                        onChange={(event) => {
                          setDeleteOtherReason(
                            event.target.value
                          );
                          setDeleteError("");
                        }}
                        rows={3}
                        style={{
                          border:
                            "1px solid #dfe4eb",
                          borderRadius: "9px",
                          padding: "11px 12px",
                          fontFamily: "inherit",
                          resize: "vertical",
                        }}
                      />
                    </label>
                  )}

                  {deleteError && (
                    <div
                      style={{
                        marginTop: "13px",
                        padding: "10px 12px",
                        borderRadius: "9px",
                        background: "#fff1f2",
                        color: "#b42318",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {deleteError}
                    </div>
                  )}
                </>
              )}

            <div
              style={{
                marginTop: "20px",
                paddingTop: "17px",
                borderTop:
                  "1px solid #eef0f4",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={closeDeleteResident}
                disabled={deleting}
                style={{
                  border:
                    "1px solid #dfe4eb",
                  background: "white",
                  borderRadius: "9px",
                  padding: "10px 15px",
                  cursor: deleting
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>

              {deletingResident.relationship !==
                "Family Head" &&
                deletingResident.has_own_family !==
                  true && (
                  <button
                    type="button"
                    onClick={
                      confirmDeleteResident
                    }
                    disabled={deleting}
                    style={{
                      border: "none",
                      background: deleting
                        ? "#9aa4b2"
                        : "#b42318",
                      color: "white",
                      borderRadius: "9px",
                      padding: "10px 16px",
                      cursor: deleting
                        ? "not-allowed"
                        : "pointer",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "7px",
                    }}
                  >
                    <Trash2 size={15} />
                    {deleting
                      ? "Deleting..."
                      : "Delete Resident"}
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {editingResident && editDraft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit resident"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.52)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              closeEditResident();
            }
          }}
        >
          <div
            style={{
              width: "min(680px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "white",
              borderRadius: "16px",
              padding: "24px",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "16px",
                marginBottom: "20px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 5px",
                    color: "#2458a6",
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                  }}
                >
                  RESIDENT RECORD
                </p>

                <h2
                  style={{
                    margin: 0,
                    fontSize: "21px",
                    color: "#172033",
                  }}
                >
                  Edit Resident
                </h2>

                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#758094",
                    fontSize: "13px",
                  }}
                >
                  Update the resident's basic personal information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditResident}
                disabled={savingEdit}
                aria-label="Close edit resident"
                style={{
                  border: "none",
                  background: "#f2f4f7",
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  cursor: savingEdit
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
                ["First Name", "first_name"],
                ["Middle Name", "middle_name"],
                ["Last Name", "last_name"],
                ["Suffix", "suffix"],
              ].map(([label, field]) => (
                <label
                  key={field}
                  style={{
                    display: "grid",
                    gap: "6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#475467",
                  }}
                >
                  {label}
                  <input
                    type="text"
                    value={
                      editDraft[
                        field as keyof ResidentEditDraft
                      ]
                    }
                    onChange={(event) =>
                      updateEditField(
                        field as keyof ResidentEditDraft,
                        event.target.value
                      )
                    }
                    style={{
                      border: "1px solid #dfe4eb",
                      borderRadius: "9px",
                      padding: "11px 12px",
                      fontSize: "14px",
                    }}
                  />
                </label>
              ))}

              <label
                style={{
                  display: "grid",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475467",
                }}
              >
                Sex
                <select
                  value={editDraft.sex}
                  onChange={(event) =>
                    updateEditField(
                      "sex",
                      event.target.value
                    )
                  }
                  style={{
                    border: "1px solid #dfe4eb",
                    borderRadius: "9px",
                    padding: "11px 12px",
                    background: "white",
                    fontSize: "14px",
                  }}
                >
                  <option value="">Select sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475467",
                }}
              >
                Birth Date
                <input
                  type="date"
                  value={editDraft.birth_date}
                  onChange={(event) =>
                    updateEditField(
                      "birth_date",
                      event.target.value
                    )
                  }
                  style={{
                    border: "1px solid #dfe4eb",
                    borderRadius: "9px",
                    padding: "11px 12px",
                    fontSize: "14px",
                  }}
                />
              </label>

              <label
                style={{
                  display: "grid",
                  gap: "6px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#475467",
                  gridColumn: "1 / -1",
                }}
              >
                Civil Status
                <select
                  value={editDraft.civil_status}
                  onChange={(event) =>
                    updateEditField(
                      "civil_status",
                      event.target.value
                    )
                  }
                  style={{
                    border: "1px solid #dfe4eb",
                    borderRadius: "9px",
                    padding: "11px 12px",
                    background: "white",
                    fontSize: "14px",
                  }}
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
                </select>
              </label>
            </div>

            <div
              style={{
                marginTop: "15px",
                padding: "12px 13px",
                borderRadius: "9px",
                background: "#f8fafc",
                color: "#64748b",
                fontSize: "12px",
              }}
            >
              Household:{" "}
              <strong>
                {editingResident.household_id || "—"}
              </strong>
              {" • "}
              Relationship:{" "}
              <strong>
                {editingResident.relationship || "—"}
              </strong>
            </div>

            {editError && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 12px",
                  borderRadius: "9px",
                  background: "#fff1f2",
                  color: "#b42318",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                {editError}
              </div>
            )}

            {editSuccess && (
              <div
                style={{
                  marginTop: "14px",
                  padding: "10px 12px",
                  borderRadius: "9px",
                  background: "#ecfdf3",
                  color: "#168a5b",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                {editSuccess}
              </div>
            )}

            <div
              style={{
                marginTop: "20px",
                paddingTop: "17px",
                borderTop: "1px solid #eef0f4",
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={closeEditResident}
                disabled={savingEdit}
                style={{
                  border: "1px solid #dfe4eb",
                  background: "white",
                  borderRadius: "9px",
                  padding: "10px 15px",
                  cursor: savingEdit
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveResidentEdit}
                disabled={savingEdit}
                style={{
                  border: "none",
                  background: savingEdit
                    ? "#9aa4b2"
                    : "#176b57",
                  color: "white",
                  borderRadius: "9px",
                  padding: "10px 16px",
                  cursor: savingEdit
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                }}
              >
                <Save size={15} />
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

export default Residents;
