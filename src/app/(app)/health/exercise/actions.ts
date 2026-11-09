"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type ExerciseActivityType = Database["public"]["Enums"]["exercise_activity_type"];
type ExerciseIntensity = Database["public"]["Enums"]["exercise_intensity"];

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export type ExerciseEntryValues = {
  entryDate: string;
  activityType: ExerciseActivityType;
  durationMinutes: number;
  intensity: ExerciseIntensity | null;
  distanceKm: number | null;
  steps: number | null;
  estimatedCalories: number | null;
  notes: string;
};

export async function addExerciseEntryAction(values: ExerciseEntryValues) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("exercise_entries").insert({
    user_id: userId,
    entry_date: values.entryDate,
    activity_type: values.activityType,
    duration_minutes: values.durationMinutes,
    intensity: values.intensity,
    distance_km: values.distanceKm,
    steps: values.steps,
    estimated_calories: values.estimatedCalories,
    notes: values.notes || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/health/exercise");
  revalidatePath("/health/calories");
}

export async function deleteExerciseEntryAction(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("exercise_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/health/exercise");
  revalidatePath("/health/calories");
}
