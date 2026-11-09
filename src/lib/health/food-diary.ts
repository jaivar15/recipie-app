import {
  calculateRecipeNutrition,
  multiplyNutrients,
  MACRO_KEYS,
  type MacroKey,
  type NutrientKey,
  type NutrientResult,
  type NutrientSet,
  type RecipeIngredientForCalc,
} from "@/lib/nutrition/calculate";

/**
 * Computes the nutrition for a logged quantity of a recipe: scales the
 * recipe's full-batch totals down to the number of servings actually
 * logged (e.g. 1.5 servings of a 4-serving, 520kcal/32g-protein recipe
 * scales the per-serving figures, not the batch total).
 */
export function computeRecipeEntryNutrition(
  ingredients: RecipeIngredientForCalc[],
  recipeServings: number,
  loggedServings: number
): Record<NutrientKey, NutrientResult> {
  const totals = calculateRecipeNutrition(ingredients).nutrients;
  const factor = recipeServings > 0 ? loggedServings / recipeServings : 0;
  return multiplyNutrients(totals, factor);
}

/** Scales an ingredient's per-100g nutrition to the grams actually logged. */
export function computeIngredientEntryNutrition(
  per100g: NutrientSet,
  grams: number
): Record<NutrientKey, NutrientResult> {
  const fake: RecipeIngredientForCalc = {
    id: "ingredient",
    ingredientName: "ingredient",
    quantity: grams,
    unit: "g",
    nutritionOverride: null,
    ingredientNutrition: per100g,
    conversions: {},
  };
  return calculateRecipeNutrition([fake]).nutrients;
}

/** Flattens a `Record<NutrientKey, NutrientResult>` into the snapshot table's row shape. */
export function toSnapshotRow(nutrients: Record<NutrientKey, NutrientResult>) {
  const macroComplete = Object.fromEntries(MACRO_KEYS.map((k) => [k, nutrients[k].complete])) as Record<
    MacroKey,
    boolean
  >;
  return {
    calories_kcal: nutrients.calories_kcal.value,
    protein_g: nutrients.protein_g.value,
    carbohydrate_g: nutrients.carbohydrate_g.value,
    fat_g: nutrients.fat_g.value,
    saturated_fat_g: nutrients.saturated_fat_g.value,
    fibre_g: nutrients.fibre_g.value,
    sugars_g: nutrients.sugars_g.value,
    sodium_mg: nutrients.sodium_mg.value,
    iron_mg: nutrients.iron_mg.value,
    calcium_mg: nutrients.calcium_mg.value,
    potassium_mg: nutrients.potassium_mg.value,
    magnesium_mg: nutrients.magnesium_mg.value,
    vitamin_b12_ug: nutrients.vitamin_b12_ug.value,
    folate_ug: nutrients.folate_ug.value,
    calories_complete: macroComplete.calories_kcal,
    protein_complete: macroComplete.protein_g,
    carbs_complete: macroComplete.carbohydrate_g,
    fat_complete: macroComplete.fat_g,
    fibre_complete: macroComplete.fibre_g,
  };
}

/** Builds the five macro values (with completeness) from a stored snapshot row, for display. */
export function macrosFromSnapshotRow(row: {
  calories_kcal: number | null;
  protein_g: number | null;
  carbohydrate_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  calories_complete: boolean;
  protein_complete: boolean;
  carbs_complete: boolean;
  fat_complete: boolean;
  fibre_complete: boolean;
} | null): Record<MacroKey, NutrientResult> {
  if (!row) {
    return Object.fromEntries(MACRO_KEYS.map((k) => [k, { value: null, complete: false }])) as Record<
      MacroKey,
      NutrientResult
    >;
  }
  return {
    calories_kcal: { value: row.calories_kcal, complete: row.calories_complete },
    protein_g: { value: row.protein_g, complete: row.protein_complete },
    carbohydrate_g: { value: row.carbohydrate_g, complete: row.carbs_complete },
    fat_g: { value: row.fat_g, complete: row.fat_complete },
    fibre_g: { value: row.fibre_g, complete: row.fibre_complete },
  };
}

/** Sums per-entry macro results into a day (or any group) total — unknown stays unknown, never 0. */
export function sumMacros(entries: Record<MacroKey, NutrientResult>[]): Record<MacroKey, NutrientResult> {
  return Object.fromEntries(
    MACRO_KEYS.map((key) => {
      const known = entries.filter((e) => e[key].value != null);
      if (known.length === 0) return [key, { value: null, complete: false }];
      const value = known.reduce((sum, e) => sum + (e[key].value ?? 0), 0);
      const complete = entries.every((e) => e[key].value != null && e[key].complete);
      return [key, { value, complete }];
    })
  ) as Record<MacroKey, NutrientResult>;
}
