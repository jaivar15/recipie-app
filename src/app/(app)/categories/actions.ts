"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type RecipeVisibility = Database["public"]["Enums"]["recipe_visibility"];

export async function createTagAction(name: string, visibility: RecipeVisibility, householdId: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // created_by is set authoritatively by the tags_set_creator trigger;
  // passed here only to satisfy the generated Insert type.
  const { error } = await supabase.from("tags").insert({
    name: name.trim(),
    visibility,
    household_id: visibility === "household" ? householdId : null,
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

export async function deleteTagAction(tagId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", tagId);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}

export async function createCollectionAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "personal") as RecipeVisibility;
  const householdId = String(formData.get("householdId") ?? "") || null;
  if (!name) throw new Error("Collection name is required");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // created_by is set authoritatively by the collections_set_creator
  // trigger; passed here only to satisfy the generated Insert type.
  const { data, error } = await supabase
    .from("collections")
    .insert({
      name,
      description: description || null,
      visibility,
      household_id: visibility === "household" ? householdId : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  redirect(`/collections/${data.id}`);
}

export async function updateCollectionAction(collectionId: string, name: string, description: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collections")
    .update({ name: name.trim(), description: description.trim() || null })
    .eq("id", collectionId);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  revalidatePath(`/collections/${collectionId}`);
}

export async function deleteCollectionAction(collectionId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("collections").delete().eq("id", collectionId);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
  redirect("/categories");
}

export async function addRecipeToCollectionAction(collectionId: string, recipeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_recipes")
    .insert({ collection_id: collectionId, recipe_id: recipeId })
    .select()
    .single();
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/recipes/${recipeId}`);
}

export async function removeRecipeFromCollectionAction(collectionId: string, recipeId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("collection_recipes")
    .delete()
    .eq("collection_id", collectionId)
    .eq("recipe_id", recipeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/recipes/${recipeId}`);
}

export async function createSavedFilterAction(name: string, householdId: string | null, filter: Record<string, string>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("saved_filters").insert({
    user_id: user.id,
    household_id: householdId,
    name: name.trim(),
    filter,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
}

export async function deleteSavedFilterAction(filterId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("saved_filters").delete().eq("id", filterId);
  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
}
