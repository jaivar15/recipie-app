import { describe, expect, it } from "vitest";
import {
  calculateRecipeNutrition,
  divideNutrients,
  multiplyNutrients,
  resolveReferenceAmount,
  type RecipeIngredientForCalc,
} from "./calculate";

describe("resolveReferenceAmount", () => {
  it("converts g and kg trivially for a g-based ingredient (the default)", () => {
    expect(resolveReferenceAmount(250, "g", {})).toBe(250);
    expect(resolveReferenceAmount(1.5, "kg", {})).toBe(1500);
  });

  it("converts ml and l trivially for an ml-based ingredient", () => {
    expect(resolveReferenceAmount(250, "ml", {}, "ml")).toBe(250);
    expect(resolveReferenceAmount(1.5, "l", {}, "ml")).toBe(1500);
  });

  it("does NOT treat g/kg as trivial for an ml-based ingredient, or ml/l as trivial for a g-based one", () => {
    expect(resolveReferenceAmount(250, "g", {}, "ml")).toBeNull();
    expect(resolveReferenceAmount(250, "ml", {})).toBeNull();
  });

  it("uses an ingredient-specific conversion for other units", () => {
    expect(resolveReferenceAmount(2, "cup", { cup: 120 })).toBe(240);
    // For an ml-based ingredient the same conversion map is read as ml-per-unit.
    expect(resolveReferenceAmount(2, "cup", { cup: 240 }, "ml")).toBe(480);
  });

  it("never guesses a conversion — returns null when none is known", () => {
    expect(resolveReferenceAmount(2, "cup", {})).toBeNull();
    expect(resolveReferenceAmount(2, "piece", { cup: 120 })).toBeNull();
  });

  it("returns null when quantity or unit is missing", () => {
    expect(resolveReferenceAmount(null, "g", {})).toBeNull();
    expect(resolveReferenceAmount(2, null, {})).toBeNull();
  });
});

describe("calculateRecipeNutrition — ml-based ingredients (e.g. milk)", () => {
  it("scales against millilitres, not grams, for an ml-based ingredient at the default 100ml reference", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Milk",
        quantity: 250,
        unit: "ml",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 42, protein_g: 3.4 },
        nutritionReferenceUnit: "ml",
        conversions: {},
      },
    ];
    const { nutrients } = calculateRecipeNutrition(ingredients);
    expect(nutrients.calories_kcal.value).toBe(105);
    expect(nutrients.protein_g.value).toBe(8.5);
  });

  it("scales against a non-100 reference amount, e.g. a product labelled per 250ml", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Milk (labelled per 250ml serving)",
        quantity: 500,
        unit: "ml",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 160, protein_g: 8 },
        nutritionReferenceAmount: 250,
        nutritionReferenceUnit: "ml",
        conversions: {},
      },
    ];
    const { nutrients } = calculateRecipeNutrition(ingredients);
    // 500ml is 2x the 250ml the label is per, so totals double.
    expect(nutrients.calories_kcal.value).toBe(320);
    expect(nutrients.protein_g.value).toBe(16);
  });

  it("defaults to a 100g reference when a line omits nutritionReferenceAmount/Unit, for backward compatibility", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Flour",
        quantity: 200,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 350 },
        conversions: {},
      },
    ];
    const { nutrients } = calculateRecipeNutrition(ingredients);
    expect(nutrients.calories_kcal.value).toBe(700);
  });
});

describe("calculateRecipeNutrition — never fabricates", () => {
  it("sums known values and marks the nutrient complete", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Flour",
        quantity: 200,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 350, protein_g: 10 },
        conversions: {},
      },
    ];
    const { nutrients, unresolvedIngredientNames } = calculateRecipeNutrition(ingredients);
    expect(nutrients.calories_kcal).toEqual({ value: 700, complete: true });
    expect(nutrients.protein_g).toEqual({ value: 20, complete: true });
    expect(unresolvedIngredientNames).toEqual([]);
  });

  it("marks a nutrient incomplete (not zero) when any ingredient's contribution is unknown", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Flour",
        quantity: 200,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 350 },
        conversions: {},
      },
      {
        id: "2",
        ingredientName: "Mystery spice blend",
        quantity: 5,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: null, // not in the ingredient database
        conversions: {},
      },
    ];
    const { nutrients } = calculateRecipeNutrition(ingredients);
    // Known contribution is still summed as a lower bound...
    expect(nutrients.calories_kcal.value).toBe(700);
    // ...but flagged incomplete rather than presented as exact.
    expect(nutrients.calories_kcal.complete).toBe(false);
  });

  it("leaves value null (never 0) when nothing contributed to a nutrient", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Water",
        quantity: 200,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: {},
        conversions: {},
      },
    ];
    const { nutrients } = calculateRecipeNutrition(ingredients);
    expect(nutrients.protein_g.value).toBeNull();
    expect(nutrients.protein_g.complete).toBe(false);
  });

  it("lists ingredients whose quantity can't be resolved to grams at all", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "A pinch of salt",
        quantity: null,
        unit: null,
        nutritionOverride: null,
        ingredientNutrition: { sodium_mg: 38000 },
        conversions: {},
      },
    ];
    const { nutrients, unresolvedIngredientNames } = calculateRecipeNutrition(ingredients);
    expect(unresolvedIngredientNames).toEqual(["A pinch of salt"]);
    expect(nutrients.sodium_mg.value).toBeNull();
    expect(nutrients.sodium_mg.complete).toBe(false);
  });

  it("prefers a per-line nutrition override over the ingredient database value", () => {
    const ingredients: RecipeIngredientForCalc[] = [
      {
        id: "1",
        ingredientName: "Custom brand flour",
        quantity: 100,
        unit: "g",
        nutritionOverride: { calories_kcal: 400 },
        ingredientNutrition: { calories_kcal: 350 },
        conversions: {},
      },
    ];
    const { nutrients } = calculateRecipeNutrition(ingredients);
    expect(nutrients.calories_kcal.value).toBe(400);
  });
});

describe("divideNutrients / multiplyNutrients", () => {
  it("scales values and preserves completeness", () => {
    const totals = calculateRecipeNutrition([
      {
        id: "1",
        ingredientName: "Flour",
        quantity: 400,
        unit: "g",
        nutritionOverride: null,
        ingredientNutrition: { calories_kcal: 350 },
        conversions: {},
      },
    ]).nutrients;

    const perServing = divideNutrients(totals, 4);
    expect(perServing.calories_kcal.value).toBe(350);
    expect(perServing.calories_kcal.complete).toBe(true);

    const doubled = multiplyNutrients(totals, 2);
    expect(doubled.calories_kcal.value).toBe(2800);
  });

  it("returns null rather than dividing by zero", () => {
    const totals = calculateRecipeNutrition([]).nutrients;
    const result = divideNutrients(totals, 0);
    expect(result.calories_kcal.value).toBeNull();
  });
});
