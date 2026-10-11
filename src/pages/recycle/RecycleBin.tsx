import { useCallback, useEffect, useRef, useState } from "react";
import {
  Trash2,
  RefreshCw,
  ShieldAlert,
  RotateCcw,
  X,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import {
  getLocalDateInputValue,
  getLocalDateRange,
  millisecondsUntilNextLocalDay,
} from "../../utils/localDate";
import "../dashboard/dashboard.css";

type Props = {
  onBackToDashboard: () => void;
  onDataChanged?: () => Promise<void> | void;
};

type RecycleSnapshot = {
  census_record_id?: string | null;
  household_number?: string | null;
  family_index?: number | null;
  member_index?: number | null;
  source_resident_id?: string | null;
  source_member?: Record<string, unknown> | null;
  normalized_resident?: Record<string, unknown> | null;
  child_rows?: Record<string, Record<string, unknown>[]>;
  census_record?: Record<string, unknown> | null;
  household?: Record<string, unknown> | null;
  families?: Record<string, unknown>[];
  residents?: Record<string, unknown>[];

  // Family-delete snapshot fields
  source_family?: Record<string, unknown> | null;
  normalized_household?: Record<string, unknown> | null;
  normalized_family?: Record<string, unknown> | null;
  family_memberships?: Record<string, unknown>[];
};

type RecycleRow = {
  id: string;
  deleted_at: string;
  deleted_by_email: string | null;
  deleted_by_name: string | null;
  deleted_by_role: string | null;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  household_number: string | null;
  delete_reason: string;
  snapshot: RecycleSnapshot | null;
};

type AuditActor = {
  user_id: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
};

async function getAuditActor(): Promise<AuditActor> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;

  const user = authData.user;

  if (!user) {
    throw new Error(
      "Your session could not be verified. Please sign in again."
    );
  }

  const { data: authorizedUser, error: authorizedUserError } =
    await supabase
      .from("authorized_users")
      .select("email, full_name, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

  if (authorizedUserError) throw authorizedUserError;

  if (authorizedUser?.role !== "secretary") {
    throw new Error(
      "Only the Secretary can restore or permanently delete Recycle Bin records."
    );
  }

  return {
    user_id: user.id,
    email: authorizedUser?.email || user.email || null,
    name: authorizedUser?.full_name || null,
    role: authorizedUser?.role || null,
  };
}

async function writeAuditLog(input: {
  actor: AuditActor;
  action: "RESTORE" | "PERMANENT_DELETE";
  row: RecycleRow;
  beforeData?: unknown;
  afterData?: unknown;
}) {
  const { error } = await supabase.from("audit_logs").insert({
    actor_user_id: input.actor.user_id,
    actor_email: input.actor.email,
    actor_name: input.actor.name,
    actor_role: input.actor.role,
    action: input.action,
    entity_type: input.row.entity_type,
    entity_id: input.row.entity_id,
    entity_name: input.row.entity_name,
    reason: input.row.delete_reason,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    metadata: {
      household_number: input.row.household_number,
      recycle_bin_id: input.row.id,
    },
  });

  if (error) throw error;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default function RecycleBin({
  onBackToDashboard,
  onDataChanged,
}: Props) {
  const [rows, setRows] = useState<RecycleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateInputValue()
  );
  const loadRequestId = useRef(0);

  const [restoreTarget, setRestoreTarget] =
    useState<RecycleRow | null>(null);
  const [permanentTarget, setPermanentTarget] =
    useState<RecycleRow | null>(null);

  const [restoring, setRestoring] = useState(false);
  const [permanentlyDeleting, setPermanentlyDeleting] =
    useState(false);
  const [deleteConfirmation, setDeleteConfirmation] =
    useState("");

  const load = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      const { start, end } = getLocalDateRange(selectedDate);
      const { data, error: loadError } = await supabase
        .from("recycle_bin")
        .select(
          "id, deleted_at, deleted_by_email, deleted_by_name, deleted_by_role, entity_type, entity_id, entity_name, household_number, delete_reason, snapshot"
        )
        .gte("deleted_at", start)
        .lt("deleted_at", end)
        .order("deleted_at", { ascending: false });

      if (requestId === loadRequestId.current) {
        if (loadError) {
          setError(loadError.message);
          setRows([]);
        } else {
          setRows((data || []) as RecycleRow[]);
        }
      }
    } catch (loadError) {
      if (requestId === loadRequestId.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load Recycle Bin records for this date."
        );
        setRows([]);
      }
    } finally {
      if (requestId === loadRequestId.current) setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSelectedDate(getLocalDateInputValue());
    }, millisecondsUntilNextLocalDay());

    return () => window.clearTimeout(timeoutId);
  }, [selectedDate]);

  async function restoreResident(row: RecycleRow) {
    if (row.entity_type !== "resident") {
      throw new Error(
        `Restore is not yet configured for ${row.entity_type} records.`
      );
    }

    const snapshot = row.snapshot;

    if (
      !snapshot?.census_record_id ||
      snapshot.family_index == null ||
      snapshot.member_index == null ||
      !snapshot.source_member
    ) {
      throw new Error(
        "This Recycle Bin item does not contain a complete resident restore snapshot."
      );
    }

    const actor = await getAuditActor();

    const { data: censusRow, error: censusLookupError } =
      await supabase
        .from("census_records")
        .select("id, data")
        .eq("id", snapshot.census_record_id)
        .maybeSingle();

    if (censusLookupError) throw censusLookupError;

    if (!censusRow?.data) {
      throw new Error(
        "The original household census record no longer exists, so this resident cannot be safely restored."
      );
    }

    const originalCurrentCensus = deepClone(
      censusRow.data as Record<string, unknown>
    );

    const restoredCensus = deepClone(
      censusRow.data as {
        families?: Array<{
          members?: Record<string, unknown>[];
          [key: string]: unknown;
        }>;
        [key: string]: unknown;
      }
    );

    const families = Array.isArray(restoredCensus.families)
      ? restoredCensus.families
      : [];

    const family = families[snapshot.family_index];

    if (!family) {
      throw new Error(
        "The original family position no longer exists. Restore was stopped to prevent placing the resident in the wrong family."
      );
    }

    const members = Array.isArray(family.members)
      ? [...family.members]
      : [];

    const sourceResidentId =
      snapshot.source_resident_id || null;

    const alreadyInJson = members.some((member) => {
      const residentId =
        typeof member.residentId === "string"
          ? member.residentId
          : "";

      return Boolean(sourceResidentId) &&
        residentId === sourceResidentId;
    });

    if (alreadyInJson) {
      throw new Error(
        "This resident already exists in the household census record."
      );
    }

    if (sourceResidentId) {
      const { data: existingResident, error: existingError } =
        await supabase
          .from("residents")
          .select("id")
          .eq("resident_id", sourceResidentId)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existingResident) {
        throw new Error(
          "This resident already exists in the normalized residents table."
        );
      }
    }

    const safeMemberIndex = Math.min(
      Math.max(snapshot.member_index, 0),
      members.length
    );

    members.splice(
      safeMemberIndex,
      0,
      deepClone(snapshot.source_member)
    );

    family.members = members;
    restoredCensus.families = families;

    let insertedNormalizedResidentId: string | null = null;

    try {
      const { data: updatedRows, error: censusUpdateError } =
        await supabase
          .from("census_records")
          .update({ data: restoredCensus })
          .eq("id", snapshot.census_record_id)
          .select("id");

      if (censusUpdateError) throw censusUpdateError;

      if (!updatedRows?.length) {
        throw new Error(
          "The household census record could not be updated."
        );
      }

      if (snapshot.normalized_resident) {
        const { data: insertedResident, error: residentInsertError } =
          await supabase
            .from("residents")
            .insert(snapshot.normalized_resident)
            .select("id")
            .single();

        if (residentInsertError) throw residentInsertError;

        insertedNormalizedResidentId =
          insertedResident?.id || null;
      }

      const childRows = snapshot.child_rows || {};
      const childTableOrder = [
        "resident_education",
        "resident_employment",
        "resident_occupations",
        "resident_skills_new",
        "family_memberships",
      ];

      for (const table of childTableOrder) {
        const tableRows = childRows[table] || [];

        if (!tableRows.length) continue;

        const { error: childInsertError } =
          await supabase.from(table).insert(tableRows);

        if (childInsertError) throw childInsertError;
      }

      await writeAuditLog({
        actor,
        action: "RESTORE",
        row,
        beforeData: {
          status: "in_recycle_bin",
          recycle_bin_id: row.id,
          snapshot,
        },
        afterData: {
          status: "restored",
          household_number: row.household_number,
          census_record_id: snapshot.census_record_id,
        },
      });

      const { data: deletedBinRows, error: recycleDeleteError } =
        await supabase
          .from("recycle_bin")
          .delete()
          .eq("id", row.id)
          .select("id");

      if (recycleDeleteError) throw recycleDeleteError;

      if (!deletedBinRows?.length) {
        throw new Error(
          "The resident was restored, but the Recycle Bin item could not be cleared."
        );
      }
    } catch (restoreError) {
      // Best-effort rollback of a partially restored record.
      const { error: censusRollbackError } =
        await supabase
          .from("census_records")
          .update({ data: originalCurrentCensus })
          .eq("id", snapshot.census_record_id);

      if (censusRollbackError) {
        console.error(
          "FAILED TO ROLLBACK CENSUS AFTER RESTORE ERROR:",
          censusRollbackError
        );
      }

      if (insertedNormalizedResidentId) {
        const childTableOrder = [
          "resident_education",
          "resident_employment",
          "resident_occupations",
          "resident_skills_new",
          "family_memberships",
        ];

        for (const table of childTableOrder) {
          const { error: childRollbackError } =
            await supabase
              .from(table)
              .delete()
              .eq(
                "resident_id",
                insertedNormalizedResidentId
              );

          if (childRollbackError) {
            console.error(
              `FAILED TO ROLLBACK ${table}:`,
              childRollbackError
            );
          }
        }

        const { error: residentRollbackError } =
          await supabase
            .from("residents")
            .delete()
            .eq("id", insertedNormalizedResidentId);

        if (residentRollbackError) {
          console.error(
            "FAILED TO ROLLBACK NORMALIZED RESIDENT:",
            residentRollbackError
          );
        }
      }

      throw restoreError;
    }
  }

  async function restoreHousehold(row: RecycleRow) {
    if (row.entity_type !== "household") {
      throw new Error(`Household restore cannot handle ${row.entity_type} records.`);
    }

    const snapshot = row.snapshot;
    if (!snapshot?.census_record || !snapshot.household) {
      throw new Error("This Recycle Bin item does not contain a complete household restore snapshot.");
    }

    const actor = await getAuditActor();
    const household = snapshot.household;
    const householdNumber =
      typeof household.household_number === "string"
        ? household.household_number
        : row.household_number;

    if (!householdNumber) throw new Error("The household number is missing from the restore snapshot.");

    const { data: existingHousehold, error: existingHouseholdError } = await supabase
      .from("households").select("id").eq("household_number", householdNumber).maybeSingle();
    if (existingHouseholdError) throw existingHouseholdError;
    if (existingHousehold) throw new Error("This household already exists in the active normalized records.");

    const censusRecordId =
      typeof snapshot.census_record.id === "string" ? snapshot.census_record.id : null;
    if (!censusRecordId) throw new Error("The original census record ID is missing from the restore snapshot.");

    const { data: existingCensus, error: existingCensusError } = await supabase
      .from("census_records").select("id").eq("id", censusRecordId).maybeSingle();
    if (existingCensusError) throw existingCensusError;
    if (existingCensus) throw new Error("The original census record already exists in active records.");

    const residents = snapshot.residents || [];
    const families = snapshot.families || [];
    const childRows = snapshot.child_rows || {};
    const insertedResidentIds: string[] = [];
    const insertedFamilyIds: string[] = [];
    let insertedHousehold = false;
    let insertedCensus = false;

    try {
      const { error: householdInsertError } = await supabase.from("households").insert(household);
      if (householdInsertError) throw householdInsertError;
      insertedHousehold = true;

      if (residents.length) {
        const { error } = await supabase.from("residents").insert(residents);
        if (error) throw error;
        for (const resident of residents) {
          if (typeof resident.id === "string") insertedResidentIds.push(resident.id);
        }
      }

      for (const table of ["resident_education", "resident_employment", "resident_occupations", "resident_skills_new"]) {
        const rows = childRows[table] || [];
        if (!rows.length) continue;
        const { error } = await supabase.from(table).insert(rows);
        if (error) throw error;
      }

      if (families.length) {
        const { error } = await supabase.from("families").insert(families);
        if (error) throw error;
        for (const family of families) {
          if (typeof family.id === "string") insertedFamilyIds.push(family.id);
        }
      }

      const memberships = childRows.family_memberships || [];
      if (memberships.length) {
        const { error } = await supabase.from("family_memberships").insert(memberships);
        if (error) throw error;
      }

      const { error: censusInsertError } = await supabase
        .from("census_records").insert(snapshot.census_record);
      if (censusInsertError) throw censusInsertError;
      insertedCensus = true;

      await writeAuditLog({
        actor,
        action: "RESTORE",
        row,
        beforeData: { status: "in_recycle_bin", recycle_bin_id: row.id, snapshot },
        afterData: { status: "restored", household_number: householdNumber, census_record_id: censusRecordId },
      });

      const { data: cleared, error: clearError } = await supabase
        .from("recycle_bin").delete().eq("id", row.id).select("id");
      if (clearError) throw clearError;
      if (!cleared?.length) throw new Error("The household was restored, but its Recycle Bin item could not be cleared.");
    } catch (restoreError) {
      // Best-effort cleanup. This is not a database transaction; the Recycle Bin
      // snapshot remains available when cleanup cannot fully reverse a partial restore.
      if (insertedCensus) await supabase.from("census_records").delete().eq("id", censusRecordId);
      if (insertedFamilyIds.length) await supabase.from("family_memberships").delete().in("family_id", insertedFamilyIds);
      for (const table of ["resident_education", "resident_employment", "resident_occupations", "resident_skills_new"]) {
        if (insertedResidentIds.length) await supabase.from(table).delete().in("resident_id", insertedResidentIds);
      }
      if (insertedFamilyIds.length) await supabase.from("families").delete().in("id", insertedFamilyIds);
      if (insertedResidentIds.length) await supabase.from("residents").delete().in("id", insertedResidentIds);
      if (insertedHousehold && household.id != null) await supabase.from("households").delete().eq("id", household.id);
      throw restoreError;
    }
  }

  async function restoreFamily(row: RecycleRow) {
    if (row.entity_type !== "family") {
      throw new Error(`Family restore cannot handle ${row.entity_type} records.`);
    }

    const snapshot = row.snapshot;

    if (
      !snapshot?.census_record_id ||
      snapshot.family_index == null ||
      !snapshot.source_family
    ) {
      throw new Error(
        "This Recycle Bin item does not contain a complete family restore snapshot."
      );
    }

    const actor = await getAuditActor();

    const { data: censusRow, error: censusLookupError } = await supabase
      .from("census_records")
      .select("id, data")
      .eq("id", snapshot.census_record_id)
      .maybeSingle();

    if (censusLookupError) throw censusLookupError;

    if (!censusRow?.data) {
      throw new Error(
        "The original household census record no longer exists, so this family cannot be safely restored."
      );
    }

    const originalCurrentCensus = deepClone(
      censusRow.data as Record<string, unknown>
    );

    const restoredCensus = deepClone(
      censusRow.data as {
        families?: Record<string, unknown>[];
        [key: string]: unknown;
      }
    );

    const families = Array.isArray(restoredCensus.families)
      ? [...restoredCensus.families]
      : [];

    const sourceFamily = deepClone(snapshot.source_family);
    const sourceFamilyId =
      typeof sourceFamily.id === "string" || typeof sourceFamily.id === "number"
        ? String(sourceFamily.id)
        : "";

    const alreadyInJson = families.some((family) => {
      const candidateId =
        typeof family.id === "string" || typeof family.id === "number"
          ? String(family.id)
          : "";

      return Boolean(sourceFamilyId) && candidateId === sourceFamilyId;
    });

    if (alreadyInJson) {
      throw new Error(
        "This family already exists in the household census record."
      );
    }

    const safeFamilyIndex = Math.min(
      Math.max(snapshot.family_index, 0),
      families.length
    );

    families.splice(safeFamilyIndex, 0, sourceFamily);
    restoredCensus.families = families;

    const normalizedFamily = snapshot.normalized_family || null;
    const memberships = snapshot.family_memberships || [];
    const normalizedFamilyId =
      normalizedFamily && typeof normalizedFamily.id === "string"
        ? normalizedFamily.id
        : null;

    let insertedNormalizedFamily = false;

    if (normalizedFamilyId) {
      const { data: existingFamily, error: existingFamilyError } =
        await supabase
          .from("families")
          .select("id")
          .eq("id", normalizedFamilyId)
          .maybeSingle();

      if (existingFamilyError) throw existingFamilyError;

      if (existingFamily) {
        throw new Error(
          "This family already exists in the normalized families table."
        );
      }
    }

    try {
      const { data: updatedRows, error: censusUpdateError } = await supabase
        .from("census_records")
        .update({ data: restoredCensus })
        .eq("id", snapshot.census_record_id)
        .select("id");

      if (censusUpdateError) throw censusUpdateError;

      if (!updatedRows?.length) {
        throw new Error("The household census record could not be updated.");
      }

      // Legacy-safe behavior:
      // If the family had no normalized row when it was deleted, restore only
      // the JSON family because there is no normalized record to recreate.
      if (normalizedFamily) {
        const { error: familyInsertError } = await supabase
          .from("families")
          .insert(normalizedFamily);

        if (familyInsertError) throw familyInsertError;
        insertedNormalizedFamily = true;

        if (memberships.length) {
          const { error: membershipsInsertError } = await supabase
            .from("family_memberships")
            .insert(memberships);

          if (membershipsInsertError) throw membershipsInsertError;
        }
      }

      await writeAuditLog({
        actor,
        action: "RESTORE",
        row,
        beforeData: {
          status: "in_recycle_bin",
          recycle_bin_id: row.id,
          snapshot,
        },
        afterData: {
          status: "restored",
          household_number: row.household_number,
          census_record_id: snapshot.census_record_id,
          normalized_family_restored: Boolean(normalizedFamily),
        },
      });

      const { data: deletedBinRows, error: recycleDeleteError } =
        await supabase
          .from("recycle_bin")
          .delete()
          .eq("id", row.id)
          .select("id");

      if (recycleDeleteError) throw recycleDeleteError;

      if (!deletedBinRows?.length) {
        throw new Error(
          "The family was restored, but the Recycle Bin item could not be cleared."
        );
      }
    } catch (restoreError) {
      // Best-effort rollback because these client-side calls are not atomic.
      const { error: censusRollbackError } = await supabase
        .from("census_records")
        .update({ data: originalCurrentCensus })
        .eq("id", snapshot.census_record_id);

      if (censusRollbackError) {
        console.error(
          "FAILED TO ROLLBACK CENSUS AFTER FAMILY RESTORE ERROR:",
          censusRollbackError
        );
      }

      if (insertedNormalizedFamily && normalizedFamilyId) {
        const { error: membershipRollbackError } = await supabase
          .from("family_memberships")
          .delete()
          .eq("family_id", normalizedFamilyId);

        if (membershipRollbackError) {
          console.error(
            "FAILED TO ROLLBACK FAMILY MEMBERSHIPS:",
            membershipRollbackError
          );
        }

        const { error: familyRollbackError } = await supabase
          .from("families")
          .delete()
          .eq("id", normalizedFamilyId);

        if (familyRollbackError) {
          console.error(
            "FAILED TO ROLLBACK NORMALIZED FAMILY:",
            familyRollbackError
          );
        }
      }

      throw restoreError;
    }
  }

  async function confirmRestore() {
    if (!restoreTarget || restoring) return;

    setRestoring(true);
    setError("");
    setSuccess("");

    try {
      if (restoreTarget.entity_type === "resident") {
        await restoreResident(restoreTarget);
      } else if (restoreTarget.entity_type === "household") {
        await restoreHousehold(restoreTarget);
      } else if (restoreTarget.entity_type === "family") {
        await restoreFamily(restoreTarget);
      } else {
        throw new Error(`Restore is not yet configured for ${restoreTarget.entity_type} records.`);
      }
      setRows((current) =>
        current.filter(
          (item) => item.id !== restoreTarget.id
        )
      );
      setRestoreTarget(null);
      setSuccess(
        restoreTarget.entity_type === "household"
          ? "Household restored successfully. Its families and residents were returned to active records."
          : restoreTarget.entity_type === "family"
            ? "Family restored successfully. Its family record was returned to the original household."
            : "Resident restored successfully. The active census data has been refreshed."
      );

      if (onDataChanged) {
        await onDataChanged();
      }
    } catch (restoreError) {
      console.error("RESTORE FAILED:", restoreError);
      setError(
        restoreError instanceof Error
          ? restoreError.message
          : "Unable to restore the record."
      );
    } finally {
      setRestoring(false);
    }
  }

  async function confirmPermanentDelete() {
    if (
      !permanentTarget ||
      permanentlyDeleting ||
      deleteConfirmation.trim().toUpperCase() !== "DELETE"
    ) {
      return;
    }

    setPermanentlyDeleting(true);
    setError("");
    setSuccess("");

    try {
      const actor = await getAuditActor();

      // Keep permanent-deletion evidence in the immutable audit table.
      await writeAuditLog({
        actor,
        action: "PERMANENT_DELETE",
        row: permanentTarget,
        beforeData: {
          status: "in_recycle_bin",
          recycle_bin_id: permanentTarget.id,
          snapshot: permanentTarget.snapshot,
        },
        afterData: {
          status: "permanently_deleted_from_recycle_bin",
        },
      });

      const { data: deletedRows, error: deleteError } =
        await supabase
          .from("recycle_bin")
          .delete()
          .eq("id", permanentTarget.id)
          .select("id");

      if (deleteError) throw deleteError;

      if (!deletedRows?.length) {
        throw new Error(
          "The Recycle Bin item was not permanently deleted."
        );
      }

      setRows((current) =>
        current.filter(
          (item) => item.id !== permanentTarget.id
        )
      );
      setPermanentTarget(null);
      setDeleteConfirmation("");
      setSuccess(
        "The Recycle Bin backup was permanently deleted. Its audit record remains."
      );
    } catch (deleteError) {
      console.error(
        "PERMANENT DELETE FAILED:",
        deleteError
      );
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to permanently delete the record."
      );
    } finally {
      setPermanentlyDeleting(false);
    }
  }

  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>
          <h1>Recycle Bin</h1>
          <p className="dashboard-description">
            Restore deleted records or permanently remove their
            Recycle Bin backup.
          </p>
        </div>

        <button
          type="button"
          className="census-back-dashboard"
          onClick={onBackToDashboard}
        >
          ← Back to Dashboard
        </button>
      </header>

      <section className="dashboard-section">
        <div
          className="recycle-protected-notice"
          style={{
            padding: 14,
            border: "1px solid #fed7aa",
            background: "#fff7ed",
            borderRadius: 12,
            color: "#9a3412",
            display: "flex",
            gap: 9,
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <ShieldAlert size={18} />
          <span>
            <strong>Protected deletion:</strong> Restore returns
            supported records to active census records. Permanent
            Delete removes the Recycle Bin backup and cannot be
            undone.
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              background: "#fff1f2",
              color: "#b42318",
              borderRadius: 10,
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              padding: 14,
              marginBottom: 14,
              background: "#ecfdf3",
              color: "#067647",
              borderRadius: 10,
              border: "1px solid #abefc6",
              fontWeight: 700,
            }}
          >
            {success}
          </div>
        )}

        <div className="section-heading">
          <div>
            <span>DELETED RECORDS</span>
            <h2>Recycle Bin Items</h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                color: "#667085",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              DATE
              <input
                type="date"
                aria-label="Choose Recycle Bin date"
                value={selectedDate}
                max={getLocalDateInputValue()}
                onChange={(event) => {
                  if (event.target.value) {
                    setLoading(true);
                    setError("");
                    setSelectedDate(event.target.value);
                  }
                }}
                style={{
                  border: "1px solid #dfe4eb",
                  borderRadius: 9,
                  padding: "8px 9px",
                  background: "white",
                  color: "#334155",
                  fontWeight: 500,
                }}
              />
            </label>
            <span style={{ color: "#758094", fontSize: 12 }}>
              {rows.length} {rows.length === 1 ? "item" : "items"}
            </span>
            <button
              type="button"
              onClick={() => {
                setLoading(true);
                setError("");
                void load();
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "9px 13px",
                border: "1px solid #dfe4eb",
                borderRadius: 9,
                background: "white",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading Recycle Bin...</p>
        ) : rows.length === 0 ? (
          <p>No records were deleted on this date. Choose another date to view its Recycle Bin items.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((row) => (
              <article
                key={row.id}
                style={{
                  background: "white",
                  border: "1px solid #e7eaf0",
                  borderRadius: 14,
                  padding: 18,
                  display: "flex",
                  gap: 13,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flex: "0 0 40px",
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                    background: "#fff1f2",
                    color: "#b42318",
                  }}
                >
                  <Trash2 size={18} />
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>
                      {row.entity_name || "Unnamed Record"}
                    </strong>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#758094",
                      }}
                    >
                      {new Date(row.deleted_at).toLocaleString()}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: "7px 0 0",
                      color: "#667085",
                      fontSize: 13,
                    }}
                  >
                    {row.entity_type}
                    {row.household_number
                      ? ` • Household: ${row.household_number}`
                      : ""}
                  </p>

                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "#667085",
                      fontSize: 13,
                    }}
                  >
                    Deleted by:{" "}
                    {row.deleted_by_name ||
                      row.deleted_by_email ||
                      "Authorized User"}
                    {row.deleted_by_role
                      ? ` • ${row.deleted_by_role}`
                      : ""}
                  </p>

                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 13,
                    }}
                  >
                    <strong>Reason:</strong>{" "}
                    {row.delete_reason}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 9,
                      flexWrap: "wrap",
                      marginTop: 14,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setRestoreTarget(row);
                      }}
                      style={{
                        border: "1px solid #a6f4c5",
                        background: "#ecfdf3",
                        color: "#067647",
                        borderRadius: 9,
                        padding: "9px 13px",
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <RotateCcw size={15} />
                      Restore
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setSuccess("");
                        setDeleteConfirmation("");
                        setPermanentTarget(row);
                      }}
                      style={{
                        border: "1px solid #fecaca",
                        background: "#fff7f7",
                        color: "#b42318",
                        borderRadius: 9,
                        padding: "9px 13px",
                        cursor: "pointer",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      <Trash2 size={15} />
                      Permanently Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {restoreTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15, 23, 42, 0.55)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(500px, 100%)",
              background: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  Restore{" "}
                  {restoreTarget.entity_type === "household"
                    ? "Household"
                    : restoreTarget.entity_type === "family"
                      ? "Family"
                      : "Resident"}?
                </h2>
                <p
                  style={{
                    color: "#667085",
                    lineHeight: 1.55,
                  }}
                >
                  {restoreTarget.entity_name || "This record"}{" "}
                  {restoreTarget.entity_type === "household"
                    ? "will be returned with its saved families and residents to active census records."
                    : restoreTarget.entity_type === "family"
                      ? "will be returned to its original household and active census records."
                      : "will be returned to the original family and active census records."}
                </p>
              </div>

              <button
                type="button"
                disabled={restoring}
                onClick={() => setRestoreTarget(null)}
                style={{
                  border: "none",
                  background: "#f2f4f7",
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                disabled={restoring}
                onClick={() => setRestoreTarget(null)}
                style={{
                  border: "1px solid #dfe4eb",
                  background: "white",
                  borderRadius: 9,
                  padding: "10px 15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={restoring}
                onClick={() => void confirmRestore()}
                style={{
                  border: "none",
                  background: restoring
                    ? "#9aa4b2"
                    : "#067647",
                  color: "white",
                  borderRadius: 9,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor: restoring
                    ? "not-allowed"
                    : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <RotateCcw size={15} />
                {restoring ? "Restoring..." : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}

      {permanentTarget && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(15, 23, 42, 0.6)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(520px, 100%)",
              background: "white",
              borderRadius: 16,
              padding: 24,
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  flex: "0 0 42px",
                  background: "#fff1f2",
                  color: "#b42318",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <AlertTriangle size={21} />
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ margin: "0 0 6px" }}>
                  Permanently Delete?
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "#667085",
                    lineHeight: 1.55,
                  }}
                >
                  This removes the Recycle Bin backup for{" "}
                  <strong>
                    {permanentTarget.entity_name ||
                      "this record"}
                  </strong>
                  . Normal Restore will no longer be possible.
                  The Audit Trail entry will remain.
                </p>
              </div>

              <button
                type="button"
                disabled={permanentlyDeleting}
                onClick={() => {
                  setPermanentTarget(null);
                  setDeleteConfirmation("");
                }}
                style={{
                  border: "none",
                  background: "#f2f4f7",
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                <X size={17} />
              </button>
            </div>

            <label
              style={{
                display: "grid",
                gap: 7,
                marginTop: 18,
                color: "#475467",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Type DELETE to confirm
              <input
                type="text"
                value={deleteConfirmation}
                disabled={permanentlyDeleting}
                onChange={(event) =>
                  setDeleteConfirmation(
                    event.target.value
                  )
                }
                placeholder="DELETE"
                autoComplete="off"
                style={{
                  border: "1px solid #dfe4eb",
                  borderRadius: 9,
                  padding: "11px 12px",
                  fontSize: 14,
                }}
              />
            </label>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                disabled={permanentlyDeleting}
                onClick={() => {
                  setPermanentTarget(null);
                  setDeleteConfirmation("");
                }}
                style={{
                  border: "1px solid #dfe4eb",
                  background: "white",
                  borderRadius: 9,
                  padding: "10px 15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  permanentlyDeleting ||
                  deleteConfirmation.trim().toUpperCase() !== "DELETE"
                }
                onClick={() =>
                  void confirmPermanentDelete()
                }
                style={{
                  border: "none",
                  background:
                    deleteConfirmation.trim().toUpperCase() === "DELETE"&&
                    !permanentlyDeleting
                      ? "#b42318"
                      : "#cbd5e1",
                  color: "white",
                  borderRadius: 9,
                  padding: "10px 16px",
                  fontWeight: 700,
                  cursor:
                    deleteConfirmation.trim().toUpperCase() === "DELETE" &&
                    !permanentlyDeleting
                      ? "pointer"
                      : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Trash2 size={15} />
                {permanentlyDeleting
                  ? "Deleting..."
                  : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}




