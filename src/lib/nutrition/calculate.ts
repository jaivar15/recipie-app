import type { Database } from "@/lib/types/database";

export type MeasurementUnit = Database["public"]["Enums"]["measurement_unit"];

export const NUTRIENT_KEYS = [
  "calories_kcal",
  "energy_kj",
  "protein_g",
  "carbohydrate_g",
  "fat_g",
  "saturated_fat_g",
  "fibre_g",
  "sugars_g",
  "sodium_mg",
  "iron_mg",
  "calcium_mg",
  "potassium_mg",
  "magnesium_mg",
  "vitamin_b12_ug",
  "folate_ug",
] as const;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];

export const NUTRIENT_LABELS: Record<NutrientKey, { label: string; unit: string }> = {
  calories_kcal: { label: "Calories", unit: "kcal" },
  energy_kj: { label: "Energy", unit: "kJ" },
  protein_g: { label: "Protein", unit: "g" },
  carbohydrate_g: { label: "Carbohydrates", unit: "g" },
  fat_g: { label: "Fat", unit: "g" },
  saturated_fat_g: { label: "Saturated fat", unit: "g" },
  fibre_g: { label: "Fibre", unit: "g" },
  sugars_g: { label: "Sugars", unit: "g" },
  sodium_mg: { label: "Sodium", unit: "mg" },
  iron_mg: { label: "Iron", unit: "mg" },
  calcium_mg: { label: "Calcium", unit: "mg" },
  potassium_mg: { label: "Potassium", unit: "mg" },
  magnesium_mg: { label: "Magnesium", unit: "mg" },
  vitamin_b12_ug: { label: "Vitamin B12", unit: "µg" },
  folate_ug: { label: "Folate", unit: "µg" },
};

/** The five macros shown in compact nutrition summaries (meal planner, etc). */
export const MACRO_KEYS = ["calories_kcal", "protein_g", "carbohydrate_g", "fat_g", "fibre_g"] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export type NutrientSet = Partial<Record<NutrientKey, number | null>>;

export interface RecipeIngredientForCalc {
  id: string;
  ingredientName: string;
  quantity: number | null;
  unit: MeasurementUnit | null;
  /** Per-100g override values for this specific line, if the cook entered one. */
  nutritionOverride: NutrientSet | null;
  /** Per-100g values from the linked ingredient database record, if any. */
  ingredientNutrition: NutrientSet | null;
  /** grams-per-unit map for the linked ingredient (ml, cup, tsp, etc). */
  conversions: Partial<Record<MeasurementUnit, number>>;
}

export interface NutrientResult {
  /** Sum of known contributions. Null only when no ingredient contributed any value. */
  value: number | null;
  /** False if at least one ingredient's contribution to this nutrient is unknown — `value` is a lower bound, not exact. */
  complete: boolean;
}

export interface RecipeNutritionTotals {
  nutrients: Record<NutrientKey, NutrientResult>;
  /** Ingredient lines that couldn't be resolved to a gram amount at all (missing quantity, unit, or conversion). */
  unresolvedIngredientNames: string[];
}

export type Macros = Record<MacroKey, NutrientResult>;
export const EMPTY_MACROS: Macros = Object.fromEntries(
  MACRO_KEYS.map((k) => [k, { value: null, complete: false }])
) as Macros;

/**
 * Converts a quantity+unit to grams for one ingredient line. Returns null
 * (never a guess) when the amount can't be determined: g/kg convert
 * trivially, anything else requires an ingredient-specific conversion row
 * since density/piece size varies per ingredient.
 */
export function resolveGrams(
  quantity: number | null,
  unit: MeasurementUnit | null,
  conversions: Partial<Record<MeasurementUnit, number>>
): number | null {
  if (quantity == null || unit == null) return null;
  if (unit === "g") return quantity;
  if (unit === "kg") return quantity * 1000;
  const gramsPerUnit = conversions[unit];
  return gramsPerUnit != null ? quantity * gramsPerUnit : null;
}

export function calculateRecipeNutrition(ingredients: RecipeIngredientForCalc[]): RecipeNutritionTotals {
  const sums: Record<NutrientKey, number> = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, 0])) as Record<
    NutrientKey,
    number
  >;
  const hasAnyValue: Record<NutrientKey, boolean> = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, false])
  ) as Record<NutrientKey, boolean>;
  const complete: Record<NutrientKey, boolean> = Object.fromEntries(NUTRIENT_KEYS.map((k) => [k, true])) as Record<
    NutrientKey,
    boolean
  >;
  const unresolvedIngredientNames: string[] = [];

  for (const line of ingredients) {
    const grams = resolveGrams(line.quantity, line.unit, line.conversions);
    if (grams == null) {
      unresolvedIngredientNames.push(line.ingredientName);
      for (const key of NUTRIENT_KEYS) complete[key] = false;
      continue;
    }

    const source = line.nutritionOverride ?? line.ingredientNutrition;
    for (const key of NUTRIENT_KEYS) {
      const per100g = source?.[key];
      if (per100g == null) {
        complete[key] = false;
        continue;
      }
      sums[key] += (grams / 100) * per100g;
      hasAnyValue[key] = true;
    }
  }

  const nutrients = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      { value: hasAnyValue[key] ? Math.round(sums[key] * 100) / 100 : null, complete: complete[key] },
    ])
  ) as Record<NutrientKey, NutrientResult>;

  return { nutrients, unresolvedIngredientNames };
}

export function divideNutrients(totals: Record<NutrientKey, NutrientResult>, divisor: number): Record<NutrientKey, NutrientResult> {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const n = totals[key];
      return [
        key,
        { value: n.value != null && divisor > 0 ? Math.round((n.value / divisor) * 100) / 100 : null, complete: n.complete },
      ];
    })
  ) as Record<NutrientKey, NutrientResult>;
}

export function multiplyNutrients(totals: Record<NutrientKey, NutrientResult>, factor: number): Record<NutrientKey, NutrientResult> {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const n = totals[key];
      return [key, { value: n.value != null ? Math.round(n.value * factor * 100) / 100 : null, complete: n.complete }];
    })
  ) as Record<NutrientKey, NutrientResult>;
}
