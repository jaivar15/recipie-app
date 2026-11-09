"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ingredientFormSchema } from "@/lib/validations/ingredient";
import { toIngredientRpcPayload } from "@/lib/ingredients/rpc-payload";
import { parseIngredientsCsv } from "@/lib/import/ingredients-csv";

export type BulkImportResult = {
  created: { rowNumber: number; name: string }[];
  failed: { rowNumber: number; name: string; error: string }[];
  skipped: { rowNumber: number; reason: string }[];
};

export async function bulkImportIngredientsAction(
  csvText: string,
  visibility: "personal" | "household",
  householdId: string | null
): Promise<BulkImportResult> {
  const { rows, skipped } = parseIngredientsCsv(csvText);
  const supabase = await createClient();

  const created: BulkImportResult["created"] = [];
  const failed: BulkImportResult["failed"] = [];

  for (const row of rows) {
    const parsed = ingredientFormSchema.safeParse({
      visibility,
      household_id: visibility === "household" ? householdId : null,
      name: row.name,
      alternative_names: row.alternative_names,
      food_category: row.food_category,
      state: row.state,
      brand: row.brand,
      allergens: row.allergens,
      notes: row.notes,
      nutrition: row.nutrition,
      conversions: [],
    });

    if (!parsed.success) {
      failed.push({ rowNumber: row.rowNumber, name: row.name, error: parsed.error.issues[0]?.message ?? "Invalid row" });
      continue;
    }

    const payload = toIngredientRpcPayload(parsed.data);
    const { error } = await supabase.rpc("create_ingredient", {
      p_ingredient: payload.ingredient,
      p_nutrition: payload.nutrition,
      p_conversions: payload.conversions,
    });

    if (error) {
      failed.push({ rowNumber: row.rowNumber, name: row.name, error: error.message });
    } else {
      created.push({ rowNumber: row.rowNumber, name: row.name });
    }
  }

  if (created.length > 0) revalidatePath("/ingredients");

  return { created, failed, skipped };
}
