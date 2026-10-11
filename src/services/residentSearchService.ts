import { supabase } from "./supabaseClient";

export type ResidentSearchResult = {
  id: string;
  residentId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  primaryOccupation: string;
  skills: string[];
};

export async function searchResidents(
  searchText: string
): Promise<ResidentSearchResult[]> {
  const query = searchText.trim();

  if (!query) {
    return [];
  }

  // Search basic resident information.
  // Limit prevents thousands of rows from being sent
  // to the browser.
  const { data: residents, error } =
    await supabase
      .from("residents")
      .select(`
        id,
        resident_id,
        first_name,
        middle_name,
        last_name,
        suffix
      `)
      .or(
        [
          `first_name.ilike.%${query}%`,
          `middle_name.ilike.%${query}%`,
          `last_name.ilike.%${query}%`,
          `resident_id.ilike.%${query}%`,
        ].join(",")
      )
      .limit(8);

  if (error) {
    console.error(
      "RESIDENT SEARCH FAILED:",
      error
    );

    throw error;
  }

  if (!residents?.length) {
    return [];
  }

  const residentIds =
    residents.map(
      (resident) => resident.id
    );

  const [
    occupationsResult,
    skillsResult,
  ] = await Promise.all([
    supabase
      .from("resident_occupations")
      .select(
        "resident_id, occupation_name, occupation_type"
      )
      .in(
        "resident_id",
        residentIds
      ),

    supabase
      .from("resident_skills_new")
      .select(
        "resident_id, skill_name"
      )
      .in(
        "resident_id",
        residentIds
      ),
  ]);

  if (occupationsResult.error) {
    console.error(
      "OCCUPATION SEARCH DATA FAILED:",
      occupationsResult.error
    );
  }

  if (skillsResult.error) {
    console.error(
      "SKILLS SEARCH DATA FAILED:",
      skillsResult.error
    );
  }

  return residents.map(
    (resident) => {
      const primaryOccupation =
        (
          occupationsResult.data ??
          []
        ).find(
          (occupation) =>
            occupation.resident_id ===
              resident.id &&
            String(
              occupation.occupation_type ||
                ""
            )
              .trim()
              .toLowerCase() ===
              "primary"
        )?.occupation_name ?? "";

      const skills =
        (
          skillsResult.data ?? []
        )
          .filter(
            (skill) =>
              skill.resident_id ===
              resident.id
          )
          .map(
            (skill) =>
              skill.skill_name
          )
          .filter(Boolean);

      return {
        id: resident.id,

        residentId:
          resident.resident_id ?? "",

        firstName:
          resident.first_name ?? "",

        middleName:
          resident.middle_name ?? "",

        lastName:
          resident.last_name ?? "",

        suffix:
          resident.suffix ?? "",

        primaryOccupation,

        skills,
      };
    }
  );
}