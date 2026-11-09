import type { Database } from "@/lib/types/database";

export type Sex = Database["public"]["Enums"]["biological_sex"];
export type ActivityLevel = Database["public"]["Enums"]["activity_level"];
export type GoalMode = Database["public"]["Enums"]["nutrition_goal_mode"];

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const ACTIVITY_LEVEL_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Sedentary (little or no exercise)",
  lightly_active: "Lightly active (1–3 days/week)",
  moderately_active: "Moderately active (3–5 days/week)",
  very_active: "Very active (6–7 days/week)",
  extra_active: "Extra active (physical job or 2x/day training)",
};

/** Roughly 7700 kcal per kg of body fat — a widely-cited estimate, not an exact figure. */
const KCAL_PER_KG_FAT = 7700;

/** Commonly cited safety floors; calorie_target also has a hard DB floor of 1000. */
const CALORIE_FLOOR = { male: 1500, female: 1200, other: 1350, prefer_not_to_say: 1350 } as const;
export const MAX_SAFE_RATE_KG_PER_WEEK = 1.0;

export function calculateAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Mifflin-St Jeor basal metabolic rate estimate. This is an estimate, not
 * a measurement — callers should label it as such in the UI.
 */
export function estimateBMR({
  weightKg,
  heightCm,
  age,
  sex,
}: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex | null;
}): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") return Math.round(base + 5);
  if (sex === "female") return Math.round(base - 161);
  // No sex specified: average of the male/female offset rather than guessing.
  return Math.round(base + (5 + -161) / 2);
}

export function estimateTDEE(bmr: number, activityLevel: ActivityLevel | null): number {
  const multiplier = activityLevel ? ACTIVITY_MULTIPLIERS[activityLevel] : ACTIVITY_MULTIPLIERS.sedentary;
  return Math.round(bmr * multiplier);
}

export interface CalorieTargetResult {
  calorieTarget: number;
  warning: string | null;
}

/**
 * Derives a calorie target from an estimated TDEE and a goal. Clamps the
 * requested rate to a safe maximum and never proposes a target below a
 * sex-aware floor — "custom" mode skips all of this and trusts the
 * user-entered number as-is.
 */
export function deriveCalorieTarget({
  tdee,
  goalMode,
  rateKgPerWeek,
  sex,
}: {
  tdee: number;
  goalMode: GoalMode;
  rateKgPerWeek: number | null;
  sex: Sex | null;
}): CalorieTargetResult {
  if (goalMode === "maintenance") return { calorieTarget: tdee, warning: null };

  const floor = CALORIE_FLOOR[sex ?? "prefer_not_to_say"];
  const requestedRate = rateKgPerWeek ?? 0.5;
  const clampedRate = Math.min(Math.abs(requestedRate), MAX_SAFE_RATE_KG_PER_WEEK);
  const dailyCalorieShift = Math.round((clampedRate * KCAL_PER_KG_FAT) / 7);

  const raw = goalMode === "loss" ? tdee - dailyCalorieShift : tdee + dailyCalorieShift;
  let warning: string | null = null;
  if (requestedRate > MAX_SAFE_RATE_KG_PER_WEEK) {
    warning = `Capped at ${MAX_SAFE_RATE_KG_PER_WEEK} kg/week — faster rates aren't considered safe to automate.`;
  }

  if (goalMode === "loss" && raw < floor) {
    return {
      calorieTarget: floor,
      warning: `Raised to ${floor} kcal — going lower isn't recommended without professional guidance.`,
    };
  }

  return { calorieTarget: Math.max(1000, raw), warning };
}

export function kgToLb(kg: number): number {
  return kg * 2.20462;
}

export function lbToKg(lb: number): number {
  return lb / 2.20462;
}

export function formatWeight(kg: number, unit: "kg" | "lb"): string {
  const value = unit === "lb" ? kgToLb(kg) : kg;
  return `${Math.round(value * 10) / 10} ${unit}`;
}

/** Simple moving average over the most recent `windowSize` values, oldest-first input. */
export function rollingAverage(values: number[], windowSize: number): (number | null)[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    if (window.length === 0) return null;
    return window.reduce((sum, v) => sum + v, 0) / window.length;
  });
}

export interface WeightChangeSummary {
  totalChangeKg: number;
  percentChange: number | null;
  trend: "down" | "up" | "flat";
}

export function summarizeWeightChange(startingKg: number, latestKg: number): WeightChangeSummary {
  const totalChangeKg = latestKg - startingKg;
  const percentChange = startingKg > 0 ? (totalChangeKg / startingKg) * 100 : null;
  const trend = Math.abs(totalChangeKg) < 0.1 ? "flat" : totalChangeKg < 0 ? "down" : "up";
  return { totalChangeKg, percentChange, trend };
}
