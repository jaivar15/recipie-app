"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recipeFormSchema, type RecipeFormValues } from "@/lib/validations/recipe";
import type { Database } from "@/lib/types/database";

type RecipeVisibility = Database["public"]["Enums"]["recipe_visibility"];

function toRpcPayload(values: RecipeFormValues) {
  return {
    recipe: {
      visibility: values.visibility,
      household_id: values.visibility === "household" ? values.household_id : null,
      title: values.title,
      description: values.description ?? "",
      source: values.source ?? "",
      source_url: values.source_url ?? "",
      author_name: values.author_name ?? "",
      prep_time_minutes: values.prep_time_minutes ?? "",
      cook_time_minutes: values.cook_time_minutes ?? "",
      resting_time_minutes: values.resting_time_minutes ?? "",
      servings: values.servings,
      serving_size: values.serving_size ?? "",
      finished_weight_grams: values.finished_weight_grams ?? "",
      difficulty: values.difficulty ?? "",
      cuisine: values.cuisine ?? "",
      meal_type: values.meal_type,
      cooking_method: values.cooking_method ?? "",
      equipment: values.equipment,
    },
    ingredients: values.ingredients.map((i) => ({
      ingredient_name: i.ingredient_name,
      quantity: i.quantity ?? "",
      unit: i.unit ?? "",
      preparation_note: i.preparation_note ?? "",
      brand: i.brand ?? "",
    })),
    steps: values.steps.map((s) => ({
      instruction: s.instruction,
      duration_minutes: s.duration_minutes ?? "",
      temperature_celsius: s.temperature_celsius ?? "",
      equipment: s.equipment ?? "",
      tip: s.tip ?? "",
    })),
  };
}

export async function createRecipeAction(raw: RecipeFormValues) {
  const values = recipeFormSchema.parse(raw);
  const payload = toRpcPayload(values);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_recipe", {
    p_recipe: payload.recipe,
    p_ingredients: payload.ingredients,
    p_steps: payload.steps,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/recipes");
  revalidatePath("/", "layout");
  redirect(`/recipes/${data}`);
}

export async function updateRecipeAction(recipeId: string, raw: RecipeFormValues) {
  const values = recipeFormSchema.parse(raw);
  const payload = toRpcPayload(values);

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_recipe", {
    p_recipe_id: recipeId,
    p_recipe: payload.recipe,
    p_ingredients: payload.ingredients,
    p_steps: payload.steps,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipeAction(recipeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("soft_delete_recipe", { p_recipe_id: recipeId });
  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
  redirect("/recipes");
}

export async function restoreRecipeAction(recipeId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("restore_recipe", { p_recipe_id: recipeId });
  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
}

export async function duplicateRecipeAction(
  recipeId: string,
  targetVisibility: RecipeVisibility,
  targetHouseholdId: string | null
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("duplicate_recipe", {
    p_recipe_id: recipeId,
    p_target_visibility: targetVisibility,
    p_target_household_id: targetVisibility === "household" ? (targetHouseholdId ?? undefined) : undefined,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
  redirect(`/recipes/${data}`);
}

export async function toggleFavouriteAction(recipeId: string, isFavourite: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (isFavourite) {
    const { error } = await supabase
      .from("recipe_favourites")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("recipe_favourites")
      .insert({ recipe_id: recipeId, user_id: user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/recipes/${recipeId}`);
  revalidatePath("/recipes");
}

export async function savePersonalNoteAction(recipeId: string, note: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (note.trim() === "") {
    const { error } = await supabase
      .from("recipe_personal_notes")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("recipe_personal_notes")
      .upsert(
        { recipe_id: recipeId, user_id: user.id, note: note.trim() },
        { onConflict: "recipe_id,user_id" }
      );
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/recipes/${recipeId}`);
}

export async function registerRecipeImageAction(
  recipeId: string,
  storagePath: string,
  isPrimary: boolean
) {
  const supabase = await createClient();

  if (isPrimary) {
    await supabase.from("recipe_images").update({ is_primary: false }).eq("recipe_id", recipeId);
  }

  const { error } = await supabase
    .from("recipe_images")
    .insert({ recipe_id: recipeId, storage_path: storagePath, is_primary: isPrimary });
  if (error) throw new Error(error.message);

  revalidatePath(`/recipes/${recipeId}`);
}

export async function deleteRecipeImageAction(imageId: string, storagePath: string) {
  const supabase = await createClient();
  const { error: storageError } = await supabase.storage.from("recipe-images").remove([storagePath]);
  if (storageError) throw new Error(storageError.message);

  const { error } = await supabase.from("recipe_images").delete().eq("id", imageId);
  if (error) throw new Error(error.message);

  revalidatePath("/recipes");
}

export async function setPrimaryRecipeImageAction(recipeId: string, imageId: string) {
  const supabase = await createClient();
  await supabase.from("recipe_images").update({ is_primary: false }).eq("recipe_id", recipeId);
  const { error } = await supabase.from("recipe_images").update({ is_primary: true }).eq("id", imageId);
  if (error) throw new Error(error.message);
  revalidatePath(`/recipes/${recipeId}`);
}
