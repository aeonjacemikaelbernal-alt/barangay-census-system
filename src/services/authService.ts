import { supabase } from "./supabaseClient";

export type AuthorizedUser = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export async function getAuthorizedUser(
  authUserId: string
): Promise<AuthorizedUser | null> {
  const { data, error } = await supabase
    .from("authorized_users")
    .select(`
      id,
      auth_user_id,
      email,
      full_name,
      role,
      is_active
    `)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    console.error(
      "FAILED TO LOAD AUTHORIZED USER:",
      error
    );

    throw error;
  }

  return data;
}