"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdContext } from "@/lib/households/context";
import type { Database } from "@/lib/types/database";

type MeasurementUnit = Database["public"]["Enums"]["measurement_unit"];

export async function createShoppingListAction(name: string) {
  const ctx = await requireHouseholdContext();
  if (!ctx.activeHousehold) throw new Error("No active household");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shopping_lists")
    .insert({ household_id: ctx.activeHousehold.householdId, name: name.trim() || "Shopping List", created_by: ctx.userId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/shopping-lists");
  redirect(`/shopping-lists/${data.id}`);
}

export async function archiveShoppingListAction(listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").update({ is_archived: true }).eq("id", listId);
  if (error) throw new Error(error.message);
  revalidatePath("/shopping-lists");
  redirect("/shopping-lists");
}

export async function addShoppingListItemAction(
  listId: string,
  item: { name: string; quantity: number | null; unit: MeasurementUnit | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count } = await supabase
    .from("shopping_list_items")
    .select("id", { count: "exact", head: true })
    .eq("shopping_list_id", listId);

  const { error } = await supabase.from("shopping_list_items").insert({
    shopping_list_id: listId,
    ingredient_name: item.name.trim(),
    quantity: item.quantity,
    unit: item.unit,
    added_by: user?.id ?? null,
    sort_order: count ?? 0,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/shopping-lists/${listId}`);
}

export async function toggleShoppingListItemAction(itemId: string, listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("toggle_shopping_list_item", { p_item_id: itemId });
  if (error) throw new Error(error.message);
  revalidatePath(`/shopping-lists/${listId}`);
}

export async function deleteShoppingListItemAction(itemId: string, listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
  revalidatePath(`/shopping-lists/${listId}`);
}

export async function clearCheckedItemsAction(listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_list_items").delete().eq("shopping_list_id", listId).eq("is_checked", true);
  if (error) throw new Error(error.message);
  revalidatePath(`/shopping-lists/${listId}`);
}
