"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import {
  MACRO_KEYS,
  NUTRIENT_KEYS,
  type NutrientKey,
  type NutrientResult,
  type NutrientSet,
  type RecipeIngredientForCalc,
} from "@/lib/nutrition/calculate";
import { computeIngredientEntryNutrition, computeRecipeEntryNutrition, toSnapshotRow } from "@/lib/health/food-diary";

type FoodDiaryMealType = Database["public"]["Enums"]["food_diary_meal_type"];

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

type AddFoodDiaryEntryInput =
  | {
      sourceType: "recipe";
      recipeId: string;
      servings: number;
      entryDate: string;
      mealType: FoodDiaryMealType;
      notes?: string;
    }
  | {
      sourceType: "ingredient";
      ingredientId: string;
      quantityGrams: number;
      entryDate: string;
      mealType: FoodDiaryMealType;
      notes?: string;
    }
  | {
      sourceType: "custom";
      customFoodName: string;
      entryDate: string;
      mealType: FoodDiaryMealType;
      notes?: string;
      nutrition: Partial<Record<(typeof MACRO_KEYS)[number], number>>;
    };

/**
 * Computes the nutrition snapshot for a recipe/ingredient/custom entry from
 * *current* data, then inserts the entry + its immutable snapshot. Used both
 * for fresh log entries and for the "repeat/copy" quick actions — a copy
 * always recomputes from the source's current nutrition rather than cloning
 * the old snapshot, since it's a brand-new log event.
 */
async function insertEntryWithSnapshot(
  supabase: SupabaseClient<Database>,
  userId: string,
  entryDate: string,
  mealType: FoodDiaryMealType,
  notes: string | null,
  source:
    | { sourceType: "recipe"; recipeId: string; servings: number }
    | { sourceType: "ingredient"; ingredientId: string; quantityGrams: number }
    | { sourceType: "custom"; customFoodName: string; nutrition: Partial<Record<(typeof MACRO_KEYS)[number], number>> }
) {
  let nutrients: Record<NutrientKey, NutrientResult>;

  if (source.sourceType === "recipe") {
    const { data: recipe, error: recipeError } = await supabase
      .from("recipes")
      .select(
        "servings, recipe_ingredients(ingredient_name, quantity, unit, nutrition_override, ingredients(ingredient_nutrition(calories_kcal, energy_kj, protein_g, carbohydrate_g, fat_g, saturated_fat_g, fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg, magnesium_mg, vitamin_b12_ug, folate_ug), ingredient_measurement_conversions(unit, grams_per_unit)))"
      )
      .eq("id", source.recipeId)
      .single();
    if (recipeError || !recipe) throw new Error("Recipe not found");

    const inputs: RecipeIngredientForCalc[] = recipe.recipe_ingredients.map((ing) => ({
      id: ing.ingredient_name,
      ingredientName: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      nutritionOverride: ing.nutrition_override as NutrientSet | null,
      ingredientNutrition: ing.ingredients?.ingredient_nutrition ?? null,
      conversions: Object.fromEntries(
        (ing.ingredients?.ingredient_measurement_conversions ?? []).map((c) => [c.unit, c.grams_per_unit])
      ),
    }));
    nutrients = computeRecipeEntryNutrition(inputs, recipe.servings, source.servings);
  } else if (source.sourceType === "ingredient") {
    const { data: ingredient, error: ingredientError } = await supabase
      .from("ingredients")
      .select(
        "ingredient_nutrition(calories_kcal, energy_kj, protein_g, carbohydrate_g, fat_g, saturated_fat_g, fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg, magnesium_mg, vitamin_b12_ug, folate_ug)"
      )
      .eq("id", source.ingredientId)
      .single();
    if (ingredientError || !ingredient) throw new Error("Ingredient not found");
    nutrients = computeIngredientEntryNutrition(ingredient.ingredient_nutrition ?? {}, source.quantityGrams);
  } else {
    // Custom entries only collect the five macro keys — every other nutrient
    // the snapshot table tracks stays unknown (null), never a guessed 0.
    nutrients = Object.fromEntries(
      NUTRIENT_KEYS.map((key) => {
        const isMacro = (MACRO_KEYS as readonly string[]).includes(key);
        const value = isMacro ? source.nutrition[key as (typeof MACRO_KEYS)[number]] ?? null : null;
        return [key, { value, complete: value != null }];
      })
    ) as Record<NutrientKey, NutrientResult>;
  }

  const { data: entry, error: entryError } = await supabase
    .from("food_diary_entries")
    .insert({
      user_id: userId,
      entry_date: entryDate,
      meal_type: mealType,
      source_type: source.sourceType,
      recipe_id: source.sourceType === "recipe" ? source.recipeId : null,
      ingredient_id: source.sourceType === "ingredient" ? source.ingredientId : null,
      custom_food_name: source.sourceType === "custom" ? source.customFoodName : null,
      servings: source.sourceType === "recipe" ? source.servings : null,
      quantity_grams: source.sourceType === "ingredient" ? source.quantityGrams : null,
      notes,
    })
    .select("id")
    .single();
  if (entryError || !entry) throw new Error(entryError?.message ?? "Failed to log entry");

  const { error: snapshotError } = await supabase.from("food_diary_nutrition_snapshots").insert({
    food_diary_entry_id: entry.id,
    ...toSnapshotRow(nutrients),
  });
  if (snapshotError) {
    await supabase.from("food_diary_entries").delete().eq("id", entry.id);
    throw new Error(snapshotError.message);
  }

  return entry.id;
}

export async function addFoodDiaryEntryAction(input: AddFoodDiaryEntryInput) {
  const { supabase, userId } = await requireUserId();

  if (input.sourceType === "recipe") {
    await insertEntryWithSnapshot(supabase, userId, input.entryDate, input.mealType, input.notes || null, {
      sourceType: "recipe",
      recipeId: input.recipeId,
      servings: input.servings,
    });
  } else if (input.sourceType === "ingredient") {
    await insertEntryWithSnapshot(supabase, userId, input.entryDate, input.mealType, input.notes || null, {
      sourceType: "ingredient",
      ingredientId: input.ingredientId,
      quantityGrams: input.quantityGrams,
    });
  } else {
    await insertEntryWithSnapshot(supabase, userId, input.entryDate, input.mealType, input.notes || null, {
      sourceType: "custom",
      customFoodName: input.customFoodName,
      nutrition: input.nutrition,
    });
  }

  revalidatePath("/health/diary");
  revalidatePath("/health/calories");
  revalidatePath("/health");
}

export async function deleteFoodDiaryEntryAction(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("food_diary_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/health/diary");
  revalidatePath("/health/calories");
  revalidatePath("/health");
}

/** "Copy to today" / "copy previous meal" quick action — recomputes nutrition fresh. */
export async function copyFoodDiaryEntryAction(id: string, targetDate: string, targetMealType?: FoodDiaryMealType) {
  const { supabase, userId } = await requireUserId();
  const { data: original, error } = await supabase
    .from("food_diary_entries")
    .select("meal_type, source_type, recipe_id, ingredient_id, custom_food_name, servings, quantity_grams, notes")
    .eq("id", id)
    .single();
  if (error || !original) throw new Error("Entry not found");

  const mealType = targetMealType ?? original.meal_type;

  if (original.source_type === "recipe" && original.recipe_id && original.servings != null) {
    await insertEntryWithSnapshot(supabase, userId, targetDate, mealType, original.notes, {
      sourceType: "recipe",
      recipeId: original.recipe_id,
      servings: Number(original.servings),
    });
  } else if (original.source_type === "ingredient" && original.ingredient_id && original.quantity_grams != null) {
    await insertEntryWithSnapshot(supabase, userId, targetDate, mealType, original.notes, {
      sourceType: "ingredient",
      ingredientId: original.ingredient_id,
      quantityGrams: Number(original.quantity_grams),
    });
  } else if (original.source_type === "custom" && original.custom_food_name) {
    const { data: snapshot } = await supabase
      .from("food_diary_nutrition_snapshots")
      .select("calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g")
      .eq("food_diary_entry_id", id)
      .maybeSingle();
    await insertEntryWithSnapshot(supabase, userId, targetDate, mealType, original.notes, {
      sourceType: "custom",
      customFoodName: original.custom_food_name,
      nutrition: {
        calories_kcal: snapshot?.calories_kcal ?? undefined,
        protein_g: snapshot?.protein_g ?? undefined,
        carbohydrate_g: snapshot?.carbohydrate_g ?? undefined,
        fat_g: snapshot?.fat_g ?? undefined,
        fibre_g: snapshot?.fibre_g ?? undefined,
      },
    });
  }

  revalidatePath("/health/diary");
  revalidatePath("/health/calories");
  revalidatePath("/health");
}

/** "Repeat yesterday" (or any day) — copies every entry from one date to another, fresh-computed. */
export async function repeatDayAction(sourceDate: string, targetDate: string) {
  const { supabase } = await requireUserId();
  const { data: entries } = await supabase.from("food_diary_entries").select("id").eq("entry_date", sourceDate);
  for (const e of entries ?? []) {
    await copyFoodDiaryEntryAction(e.id, targetDate);
  }
}
