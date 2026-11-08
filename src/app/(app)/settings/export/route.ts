import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHouseholdContext } from "@/lib/households/context";

const RECIPE_FIELDS = `
  id, title, description, source, source_url, author_name, prep_time_minutes, cook_time_minutes,
  resting_time_minutes, servings, serving_size, finished_weight_grams, difficulty, cuisine, meal_type,
  cooking_method, equipment, dietary_labels, dietary_labels_verified, created_at, updated_at,
  recipe_ingredients(position, ingredient_name, quantity, unit, preparation_note, brand),
  recipe_steps(position, instruction, duration_minutes, temperature_celsius, equipment, tip)
`;

export async function GET() {
  const ctx = await getHouseholdContext();
  if (!ctx || !ctx.activeHousehold) {
    return NextResponse.json({ error: "No active household" }, { status: 400 });
  }
  if (ctx.activeHousehold.role !== "owner") {
    return NextResponse.json({ error: "Only the household owner can export a full backup" }, { status: 403 });
  }

  const householdId = ctx.activeHousehold.householdId;
  const supabase = await createClient();

  const [{ data: recipes }, { data: tags }, { data: collections }] = await Promise.all([
    supabase
      .from("recipes")
      .select(RECIPE_FIELDS)
      .eq("household_id", householdId)
      .eq("visibility", "household")
      .is("deleted_at", null),
    supabase.from("tags").select("name").eq("household_id", householdId),
    supabase.from("collections").select("name, description, collection_recipes(recipe_id)").eq("household_id", householdId),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    household_name: ctx.activeHousehold.householdName,
    recipes: recipes ?? [],
    tags: (tags ?? []).map((t) => t.name),
    collections: collections ?? [],
  };

  const slug = ctx.activeHousehold.householdName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${slug || "household"}-backup.json"`,
    },
  });
}
