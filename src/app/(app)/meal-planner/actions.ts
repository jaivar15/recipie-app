"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdContext } from "@/lib/households/context";
import { scaleQuantity } from "@/lib/nutrition/format";
import type { Database } from "@/lib/types/database";

type MealType = Database["public"]["Enums"]["meal_type"];

async function ensureMealPlan(householdId: string, weekStart: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("meal_plans")
    .select("id")
    .eq("household_id", householdId)
    .eq("start_date", weekStart)
    .maybeSingle();
  if (existing) return existing.id;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: created, error } = await supabase
    .from("meal_plans")
    .insert({ household_id: householdId, start_date: weekStart, created_by: user?.id ?? null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

export async function addMealPlanEntryAction(
  weekStart: string,
  entry: {
    entryDate: string;
    mealType: MealType;
    recipeId: string | null;
    customTitle: string | null;
    servings: number;
    notes: string;
    memberIds: string[];
  },
) {
  const ctx = await requireHouseholdContext();
  if (!ctx.activeHousehold) throw new Error("No active household");

  const supabase = await createClient();
  const mealPlanId = await ensureMealPlan(ctx.activeHousehold.householdId, weekStart);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: createdEntry, error } = await supabase
    .from("meal_plan_entries")
    .insert({
      meal_plan_id: mealPlanId,
      recipe_id: entry.recipeId,
      custom_title: entry.recipeId ? null : entry.customTitle,
      entry_date: entry.entryDate,
      meal_type: entry.mealType,
      servings: entry.servings,
      notes: entry.notes || null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (entry.memberIds.length > 0) {
    const { error: portionsError } = await supabase.from("meal_plan_member_portions").insert(
      entry.memberIds.map((userId) => ({
        meal_plan_entry_id: createdEntry.id,
        user_id: userId,
        portions: 1,
      })),
    );
    if (portionsError) throw new Error(portionsError.message);
  }

  revalidatePath("/meal-planner");
}

export async function deleteMealPlanEntryAction(entryId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("meal_plan_entries").delete().eq("id", entryId);
  if (error) throw new Error(error.message);
  revalidatePath("/meal-planner");
}

type RecipeIngredientRow = {
  ingredient_name: string;
  quantity: number | null;
  unit: string | null;
  is_section_header: boolean;
};

export async function generateShoppingListFromPlanAction(mealPlanId: string, weekLabel: string) {
  const ctx = await requireHouseholdContext();
  if (!ctx.activeHousehold) throw new Error("No active household");

  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("meal_plan_entries")
    .select(
      "servings, recipes(servings, recipe_ingredients(ingredient_name, quantity, unit, is_section_header))",
    )
    .eq("meal_plan_id", mealPlanId);
  if (error) throw new Error(error.message);

  // Aggregate by (name, unit) — quantities in different units for the same
  // ingredient are kept as separate lines rather than guessing a conversion.
  const aggregated = new Map<
    string,
    { name: string; unit: string | null; quantity: number | null }
  >();
  for (const entry of entries ?? []) {
    const recipe = entry.recipes;
    if (!recipe) continue;
    for (const ing of recipe.recipe_ingredients as RecipeIngredientRow[]) {
      if (ing.is_section_header) continue;
      const scaledQty =
        ing.quantity != null ? scaleQuantity(ing.quantity, recipe.servings, entry.servings) : null;
      const key = `${ing.ingredient_name.toLowerCase()}::${ing.unit ?? ""}`;
      const existing = aggregated.get(key);
      if (existing) {
        existing.quantity =
          existing.quantity != null && scaledQty != null ? existing.quantity + scaledQty : null;
      } else {
        aggregated.set(key, { name: ing.ingredient_name, unit: ing.unit, quantity: scaledQty });
      }
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: list, error: listError } = await supabase
    .from("shopping_lists")
    .insert({
      household_id: ctx.activeHousehold.householdId,
      name: `Shopping — ${weekLabel}`,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();
  if (listError) throw new Error(listError.message);

  const items = Array.from(aggregated.values());
  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("shopping_list_items").insert(
      items.map((item, i) => ({
        shopping_list_id: list.id,
        ingredient_name: item.name,
        quantity: item.quantity,
        unit: item.unit as Database["public"]["Enums"]["measurement_unit"] | null,
        added_by: user?.id ?? null,
        sort_order: i,
      })),
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  revalidatePath("/shopping-lists");
  return list.id;
}
