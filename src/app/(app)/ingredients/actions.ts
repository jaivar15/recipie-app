"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ingredientFormSchema, type IngredientFormValues } from "@/lib/validations/ingredient";
import { toIngredientRpcPayload } from "@/lib/ingredients/rpc-payload";

export async function createIngredientAction(raw: IngredientFormValues) {
  const values = ingredientFormSchema.parse(raw);
  const payload = toIngredientRpcPayload(values);

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
  const payload = toIngredientRpcPayload(values);

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

export async function searchIngredientsAction(query: string) {
  // No app-level visibility filter here — ingredients_select RLS already
  // restricts results to the caller's own personal ingredients plus
  // household ones for every household they belong to, which is more
  // correct than re-deriving "which household" app-side (a previous
  // version only showed household ingredients when a specific household
  // was passed in, silently hiding them while editing a personal recipe).
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name, visibility, state, brand")
    .ilike("name", `%${query}%`)
    .limit(10);
  if (error) throw new Error(error.message);
  return data;
}
