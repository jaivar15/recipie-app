"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHouseholdContext } from "@/lib/households/context";
import {
  extractRecipeJsonLd,
  mapJsonLdToRecipe,
  parseIngredientLine,
  isHeaderLine,
  stripHeaderMarker,
  type ParsedRecipe,
} from "@/lib/import/schema-org";
import { parseRecipeCsv } from "@/lib/import/csv";

async function insertParsedRecipe(
  parsed: ParsedRecipe,
  visibility: "personal" | "household",
  householdId: string | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_recipe", {
    p_recipe: {
      visibility,
      household_id: visibility === "household" ? householdId : null,
      title: parsed.title,
      description: parsed.description ?? "",
      source: "",
      source_url: parsed.sourceUrl,
      author_name: parsed.authorName ?? "",
      prep_time_minutes: parsed.prepTimeMinutes ?? "",
      cook_time_minutes: parsed.cookTimeMinutes ?? "",
      resting_time_minutes: "",
      servings: parsed.servings ?? 4,
      serving_size: "",
      finished_weight_grams: "",
      difficulty: "",
      cuisine: "",
      meal_type: [],
      cooking_method: "",
      equipment: [],
      dietary_labels: [],
      dietary_labels_verified: [],
      tag_ids: [],
    },
    p_ingredients: parsed.ingredients.map((i) => ({
      ingredient_name: i.ingredient_name,
      quantity: i.quantity ?? "",
      unit: i.unit ?? "",
      preparation_note: i.preparation_note ?? "",
      brand: "",
      ingredient_id: "",
      is_section_header: i.is_section_header ?? false,
    })),
    p_steps: parsed.steps.map((s) => ({
      instruction: s.instruction,
      duration_minutes: "",
      temperature_celsius: "",
      equipment: "",
      tip: "",
      is_section_header: s.is_section_header ?? false,
    })),
  });
  if (error) throw new Error(error.message);

  return data as string;
}

async function createFromParsed(
  parsed: ParsedRecipe,
  visibility: "personal" | "household",
  householdId: string | null,
) {
  const id = await insertParsedRecipe(parsed, visibility, householdId);
  revalidatePath("/recipes");
  redirect(`/recipes/${id}/edit`);
}

export async function importFromUrlAction(
  url: string,
  visibility: "personal" | "household",
  householdId: string | null,
) {
  const ctx = await requireHouseholdContext();
  if (visibility === "household" && !ctx.activeHousehold) throw new Error("No active household");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Enter a valid recipe URL");
  }
  if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
    throw new Error("Enter a valid recipe URL");
  }

  const response = await fetch(parsedUrl.toString(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; MyFamilyRecipeVault/1.0)" },
  });
  if (!response.ok) throw new Error(`Could not fetch that page (${response.status})`);
  const html = await response.text();

  const node = extractRecipeJsonLd(html);
  if (!node)
    throw new Error(
      "No recipe data found on that page — it may not support structured recipe markup.",
    );

  const parsed = mapJsonLdToRecipe(node, parsedUrl.toString());
  await createFromParsed(parsed, visibility, householdId);
}

export async function importFromJsonAction(
  raw: string,
  visibility: "personal" | "household",
  householdId: string | null,
) {
  const ctx = await requireHouseholdContext();
  if (visibility === "household" && !ctx.activeHousehold) throw new Error("No active household");

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("That isn't valid JSON");
  }

  const ingredientsRaw = data.recipe_ingredients ?? data.ingredients ?? [];
  const stepsRaw = data.recipe_steps ?? data.steps ?? [];

  const parsed: ParsedRecipe = {
    title: typeof data.title === "string" ? data.title : "Imported recipe",
    description: typeof data.description === "string" ? data.description : null,
    authorName: typeof data.author_name === "string" ? data.author_name : null,
    sourceUrl: typeof data.source_url === "string" ? data.source_url : "",
    prepTimeMinutes: typeof data.prep_time_minutes === "number" ? data.prep_time_minutes : null,
    cookTimeMinutes: typeof data.cook_time_minutes === "number" ? data.cook_time_minutes : null,
    servings: typeof data.servings === "number" ? data.servings : null,
    ingredients: (Array.isArray(ingredientsRaw) ? ingredientsRaw : []).map((i) => {
      if (typeof i === "string") {
        if (isHeaderLine(i)) {
          return {
            ingredient_name: stripHeaderMarker(i),
            quantity: null,
            unit: null,
            preparation_note: null,
            is_section_header: true,
          };
        }
        return parseIngredientLine(i);
      }
      const obj = i as Record<string, unknown>;
      return {
        ingredient_name: String(obj.ingredient_name ?? obj.name ?? ""),
        quantity: typeof obj.quantity === "number" ? obj.quantity : null,
        unit: (obj.unit as ParsedRecipe["ingredients"][number]["unit"]) ?? null,
        preparation_note: typeof obj.preparation_note === "string" ? obj.preparation_note : null,
        is_section_header: obj.is_section_header === true,
      };
    }),
    steps: (Array.isArray(stepsRaw) ? stepsRaw : []).map((s) => {
      if (typeof s === "string") {
        return isHeaderLine(s)
          ? { instruction: stripHeaderMarker(s), is_section_header: true }
          : { instruction: s };
      }
      const obj = s as Record<string, unknown>;
      return {
        instruction: String(obj.instruction ?? ""),
        is_section_header: obj.is_section_header === true,
      };
    }),
  };

  await createFromParsed(parsed, visibility, householdId);
}

export async function importFromCsvAction(
  csvText: string,
  visibility: "personal" | "household",
  householdId: string | null,
) {
  const ctx = await requireHouseholdContext();
  if (visibility === "household" && !ctx.activeHousehold) throw new Error("No active household");

  const recipes = parseRecipeCsv(csvText);

  const ids: string[] = [];
  for (const parsed of recipes) {
    ids.push(await insertParsedRecipe(parsed, visibility, householdId));
  }

  revalidatePath("/recipes");
  if (ids.length === 1) redirect(`/recipes/${ids[0]}/edit`);
  redirect("/recipes");
}
