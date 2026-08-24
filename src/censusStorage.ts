import { supabase } from "./supabaseClient";

console.log("🔥 CENSUS STORAGE FILE LOADED 🔥");

export type CensusRecord = {
  id: string;
  data: any;
  createdAt: string;
};

export async function getCensusRecords(): Promise<CensusRecord[]> {
  const { data, error } = await supabase
    .from("census_records")
    .select("id, data, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load census records:", error);
    throw error;
  }

  return (data ?? []).map((record) => ({
    id: record.id,
    data: record.data,
    createdAt: record.created_at,
  }));
}

export async function saveCensusRecord(
  data: any
): Promise<CensusRecord> {
  console.log("🔥 NEW saveCensusRecord() IS RUNNING");
  console.log("CENSUS DATA TO SAVE:", data);

  const censusRecordId = crypto.randomUUID();

  const { data: savedData, error } = await supabase
    .from("census_records")
    .insert({
      id: censusRecordId,
      data,
      created_at: new Date().toISOString(),
    })
    .select("id, data, created_at")
    .single();

  if (error) {
    console.error(
      "Failed to save census record:",
      error
    );

    throw error;
  }

  console.log(
    "CENSUS RECORD SAVED SUCCESSFULLY:",
    savedData
  );

  return {
    id: savedData.id,
    data: savedData.data,
    createdAt: savedData.created_at,
  };
}