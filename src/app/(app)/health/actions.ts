"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type Sex = Database["public"]["Enums"]["biological_sex"];
type ActivityLevel = Database["public"]["Enums"]["activity_level"];
type GoalMode = Database["public"]["Enums"]["nutrition_goal_mode"];

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function saveHealthProfileAction(values: {
  heightCm: number | null;
  startingWeightKg: number | null;
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  dateOfBirth: string | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
  dietaryPreferences: string[];
  allergies: string[];
  weightUnit: "kg" | "lb";
  energyUnit: "kcal" | "kj";
  exercisePreferences: string[];
  weighInReminderEnabled: boolean;
  weighInReminderTime: string | null;
}) {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase.from("health_profiles").upsert({
    user_id: userId,
    height_cm: values.heightCm,
    starting_weight_kg: values.startingWeightKg,
    current_weight_kg: values.currentWeightKg,
    target_weight_kg: values.targetWeightKg,
    date_of_birth: values.dateOfBirth,
    sex: values.sex,
    activity_level: values.activityLevel,
    dietary_preferences: values.dietaryPreferences,
    allergies: values.allergies,
    weight_unit: values.weightUnit,
    energy_unit: values.energyUnit,
    exercise_preferences: values.exercisePreferences,
    weigh_in_reminder_enabled: values.weighInReminderEnabled,
    weigh_in_reminder_time: values.weighInReminderTime,
  });
  if (error) throw new Error(error.message);

  // Setting/editing current weight here also logs it as today's weight
  // entry, so the weight tracker and the profile never disagree.
  if (values.currentWeightKg != null) {
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("weight_entries").insert({
      user_id: userId,
      entry_date: today,
      weight_kg: values.currentWeightKg,
      notes: "From health profile",
    });
  }

  revalidatePath("/health");
  revalidatePath("/health/weight");
  revalidatePath("/health/goals");
}

export async function saveNutritionGoalsAction(values: {
  goalMode: GoalMode;
  rateKgPerWeek: number | null;
  calorieTarget: number | null;
  proteinTargetG: number | null;
  carbTargetG: number | null;
  fatTargetG: number | null;
  fibreTargetG: number | null;
  waterTargetMl: number | null;
  estimatedTdee: number | null;
}) {
  const { supabase, userId } = await requireUserId();

  if (values.calorieTarget != null && values.calorieTarget < 1000) {
    throw new Error("Calorie target can't be set below 1000 kcal — that's not considered safe to automate.");
  }
  if (values.rateKgPerWeek != null && values.rateKgPerWeek > 1) {
    throw new Error("Target rate can't exceed 1 kg/week.");
  }

  const { error } = await supabase.from("nutrition_goals").upsert({
    user_id: userId,
    goal_mode: values.goalMode,
    rate_kg_per_week: values.rateKgPerWeek,
    calorie_target: values.calorieTarget,
    protein_target_g: values.proteinTargetG,
    carb_target_g: values.carbTargetG,
    fat_target_g: values.fatTargetG,
    fibre_target_g: values.fibreTargetG,
    water_target_ml: values.waterTargetMl,
    estimated_tdee: values.estimatedTdee,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/health");
  revalidatePath("/health/goals");
  revalidatePath("/health/calories");
}

export async function saveHealthPreferencesAction(values: {
  strictGlutenFree: boolean;
  vegetarian: boolean;
  lowFodmap: boolean;
  higherFibre: boolean;
  lowerSaturatedFat: boolean;
  proteinFocused: boolean;
  sharePreferencesWithHousehold: boolean;
}) {
  const { supabase, userId } = await requireUserId();

  const { error } = await supabase.from("health_preferences").upsert({
    user_id: userId,
    strict_gluten_free: values.strictGlutenFree,
    vegetarian: values.vegetarian,
    low_fodmap: values.lowFodmap,
    higher_fibre: values.higherFibre,
    lower_saturated_fat: values.lowerSaturatedFat,
    protein_focused: values.proteinFocused,
    share_preferences_with_household: values.sharePreferencesWithHousehold,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/health");
  revalidatePath("/health/goals");
}

/** Permanently deletes every row of this user's health data across all tables. */
export async function deleteAllHealthDataAction() {
  const { supabase, userId } = await requireUserId();

  const tables = [
    "food_diary_entries", // cascades to food_diary_nutrition_snapshots
    "weight_entries",
    "body_measurements",
    "exercise_entries",
    "water_entries",
    "nutrition_goals",
    "health_preferences",
    "health_profiles",
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
  }

  const { data: photos } = await supabase.from("progress_photos").select("storage_path").eq("user_id", userId);
  if (photos && photos.length > 0) {
    await supabase.storage.from("progress-photos").remove(photos.map((p) => p.storage_path));
  }
  await supabase.from("progress_photos").delete().eq("user_id", userId);

  revalidatePath("/health");
}
