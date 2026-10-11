/* eslint-disable @typescript-eslint/no-explicit-any -- census_records.data is a legacy JSON payload with no generated schema type. */
import { supabase } from "./supabaseClient";
import { getLocalDateRange } from "../utils/localDate";

export type DashboardChartItem = {
  label: string;
  count: number;
};

export type HouseholdTrendItem = {
  label: string;
  value: number;
};

export type RecentActivityItem = {
  id: number;
  createdAt: string;
  householdNumber: string;
  houseNumber: string;
  street: string;
  purok: string;
  familyCount: number;
  residentCount: number;
};

function mapRecentActivityRows(
  rows: Array<{ id: number | string; data: unknown; created_at: string }>
): RecentActivityItem[] {
  return rows.map((row) => {
    const data = row.data as any;
    const families = Array.isArray(data?.families) ? data.families : [];
    const residentCount = families.reduce(
      (total: number, family: any) =>
        total + (Array.isArray(family?.members) ? family.members.length : 0),
      0
    );

    return {
      id: Number(row.id),
      createdAt: row.created_at,
      householdNumber: String(data?.householdNumber || ""),
      houseNumber: String(data?.household?.houseNumber || ""),
      street: String(data?.household?.street || ""),
      purok: String(data?.household?.purok || ""),
      familyCount: families.length,
      residentCount,
    };
  });
}

export async function getCensusActivityForDate(
  dateValue: string
): Promise<RecentActivityItem[]> {
  const { start, end } = getLocalDateRange(dateValue);
  const { data, error } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .gte("created_at", start)
    .lt("created_at", end)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return mapRecentActivityRows(data || []);
}

export type DashboardSummary = {
  totalHouseholds: number;
  totalResidents: number;
  totalFamilies: number;

  largestHouseholdCount: number;

  totalFamilyHeads: number;
  totalRegisteredVoters: number;

  householdTrend: HouseholdTrendItem[];
  recentActivity: RecentActivityItem[];

  totalChildren: number;

  maleCount: number;
  femaleCount: number;

  childrenAgeCount: number;
  adolescentCount: number;
  adultCount: number;
  seniorCount: number;

  educationData: DashboardChartItem[];
  occupationData: DashboardChartItem[];
  skillsData: DashboardChartItem[];
};

function subtractYears(
  date: Date,
  years: number
): string {
  const result = new Date(date);

  result.setFullYear(
    result.getFullYear() - years
  );

  return result
    .toISOString()
    .split("T")[0];
}

function buildChartData(
  values: Array<string | null | undefined>
): DashboardChartItem[] {
  const counts: Record<string, number> = {};

  values.forEach((value) => {
    const label = String(
      value || ""
    ).trim();

    if (!label) {
      return;
    }

    counts[label] =
      (counts[label] ?? 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      count,
    }))
    .sort(
      (a, b) =>
        b.count - a.count
    );
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date();

  const todayDate = today
    .toISOString()
    .split("T")[0];

  const thirteenYearsAgo =
    subtractYears(today, 13);

  const eighteenYearsAgo =
    subtractYears(today, 18);

  const sixtyYearsAgo =
    subtractYears(today, 60);

  const [
    householdsResult,
    residentsResult,
    familiesResult,
    familyHeadsResult,
    votersResult,

    childrenResult,

    maleResult,
    femaleResult,

    childrenAgeResult,
    adolescentResult,
    adultResult,
    seniorResult,

    educationResult,

    occupationResult,

    skillsResult,

recentCensusResult,
] = await Promise.all([
    // ================================================
    // BASIC COUNTS
    // ================================================

    supabase
      .from("households")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("families")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("family_memberships")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "is_family_head",
        true
      ),

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .ilike(
        "voter_status",
        "registered voter"
      ),

    // ================================================
    // CHILD RELATIONSHIP
    // ================================================

    supabase
      .from("family_memberships")
      .select("*", {
        count: "exact",
        head: true,
      })
      .ilike(
        "relationship",
        "child"
      ),

    // ================================================
    // SEX DISTRIBUTION
    // ================================================

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .ilike(
        "sex",
        "male"
      ),

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .ilike(
        "sex",
        "female"
      ),

    // ================================================
    // AGE: CHILDREN 0-12
    // ================================================

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gt(
        "birth_date",
        thirteenYearsAgo
      )
      .lte(
        "birth_date",
        todayDate
      ),

    // ================================================
    // AGE: ADOLESCENTS 13-17
    // ================================================

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gt(
        "birth_date",
        eighteenYearsAgo
      )
      .lte(
        "birth_date",
        thirteenYearsAgo
      ),

    // ================================================
    // AGE: ADULTS 18-59
    // ================================================

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .gt(
        "birth_date",
        sixtyYearsAgo
      )
      .lte(
        "birth_date",
        eighteenYearsAgo
      ),

    // ================================================
    // AGE: SENIORS 60+
    // ================================================

    supabase
      .from("residents")
      .select("*", {
        count: "exact",
        head: true,
      })
      .lte(
        "birth_date",
        sixtyYearsAgo
      ),

    // ================================================
    // EDUCATION
    // NOTE: Supabase/PostgREST caps results at 1,000 rows
    // by default with no error when truncated. An explicit
    // .limit() here buys headroom so the chart doesn't
    // silently go incomplete as the barangay grows. If the
    // resident count is expected to exceed this, switch to
    // a server-side aggregate (RPC/view with GROUP BY)
    // instead of pulling raw rows to chart client-side.
    // ================================================

    supabase
      .from("resident_education")
      .select(
        "educational_attainment"
      )
      .limit(20000),

    // ================================================
    // OCCUPATIONS
    // ================================================

    supabase
      .from("resident_occupations")
      .select(
        "occupation_name, occupation_type"
      )
      .limit(20000),

    // ================================================
    // SKILLS
    // ================================================

    supabase
  .from("resident_skills_new")
  .select(
    "skill_name"
  )
  .limit(20000),

// ================================================
// RECENT CENSUS RECORDS
// Used for:
// - Largest household
// - Household trend
// - Recent activity
// ================================================

supabase
  .from("census_records")
  .select(
    "id, data, created_at"
  )
  .order(
    "created_at",
    { ascending: false }
  )
  .limit(20),
]);

  // ================================================
  // ERROR CHECKING
  // ================================================

  const results = [
    householdsResult,
    residentsResult,
    familiesResult,
    familyHeadsResult,
    votersResult,

    childrenResult,

    maleResult,
    femaleResult,

    childrenAgeResult,
    adolescentResult,
    adultResult,
    seniorResult,

   educationResult,
occupationResult,
skillsResult,

recentCensusResult,
];
  const failedResult =
    results.find(
      (result) =>
        result.error
    );

  if (failedResult?.error) {
    console.error(
      "FAILED TO LOAD DASHBOARD SUMMARY:",
      failedResult.error
    );

    throw failedResult.error;
  }

  // ================================================
  // EDUCATION CHART
  // ================================================

  const educationData =
    buildChartData(
      (educationResult.data ?? []).map(
        (row) =>
          row.educational_attainment
      )
    );

  // ================================================
  // OCCUPATION CHART
  //
  // Dashboard previously displayed primary occupation,
  // so preserve that behavior.
  // ================================================

  const primaryOccupations =
    (occupationResult.data ?? [])
      .filter(
        (row) =>
          String(
            row.occupation_type || ""
          )
            .trim()
            .toLowerCase() ===
          "primary"
      )
      .map(
        (row) =>
          row.occupation_name
      );

  const occupationData =
    buildChartData(
      primaryOccupations
    );

  // ================================================
  // SKILLS CHART
  // ================================================

  const skillsData =
    buildChartData(
      (skillsResult.data ?? []).map(
        (row) =>
          row.skill_name
      )
    );

    // ================================================
// HOUSEHOLD / RECENT ACTIVITY DATA
// ================================================

const recentCensusRows = recentCensusResult.data ?? [];
const parsedRecentRecords = mapRecentActivityRows(recentCensusRows);

  const largestHouseholdCount =
  parsedRecentRecords.reduce(
    (largest, record) =>
      Math.max(
        largest,
        record.residentCount
      ),
    0
  );

  const householdTrend =
  parsedRecentRecords
    .slice(0, 10)
    .reverse()
    .map((record) => ({
      label:
        record.householdNumber ||
        "Household",

      value:
        record.residentCount,
    }));

  const recentActivity = parsedRecentRecords;

  // ================================================
  // FINAL DASHBOARD DATA
  // ================================================

  return {
  totalHouseholds:
    householdsResult.count ?? 0,

  totalResidents:
    residentsResult.count ?? 0,

  totalFamilies:
    familiesResult.count ?? 0,

  largestHouseholdCount,

  totalFamilyHeads:
    familyHeadsResult.count ?? 0,

  totalRegisteredVoters:
    votersResult.count ?? 0,

  householdTrend,
recentActivity,

    totalChildren:
      childrenResult.count ?? 0,

    maleCount:
      maleResult.count ?? 0,

    femaleCount:
      femaleResult.count ?? 0,

    childrenAgeCount:
      childrenAgeResult.count ??
      0,

    adolescentCount:
      adolescentResult.count ??
      0,

    adultCount:
      adultResult.count ?? 0,

    seniorCount:
      seniorResult.count ?? 0,

    educationData,
    occupationData,
    skillsData,
  };
}

