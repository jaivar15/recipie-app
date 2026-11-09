"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addWeightEntryAction(values: {
  entryDate: string;
  entryTime: string | null;
  weightKg: number;
  notes: string;
}) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("weight_entries").insert({
    user_id: userId,
    entry_date: values.entryDate,
    entry_time: values.entryTime,
    weight_kg: values.weightKg,
    notes: values.notes || null,
  });
  if (error) throw new Error(error.message);

  // Keep the profile's current_weight_kg in sync with the latest entry.
  await supabase.from("health_profiles").update({ current_weight_kg: values.weightKg }).eq("user_id", userId);

  revalidatePath("/health");
  revalidatePath("/health/weight");
}

export async function updateWeightEntryAction(
  id: string,
  values: { entryDate: string; entryTime: string | null; weightKg: number; notes: string }
) {
  const { supabase } = await requireUserId();
  const { error } = await supabase
    .from("weight_entries")
    .update({
      entry_date: values.entryDate,
      entry_time: values.entryTime,
      weight_kg: values.weightKg,
      notes: values.notes || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/health");
  revalidatePath("/health/weight");
}

export async function deleteWeightEntryAction(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("weight_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/health");
  revalidatePath("/health/weight");
}
