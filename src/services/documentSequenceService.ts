import { supabase } from "./supabaseClient";

const BARANGAY_ID_DOCUMENT_TYPE = "barangay-id";

/**
 * Kinukuha ang kasalukuyang last issued number
 * mula sa Supabase.
 *
 * Halimbawa:
 * last_number = 205
 * next number na ipapakita = 206
 */
export async function getLastIssuedBarangayID(
  year: number
): Promise<number> {
  const { data, error } = await supabase
    .from("document_sequences")
    .select("last_number")
    .eq("document_type", BARANGAY_ID_DOCUMENT_TYPE)
    .eq("sequence_year", year)
    .maybeSingle();

  if (error) {
    console.error(
      "Failed to load Barangay ID sequence:",
      error
    );

    throw new Error(
      "Failed to load Barangay ID sequence from the database."
    );
  }

  return data?.last_number ?? 0;
}

/**
 * Atomic na kumukuha ng susunod na official ID number.
 *
 * Gumagamit ito ng get_next_document_number()
 * function na ginawa natin sa Supabase.
 *
 * Halimbawa:
 * 205 -> returns 206
 * at magiging 206 na rin ang last_number sa database.
 */
export async function getNextBarangayIDNumber(
  year: number
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "get_next_document_number",
    {
      p_document_type: BARANGAY_ID_DOCUMENT_TYPE,
      p_sequence_year: year,
      p_starting_number: 0,
    }
  );

  if (error) {
    console.error(
      "Failed to get next Barangay ID number:",
      error
    );

    throw new Error(
      "Failed to get the next Barangay ID number."
    );
  }

  if (
    data === null ||
    data === undefined
  ) {
    throw new Error(
      "The database did not return a Barangay ID number."
    );
  }

  return Number(data);
}