import { describe, expect, it } from "vitest";
import {
  computeIngredientEntryNutrition,
  computeRecipeEntryNutrition,
  macrosFromSnapshotRow,
  sumMacros,
  toSnapshotRow,
} from "./food-diary";
import type { RecipeIngredientForCalc } from "@/lib/nutrition/calculate";

describe("computeRecipeEntryNutrition — portion scaling", () => {
  it("scales a 4-serving recipe down to 1.5 logged servings proportionally", () => {
    // A single ingredient sized so the full 4-serving batch totals
    // 2080 kcal / 128g protein — i.e. 520 kcal / 32g protein per serving,
    // matching the spec's worked example (1.5 servings -> 780 kcal / 48g).
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Everything",
        quantity: 1000,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 208, protein_g: 12.8 },
        conversions: {},
      },
    ];
    const result = computeRecipeEntryNutrition(ingredients, 4, 1.5);
    expect(result.calories_kcal.value).toBe(780);
    expect(result.protein_g.value).toBe(48);
  });

  it("returns zeroed nutrition without dividing by zero when the recipe has no servings", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "X",
        quantity: 100,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 100 },
        conversions: {},
      },
    ];
    const result = computeRecipeEntryNutrition(ingredients, 0, 1);
    expect(result.calories_kcal.value).toBe(0);
  });
});

describe("computeIngredientEntryNutrition", () => {
  it("scales per-100g nutrition to the logged gram quantity", () => {
    const result = computeIngredientEntryNutrition({ calories_kcal: 50, protein_g: 5 }, 200);
    expect(result.calories_kcal.value).toBe(100);
    expect(result.protein_g.value).toBe(10);
  });
});

describe("snapshot round-trip", () => {
  it("toSnapshotRow / macrosFromSnapshotRow preserve the five macro values and their completeness", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Known",
        quantity: 100,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 200, protein_g: 10, carbohydrate_g: 20, fat_g: 5, fibre_g: 2 },
        conversions: {},
      },
      {
        id: "2",
        ingredientName: "Unknown nutrition",
        quantity: 50,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: null,
        conversions: {},
      },
    ];
    const nutrients = computeRecipeEntryNutrition(ingredients, 1, 1);
    const row = toSnapshotRow(nutrients);

    // Known contribution is summed as a lower bound, but flagged incomplete
    // because the second ingredient's nutrition is unknown.
    expect(row.calories_kcal).toBe(200);
    expect(row.calories_complete).toBe(false);

    const macros = macrosFromSnapshotRow(row);
    expect(macros.calories_kcal).toEqual({ value: 200, complete: false });
    expect(macros.protein_g).toEqual({ value: 10, complete: false });
  });

  it("macrosFromSnapshotRow returns unknown (not zero) for a missing snapshot", () => {
    const macros = macrosFromSnapshotRow(null);
    expect(macros.calories_kcal).toEqual({ value: null, complete: false });
  });
});

describe("sumMacros", () => {
  it("sums known values across entries and marks the total incomplete if any entry is", () => {
    const entries = [
      { calories_kcal: { value: 300, complete: true }, protein_g: { value: 20, complete: true }, carbohydrate_g: { value: 30, complete: true }, fat_g: { value: 10, complete: true }, fibre_g: { value: 5, complete: true } },
      { calories_kcal: { value: 200, complete: false }, protein_g: { value: 15, complete: false }, carbohydrate_g: { value: 20, complete: false }, fat_g: { value: 8, complete: false }, fibre_g: { value: 3, complete: false } },
    ];
    const total = sumMacros(entries);
    expect(total.calories_kcal.value).toBe(500);
    expect(total.calories_kcal.complete).toBe(false);
  });

  it("returns null (not zero) for a macro nothing contributed to", () => {
    const total = sumMacros([]);
    expect(total.calories_kcal).toEqual({ value: null, complete: false });
  });
});
