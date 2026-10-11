import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  History,
  RefreshCw,
  Pencil,
  Trash2,
  RotateCcw,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../../services/supabaseClient";
import { toProperNameCase } from "../../utils/nameFormatter";
import {
  getLocalDateInputValue,
  getLocalDateRange,
  millisecondsUntilNextLocalDay,
} from "../../utils/localDate";
import "../dashboard/dashboard.css";

type Props = { onBackToDashboard: () => void };

type AuditRow = {
  id: string;
  created_at: string;
  actor_email: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  reason: string | null;
  before_data: unknown;
  after_data: unknown;
};

type ChangeItem = {
  label: string;
  before: string;
  after: string;
};

type RecordSummary = {
  label: string;
  value: string;
};

const TECHNICAL_KEYS = new Set([
  "id",
  "created_at",
  "updated_at",
  "auth_user_id",
  "actor_user_id",
  "deleted_by_user_id",
]);

const FRIENDLY_LABELS: Record<string, string> = {
  household_number: "Household Number",
  householdNumber: "Household Number",
  house_number: "House No.",
  houseNumber: "House No.",
  street: "Street",
  purok: "Purok",
  barangay: "Barangay",
  municipality: "Municipality",
  province: "Province",
  region: "Region",
  current_address: "Current Address",
  currentAddress: "Current Address",
  previous_address: "Previous Address",
  previousAddress: "Previous Address",
  years_in_barangay: "Years in Barangay",
  yearsInBarangay: "Years in Barangay",

  first_name: "First Name",
  firstName: "First Name",
  middle_name: "Middle Name",
  middleName: "Middle Name",
  last_name: "Last Name",
  lastName: "Last Name",
  suffix: "Suffix",
  birth_date: "Birth Date",
  birthDate: "Birth Date",
  birth_place: "Birth Place",
  birthPlace: "Birth Place",
  sex: "Sex",
  civil_status: "Civil Status",
  civilStatus: "Civil Status",
  contact_number: "Contact Number",
  contactNumber: "Contact Number",
  email: "Email",
  nationality: "Nationality",
  religion: "Religion",
  voter_status: "Voter Status",
  voterStatus: "Voter Status",
  four_ps_member: "4Ps Member",
  fourPsMember: "4Ps Member",
  disability: "Disability",
  senior_citizen: "Senior Citizen",
  seniorCitizen: "Senior Citizen",
  employment_status: "Employment Status",
  employmentStatus: "Employment Status",
  employer: "Employer",
  monthly_income: "Monthly Income",
  monthlyIncome: "Monthly Income",
  primaryOccupation: "Primary Occupation",
  education: "Educational Attainment",
  school_status: "School Status",
  schoolStatus: "School Status",
  familyRelationship: "Family Relationship",
  family_member_status: "Family Member Status",
  familyMemberStatus: "Family Member Status",

  status: "Status",
  entity_type: "Record Type",
  entity_name: "Record Name",
  delete_reason: "Delete Reason",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatAuditSnapshot(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(formatAuditSnapshot);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    NAME_FIELD_KEYS.has(key) && typeof item === "string"
      ? toProperNameCase(item)
      : formatAuditSnapshot(item),
  ]));
}

function humanizeKey(key: string): string {
  if (FRIENDLY_LABELS[key]) return FRIENDLY_LABELS[key];

  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const NAME_FIELD_KEYS = new Set([
  "firstName", "first_name", "middleName", "middle_name",
  "lastName", "last_name", "familyName", "family_name",
  "familyMemberName", "family_member_name", "fullName", "full_name",
  "entity_name", "actor_name",
]);

function formatValue(value: unknown, key?: string): string {
  if (value == null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value);
    return key && NAME_FIELD_KEYS.has(key) ? toProperNameCase(text) : text;
  }
  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? "" : "s"}`;
  }
  return "Updated data";
}

function sameValue(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

function collectChanges(
  before: unknown,
  after: unknown,
  path: string[] = [],
  output: ChangeItem[] = []
): ChangeItem[] {
  if (sameValue(before, after)) return output;

  if (isRecord(before) || isRecord(after)) {
    const beforeObject = isRecord(before) ? before : {};
    const afterObject = isRecord(after) ? after : {};

    const keys = Array.from(
      new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)])
    );

    for (const key of keys) {
      if (TECHNICAL_KEYS.has(key)) continue;

      collectChanges(
        beforeObject[key],
        afterObject[key],
        [...path, key],
        output
      );
    }

    return output;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    const beforeArray = Array.isArray(before) ? before : [];
    const afterArray = Array.isArray(after) ? after : [];

    if (!sameValue(beforeArray, afterArray)) {
      output.push({
        label:
          path.length > 0
            ? path.map(humanizeKey).join(" › ")
            : "Record Details",
        before: `${beforeArray.length} item${beforeArray.length === 1 ? "" : "s"}`,
        after: `${afterArray.length} item${afterArray.length === 1 ? "" : "s"}`,
      });
    }

    return output;
  }

  output.push({
    label:
      path.length > 0
        ? path.map(humanizeKey).join(" › ")
        : "Value",
    before: formatValue(before, path.at(-1)),
    after: formatValue(after, path.at(-1)),
  });

  return output;
}

function findNestedValue(
  value: unknown,
  keys: string[]
): unknown {
  if (!isRecord(value)) return undefined;

  for (const key of keys) {
    if (key in value) return value[key];
  }

  for (const nestedValue of Object.values(value)) {
    if (isRecord(nestedValue)) {
      const found = findNestedValue(nestedValue, keys);
      if (found !== undefined) return found;
    }
  }

  return undefined;
}

function countNestedArrays(
  value: unknown,
  wantedKeys: string[]
): Record<string, number> {
  const result: Record<string, number> = {};

  function visit(current: unknown) {
    if (!isRecord(current)) return;

    for (const [key, nestedValue] of Object.entries(current)) {
      if (wantedKeys.includes(key) && Array.isArray(nestedValue)) {
        result[key] = Math.max(result[key] || 0, nestedValue.length);
      }

      if (isRecord(nestedValue)) visit(nestedValue);
    }
  }

  visit(value);
  return result;
}

function buildRecordSummary(row: AuditRow): RecordSummary[] {
  const summaries: RecordSummary[] = [];

  summaries.push({
    label: "Action",
    value: row.action.replace(/_/g, " "),
  });

  summaries.push({
    label: "Record",
    value: toProperNameCase(row.entity_name) || humanizeKey(row.entity_type),
  });

  const householdNumber =
    findNestedValue(row.after_data, [
      "household_number",
      "householdNumber",
    ]) ??
    findNestedValue(row.before_data, [
      "household_number",
      "householdNumber",
    ]);

  if (householdNumber != null && householdNumber !== "") {
    summaries.push({
      label: "Household Number",
      value: String(householdNumber),
    });
  }

  summaries.push({
    label: "Performed By",
    value:
      toProperNameCase(row.actor_name) ||
      row.actor_email ||
      "Authorized User",
  });

  if (row.actor_role) {
    summaries.push({
      label: "Role",
      value: humanizeKey(row.actor_role),
    });
  }

  summaries.push({
    label: "Recorded",
    value: new Date(row.created_at).toLocaleString(),
  });

  if (row.reason) {
    summaries.push({
      label: "Reason",
      value: row.reason,
    });
  }

  return summaries;
}

function getStatusText(row: AuditRow): {
  before: string;
  after: string;
} | null {
  const action = row.action.toUpperCase();

  if (action === "DELETE") {
    return { before: "Active", after: "Recycle Bin" };
  }

  if (action === "RESTORE") {
    return { before: "Recycle Bin", after: "Active / Restored" };
  }

  if (action === "PERMANENT_DELETE") {
    return { before: "Recycle Bin", after: "Permanently Deleted" };
  }

  return null;
}

function getActionDescription(row: AuditRow): string {
  const action = row.action.toUpperCase();
  const entity =
    toProperNameCase(row.entity_name) || humanizeKey(row.entity_type);

  if (action === "EDIT") {
    return `Changes were made to ${entity}.`;
  }

  if (action === "DELETE") {
    return `${entity} was removed from active records and moved to the Recycle Bin.`;
  }

  if (action === "RESTORE") {
    return `${entity} was restored from the Recycle Bin to active records.`;
  }

  if (action === "PERMANENT_DELETE") {
    return `The Recycle Bin backup for ${entity} was permanently deleted.`;
  }

  return `${humanizeKey(row.action)} was recorded for ${entity}.`;
}

function getActionStyle(action: string) {
  switch (action.toUpperCase()) {
    case "EDIT":
      return {
        background: "#eff6ff",
        color: "#1d4ed8",
        icon: <Pencil size={18} />,
      };
    case "DELETE":
      return {
        background: "#fff1f2",
        color: "#b42318",
        icon: <Trash2 size={18} />,
      };
    case "RESTORE":
      return {
        background: "#ecfdf3",
        color: "#067647",
        icon: <RotateCcw size={18} />,
      };
    case "PERMANENT_DELETE":
      return {
        background: "#fff7ed",
        color: "#9a3412",
        icon: <ShieldAlert size={18} />,
      };
    default:
      return {
        background: "#eef6ff",
        color: "#2458a6",
        icon: <History size={18} />,
      };
  }
}

function AuditDetails({ row }: { row: AuditRow }) {
  const action = row.action.toUpperCase();

  const changes = useMemo(
    () => collectChanges(row.before_data, row.after_data),
    [row.before_data, row.after_data]
  );

  const summary = useMemo(
    () => buildRecordSummary(row),
    [row]
  );

  const status = getStatusText(row);

  const snapshotCounts = useMemo(
    () =>
      countNestedArrays(row.before_data, [
        "families",
        "residents",
        "family_memberships",
        "resident_education",
        "resident_employment",
        "resident_occupations",
        "resident_skills_new",
      ]),
    [row.before_data]
  );

  const humanCounts = Object.entries(snapshotCounts)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({
      label: humanizeKey(key),
      count,
    }));

  return (
    <details
      style={{
        marginTop: 12,
        borderTop: "1px solid #eef0f4",
        paddingTop: 12,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13,
          color: "#344054",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <ChevronDown size={15} />
        View details
      </summary>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            padding: 14,
            borderRadius: 10,
            background: "#f8fafc",
            color: "#475467",
            fontSize: 13,
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: "#172033" }}>
            What happened:
          </strong>{" "}
          {getActionDescription(row)}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
          }}
        >
          {summary.map((item) => (
            <div
              key={`${row.id}-${item.label}`}
              style={{
                border: "1px solid #e7eaf0",
                borderRadius: 10,
                padding: 12,
                background: "white",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#7e8a9f",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  color: "#344054",
                  fontSize: 13,
                  fontWeight: 600,
                  overflowWrap: "anywhere",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>

        {status && (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#475467",
                marginBottom: 8,
              }}
            >
              STATUS CHANGE
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0,1fr) auto minmax(0,1fr)",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  padding: 12,
                  border: "1px solid #e7eaf0",
                  borderRadius: 10,
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#7e8a9f",
                    marginBottom: 4,
                  }}
                >
                  Before
                </div>
                <strong>{status.before}</strong>
              </div>

              <div
                style={{
                  color: "#98a2b3",
                  fontWeight: 800,
                }}
              >
                →
              </div>

              <div
                style={{
                  padding: 12,
                  border: "1px solid #d1fadf",
                  borderRadius: 10,
                  background: "#ecfdf3",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: "#667085",
                    marginBottom: 4,
                  }}
                >
                  After
                </div>
                <strong>{status.after}</strong>
              </div>
            </div>
          </div>
        )}

        {action === "EDIT" && (
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: "#475467",
                marginBottom: 8,
              }}
            >
              CHANGES MADE
            </div>

            {changes.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: "#f8fafc",
                  color: "#667085",
                  fontSize: 13,
                }}
              >
                No field-level difference could be detected from
                the saved audit data.
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #e7eaf0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                {changes.map((change, index) => (
                  <div
                    key={`${change.label}-${index}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(150px,0.8fr) minmax(0,1fr) 28px minmax(0,1fr)",
                      gap: 10,
                      alignItems: "center",
                      padding: 12,
                      borderTop:
                        index === 0
                          ? "none"
                          : "1px solid #eef0f4",
                      background: "white",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 13,
                        color: "#344054",
                      }}
                    >
                      {change.label}
                    </strong>

                    <div
                      style={{
                        padding: "8px 10px",
                        background: "#fff1f2",
                        borderRadius: 8,
                        color: "#9f1239",
                        fontSize: 13,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {change.before}
                    </div>

                    <div
                      style={{
                        textAlign: "center",
                        color: "#98a2b3",
                        fontWeight: 800,
                      }}
                    >
                      →
                    </div>

                    <div
                      style={{
                        padding: "8px 10px",
                        background: "#ecfdf3",
                        borderRadius: 8,
                        color: "#067647",
                        fontSize: 13,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {change.after}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(action === "DELETE" ||
          action === "RESTORE" ||
          action === "PERMANENT_DELETE") &&
          humanCounts.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#475467",
                  marginBottom: 8,
                }}
              >
                SAVED / AFFECTED DATA
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {humanCounts.map((item) => (
                  <span
                    key={item.label}
                    style={{
                      border: "1px solid #dfe4eb",
                      background: "#f8fafc",
                      borderRadius: 999,
                      padding: "7px 10px",
                      fontSize: 12,
                      color: "#475467",
                    }}
                  >
                    <strong>{item.count}</strong>{" "}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          )}

        <details
          style={{
            borderTop: "1px dashed #dfe4eb",
            paddingTop: 10,
          }}
        >
          <summary
            style={{
              cursor: "pointer",
              color: "#667085",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Technical details
          </summary>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 10,
              marginTop: 10,
            }}
          >
            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                background: "#f8fafc",
                padding: 12,
                borderRadius: 9,
                fontSize: 11,
                overflow: "auto",
                maxHeight: 360,
              }}
            >
              Before{"\n"}
              {JSON.stringify(formatAuditSnapshot(row.before_data), null, 2)}
            </pre>

            <pre
              style={{
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                background: "#f8fafc",
                padding: 12,
                borderRadius: 9,
                fontSize: 11,
                overflow: "auto",
                maxHeight: 360,
              }}
            >
              After{"\n"}
              {JSON.stringify(formatAuditSnapshot(row.after_data), null, 2)}
            </pre>
          </div>
        </details>
      </div>
    </details>
  );
}

export default function AuditTrail({
  onBackToDashboard,
}: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateInputValue()
  );
  const loadRequestId = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++loadRequestId.current;

    try {
      const { start, end } = getLocalDateRange(selectedDate);
      const { data, error: loadError } = await supabase
        .from("audit_logs")
        .select("*")
        .gte("created_at", start)
        .lt("created_at", end)
        .order("created_at", { ascending: false });

      if (requestId === loadRequestId.current) {
        if (loadError) {
          setError(loadError.message);
          setRows([]);
        } else {
          setRows((data || []) as AuditRow[]);
        }
      }
    } catch (loadError) {
      if (requestId === loadRequestId.current) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Could not load audit activity for this date."
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

  return (
    <main className="dashboard-main">
      <header className="dashboard-header">
        <div>
          <p className="dashboard-overline">
            BARANGAY MANAGEMENT SYSTEM
          </p>
          <h1>Audit Trail</h1>
          <p className="dashboard-description">
            Review who changed a record, what was changed, why it
            happened, and when it was recorded.
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
        <div className="section-heading">
          <div>
            <span>ACTIVITY HISTORY</span>
            <h2>System Activity</h2>
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
                aria-label="Choose Audit Trail date"
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
              {rows.length} {rows.length === 1 ? "activity" : "activities"}
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
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 14,
              background: "#fff1f2",
              color: "#b42318",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading audit trail...</p>
        ) : rows.length === 0 ? (
          <p>No audit activity on this date. Choose another date to view its history.</p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((row) => {
              const actionStyle = getActionStyle(row.action);

              return (
                <article
                  key={row.id}
                  style={{
                    background: "white",
                    border: "1px solid #e7eaf0",
                    borderRadius: 14,
                    padding: 18,
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
                        width: 38,
                        height: 38,
                        flex: "0 0 38px",
                        borderRadius: 10,
                        display: "grid",
                        placeItems: "center",
                        background: actionStyle.background,
                        color: actionStyle.color,
                      }}
                    >
                      {actionStyle.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>
                          {row.action.replace(/_/g, " ")} —{" "}
                          {toProperNameCase(row.entity_name) || row.entity_type}
                        </strong>

                        <span
                          style={{
                            fontSize: 12,
                            color: "#758094",
                          }}
                        >
                          Recorded:{" "}
                          {new Date(
                            row.created_at
                          ).toLocaleString()}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: "7px 0 0",
                          color: "#667085",
                          fontSize: 13,
                        }}
                      >
                        By:{" "}
                        {toProperNameCase(row.actor_name) ||
                          row.actor_email ||
                          "Authorized User"}
                        {row.actor_role
                          ? ` • ${humanizeKey(row.actor_role)}`
                          : ""}
                        {row.reason
                          ? ` • Reason: ${row.reason}`
                          : ""}
                      </p>

                      {(row.before_data != null ||
                        row.after_data != null) && (
                        <AuditDetails row={row} />
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}




