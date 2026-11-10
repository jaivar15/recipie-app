import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { signRecipeImageUrls } from "@/lib/supabase/storage";
import {
  calculateRecipeNutrition,
  divideNutrients,
  type RecipeIngredientForCalc,
  type NutrientSet,
} from "@/lib/nutrition/calculate";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard, type RecipeCardData } from "@/components/recipes/recipe-card";
import { RestoreRecipeButton } from "@/components/recipes/restore-recipe-button";
import { RecipeSearchBar } from "@/components/recipes/recipe-search-bar";
import type { Database } from "@/lib/types/database";

type MeasurementUnit = Database["public"]["Enums"]["measurement_unit"];

const RECIPE_CARD_FIELDS = `
  id, title, visibility, difficulty, cuisine, prep_time_minutes, cook_time_minutes, servings, author_name,
  meal_type, dietary_labels, deleted_at, recipe_images(storage_path, is_primary),
  recipe_tags(tag_id),
  recipe_ingredients(ingredient_name, quantity, unit, nutrition_override,
    ingredients(nutrition_reference_amount, nutrition_reference_unit, ingredient_nutrition(energy_kj, calories_kcal, protein_g, carbohydrate_g, fat_g, saturated_fat_g,
      fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg, magnesium_mg, vitamin_b12_ug, folate_ug),
      ingredient_measurement_conversions(unit, grams_per_unit)))
`;

type RawRecipeRow = {
  id: string;
  title: string;
  visibility: "personal" | "household";
  difficulty: string | null;
  cuisine: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number;
  author_name: string | null;
  meal_type: string[];
  dietary_labels: string[];
  deleted_at: string | null;
  recipe_images: { storage_path: string; is_primary: boolean }[];
  recipe_tags: { tag_id: string }[];
  recipe_ingredients: {
    ingredient_name: string;
    quantity: number | null;
    unit: MeasurementUnit | null;
    nutrition_override: NutrientSet | null;
    ingredients: {
      nutrition_reference_amount: number;
      nutrition_reference_unit: "g" | "ml";
      ingredient_nutrition: NutrientSet | null;
      ingredient_measurement_conversions: { unit: MeasurementUnit; grams_per_unit: number }[];
    } | null;
  }[];
};

type Filters = {
  q?: string;
  cuisine?: string;
  difficulty?: string;
  dietary?: string[];
  mealType?: string[];
  maxTime?: number;
  minProtein?: number;
  maxCalories?: number;
  tag?: string;
};

function matchesFilters(r: RawRecipeRow, filters: Filters): boolean {
  if (filters.q) {
    const q = filters.q.toLowerCase();
    const titleMatch = r.title.toLowerCase().includes(q);
    const ingredientMatch = r.recipe_ingredients.some((i) =>
      i.ingredient_name.toLowerCase().includes(q),
    );
    if (!titleMatch && !ingredientMatch) return false;
  }
  if (filters.cuisine && r.cuisine !== filters.cuisine) return false;
  if (filters.difficulty && r.difficulty !== filters.difficulty) return false;
  if (filters.dietary && filters.dietary.length > 0) {
    if (!filters.dietary.every((d) => r.dietary_labels.includes(d))) return false;
  }
  if (filters.mealType && filters.mealType.length > 0) {
    if (!filters.mealType.some((mt) => r.meal_type.includes(mt))) return false;
  }
  if (filters.tag && !r.recipe_tags.some((t) => t.tag_id === filters.tag)) return false;
  if (filters.maxTime != null) {
    const total = (r.prep_time_minutes ?? 0) + (r.cook_time_minutes ?? 0);
    if (total === 0 || total > filters.maxTime) return false;
  }
  if (filters.minProtein != null || filters.maxCalories != null) {
    const inputs: RecipeIngredientForCalc[] = r.recipe_ingredients.map((ing) => ({
      id: ing.ingredient_name,
      ingredientName: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      nutritionOverride: ing.nutrition_override,
      ingredientNutrition: ing.ingredients?.ingredient_nutrition ?? null,
      nutritionReferenceAmount: ing.ingredients?.nutrition_reference_amount,
      nutritionReferenceUnit: ing.ingredients?.nutrition_reference_unit,
      conversions: Object.fromEntries(
        (ing.ingredients?.ingredient_measurement_conversions ?? []).map((c) => [
          c.unit,
          c.grams_per_unit,
        ]),
      ),
    }));
    const perServing = divideNutrients(calculateRecipeNutrition(inputs).nutrients, r.servings);
    if (filters.minProtein != null && (perServing.protein_g.value ?? 0) < filters.minProtein)
      return false;
    if (
      filters.maxCalories != null &&
      (perServing.calories_kcal.value ?? Infinity) > filters.maxCalories
    )
      return false;
  }
  return true;
}

async function toCardData(rows: RawRecipeRow[]): Promise<RecipeCardData[]> {
  const primaryPaths = rows
    .map(
      (r) =>
        r.recipe_images.find((i) => i.is_primary)?.storage_path ?? r.recipe_images[0]?.storage_path,
    )
    .filter((p): p is string => !!p);
  const urlMap = await signRecipeImageUrls(primaryPaths);

  return rows.map((r) => {
    const path =
      r.recipe_images.find((i) => i.is_primary)?.storage_path ?? r.recipe_images[0]?.storage_path;
    return {
      id: r.id,
      title: r.title,
      visibility: r.visibility,
      difficulty: r.difficulty,
      cuisine: r.cuisine,
      prepTimeMinutes: r.prep_time_minutes,
      cookTimeMinutes: r.cook_time_minutes,
      servings: r.servings,
      authorName: r.author_name,
      mealType: r.meal_type,
      dietaryLabels: r.dietary_labels,
      imageUrl: path ? (urlMap[path] ?? null) : null,
    };
  });
}

export default async function RecipeLibraryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const sp = await searchParams;
  const filters: Filters = {
    q: sp.q,
    cuisine: sp.cuisine,
    difficulty: sp.difficulty,
    dietary: sp.dietary?.split(",").filter(Boolean),
    mealType: sp.mealType?.split(",").filter(Boolean),
    maxTime: sp.maxTime ? Number(sp.maxTime) : undefined,
    minProtein: sp.minProtein ? Number(sp.minProtein) : undefined,
    maxCalories: sp.maxCalories ? Number(sp.maxCalories) : undefined,
    tag: sp.tag,
  };

  const supabase = await createClient();

  const [
    householdResult,
    personalResult,
    favouritesResult,
    deletedResult,
    tagsResult,
    savedFiltersResult,
    goalsResult,
  ] = await Promise.all([
    ctx.activeHousehold
      ? supabase
          .from("recipes")
          .select(RECIPE_CARD_FIELDS)
          .eq("household_id", ctx.activeHousehold.householdId)
          .eq("visibility", "household")
          // RLS also lets the owner see their soft-deleted recipes (for the
          // "recently deleted" list below), so this must be filtered
          // explicitly rather than relying on RLS alone.
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as RawRecipeRow[] }),
    supabase
      .from("recipes")
      .select(RECIPE_CARD_FIELDS)
      .eq("visibility", "personal")
      .eq("created_by", ctx.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("recipe_favourites")
      .select(`recipes!inner(${RECIPE_CARD_FIELDS})`)
      .eq("user_id", ctx.userId),
    // RLS (recipes_select_deleted_by_owner) already restricts this to
    // household recipes the caller owns, or their own deleted personal
    // recipes — nothing extra to filter here.
    supabase
      .from("recipes")
      .select("id, title, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    ctx.activeHousehold
      ? supabase
          .from("tags")
          .select("id, name")
          .or(`visibility.eq.personal,household_id.eq.${ctx.activeHousehold.householdId}`)
          .order("name")
      : supabase.from("tags").select("id, name").eq("visibility", "personal").order("name"),
    supabase
      .from("saved_filters")
      .select("id, name, filter")
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("nutrition_goals")
      .select("calorie_target, protein_target_g")
      .eq("user_id", ctx.userId)
      .maybeSingle(),
  ]);

  const householdFiltered = ((householdResult.data ?? []) as unknown as RawRecipeRow[]).filter(
    (r) => matchesFilters(r, filters),
  );
  const personalFiltered = ((personalResult.data ?? []) as unknown as RawRecipeRow[]).filter((r) =>
    matchesFilters(r, filters),
  );
  const favouriteRows = ((favouritesResult.data ?? []) as unknown as { recipes: RawRecipeRow }[])
    .map((f) => f.recipes)
    .filter((r) => !r.deleted_at && matchesFilters(r, filters));

  const householdRecipes = await toCardData(householdFiltered);
  const personalRecipes = await toCardData(personalFiltered);
  const favouriteRecipes = await toCardData(favouriteRows);
  const deletedRecipes = deletedResult.data ?? [];

  // "Per meal" heuristic (target ÷ 4) for the Recipe Library's "Fits my
  // targets" quick filter — the targets themselves are daily totals, not
  // per-meal, so this is a reasonable split rather than an exact figure.
  const goals = goalsResult.data;
  const nutritionTargets =
    goals && (goals.calorie_target != null || goals.protein_target_g != null)
      ? {
          maxCaloriesPerMeal:
            goals.calorie_target != null ? Math.round(goals.calorie_target / 4) : null,
          minProteinPerMeal:
            goals.protein_target_g != null ? Math.round(Number(goals.protein_target_g) / 4) : null,
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recipe Library</h1>
          <p className="text-sm text-muted-foreground">
            All household recipes, your private recipes, and favourites.
          </p>
        </div>
        <div className="flex gap-2">
          <Button render={<Link href="/recipes/import" />} variant="outline">
            Import
          </Button>
          <Button render={<Link href="/recipes/new" />}>Add Recipe</Button>
        </div>
      </div>

      <RecipeSearchBar
        tags={tagsResult.data ?? []}
        savedFilters={
          (savedFiltersResult.data ?? []) as {
            id: string;
            name: string;
            filter: Record<string, string>;
          }[]
        }
        householdId={ctx.activeHousehold?.householdId ?? null}
        nutritionTargets={nutritionTargets}
      />

      <Tabs defaultValue={ctx.activeHousehold ? "household" : "personal"}>
        <TabsList>
          {ctx.activeHousehold ? <TabsTrigger value="household">Household</TabsTrigger> : null}
          <TabsTrigger value="personal">My private recipes</TabsTrigger>
          <TabsTrigger value="favourites">Favourites</TabsTrigger>
        </TabsList>

        {ctx.activeHousehold ? (
          <TabsContent value="household">
            <RecipeGrid recipes={householdRecipes} emptyLabel="No household recipes match." />
          </TabsContent>
        ) : null}
        <TabsContent value="personal">
          <RecipeGrid recipes={personalRecipes} emptyLabel="No private recipes match." />
        </TabsContent>
        <TabsContent value="favourites">
          <RecipeGrid recipes={favouriteRecipes} emptyLabel="No favourites match." />
        </TabsContent>
      </Tabs>

      {deletedRecipes.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Recently deleted</p>
          <ul className="space-y-2">
            {deletedRecipes.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{r.title}</span>
                <RestoreRecipeButton recipeId={r.id} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RecipeGrid({ recipes, emptyLabel }: { recipes: RecipeCardData[]; emptyLabel: string }) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nothing here yet"
        description={emptyLabel}
        action={
          <Button render={<Link href="/recipes/new" />} variant="outline">
            Add your first recipe
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  );
}
