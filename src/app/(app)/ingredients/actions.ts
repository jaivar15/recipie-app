"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ingredientFormSchema, type IngredientFormValues } from "@/lib/validations/ingredient";

function toRpcPayload(values: IngredientFormValues) {
  const n = values.nutrition;
  return {
    ingredient: {
      visibility: values.visibility,
      household_id: values.visibility === "household" ? values.household_id : null,
      name: values.name,
      alternative_names: values.alternative_names,
      food_category: values.food_category ?? "",
      state: values.state ?? "",
      brand: values.brand ?? "",
      allergens: values.allergens,
      notes: values.notes ?? "",
    },
    nutrition: {
      source_id: n.source_id ?? "",
      source_detail: n.source_detail ?? "",
      energy_kj: n.energy_kj ?? "",
      calories_kcal: n.calories_kcal ?? "",
      protein_g: n.protein_g ?? "",
      carbohydrate_g: n.carbohydrate_g ?? "",
      fat_g: n.fat_g ?? "",
      saturated_fat_g: n.saturated_fat_g ?? "",
      fibre_g: n.fibre_g ?? "",
      sugars_g: n.sugars_g ?? "",
      sodium_mg: n.sodium_mg ?? "",
      iron_mg: n.iron_mg ?? "",
      calcium_mg: n.calcium_mg ?? "",
      potassium_mg: n.potassium_mg ?? "",
      magnesium_mg: n.magnesium_mg ?? "",
      vitamin_b12_ug: n.vitamin_b12_ug ?? "",
      folate_ug: n.folate_ug ?? "",
    },
    conversions: values.conversions.map((c) => ({ unit: c.unit, grams_per_unit: c.grams_per_unit })),
  };
}

export async function createIngredientAction(raw: IngredientFormValues) {
  const values = ingredientFormSchema.parse(raw);
  const payload = toRpcPayload(values);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_ingredient", {
    p_ingredient: payload.ingredient,
    p_nutrition: payload.nutrition,
    p_conversions: payload.conversions,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/ingredients");
  redirect(`/ingredients/${data}/edit`);
}

export async function updateIngredientAction(ingredientId: string, raw: IngredientFormValues) {
  const values = ingredientFormSchema.parse(raw);
  const payload = toRpcPayload(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_ingredient", {
    p_ingredient_id: ingredientId,
    p_ingredient: payload.ingredient,
    p_nutrition: payload.nutrition,
    p_conversions: payload.conversions,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/ingredients");
  revalidatePath(`/ingredients/${ingredientId}/edit`);
  redirect("/ingredients");
}

export async function deleteIngredientAction(ingredientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ingredients").delete().eq("id", ingredientId);
  if (error) throw new Error(error.message);
  revalidatePath("/ingredients");
  redirect("/ingredients");
}

export async function searchIngredientsAction(query: string, householdId: string | null) {
  const supabase = await createClient();
  let builder = supabase
    .from("ingredients")
    .select("id, name, visibility, state, brand")
    .ilike("name", `%${query}%`)
    .limit(10);

  if (householdId) {
    builder = builder.or(`visibility.eq.personal,household_id.eq.${householdId}`);
  } else {
    builder = builder.eq("visibility", "personal");
  }

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return data;
}
