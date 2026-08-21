import { supabase } from "./supabaseClient";

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
  const { data: savedData, error } = await supabase
    .from("census_records")
    .insert({
      id: crypto.randomUUID(),
      data,
      created_at: new Date().toISOString(),
    })
    .select("id, data, created_at")
    .single();

  if (error) {
    console.error("Failed to save census record:", error);
    throw error;
  }

  return {
    id: savedData.id,
    data: savedData.data,
    createdAt: savedData.created_at,
  };
}

export async function deleteCensusRecord(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("census_records")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete census record:", error);
    throw error;
  }
}

export async function updateCensusRecord(
  id: string,
  data: any
): Promise<void> {
  const { error } = await supabase
    .from("census_records")
    .update({ data })
    .eq("id", id);

  if (error) {
    console.error("Failed to update census record:", error);
    throw error;
  }
}