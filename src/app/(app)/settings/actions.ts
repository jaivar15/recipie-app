"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsActionState = { error: string | null; success?: boolean };

export async function updateProfileAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  const measurementSystem = String(formData.get("measurementSystem") ?? "metric");

  if (!displayName) return { error: "Name is required" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName, measurement_system: measurementSystem })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function updateHouseholdNameAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const householdId = String(formData.get("householdId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Household name is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("households").update({ name }).eq("id", householdId);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null, success: true };
}

export async function archiveHouseholdAction(householdId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_household", { p_household_id: householdId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function restoreHouseholdAction(householdId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_household", { p_household_id: householdId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
