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
      ingredient_id: i.ingredient_id ?? "",
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

/** Ingredients visible to the caller (RLS already scopes personal + every household they're in). */
async function fetchIngredientNameMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, string>> {
  const { data } = await supabase.from("ingredients").select("id, name");
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.name.trim().toLowerCase(), row.id);
  return map;
}

function distinctIngredientNames(recipes: ParsedRecipe[]): string[] {
  const names = new Set<string>();
  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      if (!ing.is_section_header && ing.ingredient_name.trim()) {
        names.add(ing.ingredient_name.trim());
      }
    }
  }
  return Array.from(names);
}

/**
 * Parses the CSV and reports which ingredient names don't match anything in
 * the caller's library, so the UI can offer "create now" vs "leave as text,
 * link later" before anything is actually written.
 */
export async function previewCsvImportAction(csvText: string) {
  const supabase = await createClient();
  const recipes = parseRecipeCsv(csvText);
  const nameMap = await fetchIngredientNameMap(supabase);
  const unmatched = distinctIngredientNames(recipes)
    .filter((name) => !nameMap.has(name.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return { recipeCount: recipes.length, unmatchedIngredientNames: unmatched };
}

export async function importFromCsvAction(
  csvText: string,
  visibility: "personal" | "household",
  householdId: string | null,
  createIngredientNames: string[] = [],
) {
  const ctx = await requireHouseholdContext();
  if (visibility === "household" && !ctx.activeHousehold) throw new Error("No active household");

  const supabase = await createClient();
  const recipes = parseRecipeCsv(csvText);
  const nameMap = await fetchIngredientNameMap(supabase);

  for (const rawName of createIngredientNames) {
    const key = rawName.trim().toLowerCase();
    if (!key || nameMap.has(key)) continue;
    const { data, error } = await supabase.rpc("create_ingredient", {
      p_ingredient: {
        household_id: visibility === "household" ? householdId : null,
        visibility,
        name: rawName.trim(),
      },
      p_nutrition: {},
      p_conversions: [],
    });
    if (error) throw new Error(error.message);
    nameMap.set(key, data as string);
  }

  const linkedRecipes = recipes.map((recipe) => ({
    ...recipe,
    ingredients: recipe.ingredients.map((ing) => {
      if (ing.is_section_header) return ing;
      const id = nameMap.get(ing.ingredient_name.trim().toLowerCase());
      return id ? { ...ing, ingredient_id: id } : ing;
    }),
  }));

  const ids: string[] = [];
  for (const parsed of linkedRecipes) {
    ids.push(await insertParsedRecipe(parsed, visibility, householdId));
  }

  revalidatePath("/recipes");
  revalidatePath("/ingredients");
  if (ids.length === 1) redirect(`/recipes/${ids[0]}/edit`);
  redirect("/recipes");
}
