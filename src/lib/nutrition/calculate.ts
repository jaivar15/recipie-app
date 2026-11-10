import type { Database } from "@/lib/types/database";

export type MeasurementUnit = Database["public"]["Enums"]["measurement_unit"];
/** The unit an ingredient's stored nutrition is "per" of — grams for most foods, millilitres for liquids like milk or oil. */
export type NutritionReferenceUnit = "g" | "ml";

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
export const MACRO_KEYS = [
  "calories_kcal",
  "protein_g",
  "carbohydrate_g",
  "fat_g",
  "fibre_g",
] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export type NutrientSet = Partial<Record<NutrientKey, number | null>>;

export interface RecipeIngredientForCalc {
  id: string;
  ingredientName: string;
  quantity: number | null;
  unit: MeasurementUnit | null;
  /** Override values for this specific line, if the cook entered one — same reference amount/unit as ingredientNutrition. */
  nutritionOverride: NutrientSet | null;
  /** Values from the linked ingredient database record, per nutritionReferenceAmount of nutritionReferenceUnit, if any. */
  ingredientNutrition: NutrientSet | null;
  /** The amount ingredientNutrition/nutritionOverride are "per" of — e.g. 100, or 250 for a per-250ml product. Defaults to 100 when omitted. */
  nutritionReferenceAmount?: number;
  /** Which unit nutritionReferenceAmount is in. Defaults to "g" when omitted, for callers not yet passing it. */
  nutritionReferenceUnit?: NutritionReferenceUnit;
  /** Reference-unit-per-measurement-unit map for the linked ingredient (ml, cup, tsp, etc) — grams if nutritionReferenceUnit is "g", millilitres if "ml". */
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
  MACRO_KEYS.map((k) => [k, { value: null, complete: false }]),
) as Macros;

/**
 * Converts a quantity+unit to the ingredient's reference unit (grams for a
 * "g"-based ingredient, millilitres for an "ml" one) for one recipe line.
 * Returns null (never a guess) when the amount can't be determined: the
 * reference unit itself and its x1000 multiple (g/kg, or ml/l) convert
 * trivially, anything else requires an ingredient-specific conversion row
 * since density/piece size varies per ingredient.
 */
export function resolveReferenceAmount(
  quantity: number | null,
  unit: MeasurementUnit | null,
  conversions: Partial<Record<MeasurementUnit, number>>,
  referenceUnit: NutritionReferenceUnit = "g",
): number | null {
  if (quantity == null || unit == null) return null;
  const [trivialUnit, trivialMultipleUnit] = referenceUnit === "ml" ? (["ml", "l"] as const) : (["g", "kg"] as const);
  if (unit === trivialUnit) return quantity;
  if (unit === trivialMultipleUnit) return quantity * 1000;
  const perUnit = conversions[unit];
  return perUnit != null ? quantity * perUnit : null;
}

export function calculateRecipeNutrition(
  ingredients: RecipeIngredientForCalc[],
): RecipeNutritionTotals {
  const sums: Record<NutrientKey, number> = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, 0]),
  ) as Record<NutrientKey, number>;
  const hasAnyValue: Record<NutrientKey, boolean> = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, false]),
  ) as Record<NutrientKey, boolean>;
  const complete: Record<NutrientKey, boolean> = Object.fromEntries(
    NUTRIENT_KEYS.map((k) => [k, true]),
  ) as Record<NutrientKey, boolean>;
  const unresolvedIngredientNames: string[] = [];

  for (const line of ingredients) {
    const amount = resolveReferenceAmount(line.quantity, line.unit, line.conversions, line.nutritionReferenceUnit);
    if (amount == null) {
      unresolvedIngredientNames.push(line.ingredientName);
      for (const key of NUTRIENT_KEYS) complete[key] = false;
      continue;
    }

    const referenceAmount = line.nutritionReferenceAmount ?? 100;
    const source = line.nutritionOverride ?? line.ingredientNutrition;
    for (const key of NUTRIENT_KEYS) {
      const perReference = source?.[key];
      if (perReference == null) {
        complete[key] = false;
        continue;
      }
      sums[key] += (amount / referenceAmount) * perReference;
      hasAnyValue[key] = true;
    }
  }

  const nutrients = Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      {
        value: hasAnyValue[key] ? Math.round(sums[key] * 100) / 100 : null,
        complete: complete[key],
      },
    ]),
  ) as Record<NutrientKey, NutrientResult>;

  return { nutrients, unresolvedIngredientNames };
}

export function divideNutrients(
  totals: Record<NutrientKey, NutrientResult>,
  divisor: number,
): Record<NutrientKey, NutrientResult> {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const n = totals[key];
      return [
        key,
        {
          value:
            n.value != null && divisor > 0 ? Math.round((n.value / divisor) * 100) / 100 : null,
          complete: n.complete,
        },
      ];
    }),
  ) as Record<NutrientKey, NutrientResult>;
}

export function multiplyNutrients(
  totals: Record<NutrientKey, NutrientResult>,
  factor: number,
): Record<NutrientKey, NutrientResult> {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const n = totals[key];
      return [
        key,
        {
          value: n.value != null ? Math.round(n.value * factor * 100) / 100 : null,
          complete: n.complete,
        },
      ];
    }),
  ) as Record<NutrientKey, NutrientResult>;
}
