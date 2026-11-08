import Link from "next/link";
import { Activity } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { calculateRecipeNutrition, divideNutrients, type RecipeIngredientForCalc, type NutrientSet } from "@/lib/nutrition/calculate";
import { EmptyState } from "@/components/layout/empty-state";
import { RecipeNutritionTable, type RecipeNutritionRow } from "@/components/nutrition/recipe-nutrition-table";
import { NutritionDiary } from "@/components/nutrition/nutrition-diary";
import { Button } from "@/components/ui/button";

const QUERY_FIELDS = `
  id, title, servings,
  recipe_ingredients(ingredient_name, quantity, unit, nutrition_override,
    ingredients(ingredient_nutrition(energy_kj, calories_kcal, protein_g, carbohydrate_g, fat_g, saturated_fat_g,
      fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg, magnesium_mg, vitamin_b12_ug, folate_ug),
      ingredient_measurement_conversions(unit, grams_per_unit)))
`;

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string }>;
}) {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const sp = await searchParams;
  const activeTab = sp.tab === "diary" ? "diary" : "recipes";

  const supabase = await createClient();

  const { data: recipes } = ctx.activeHousehold
    ? await supabase
        .from("recipes")
        .select(QUERY_FIELDS)
        .eq("household_id", ctx.activeHousehold.householdId)
        .eq("visibility", "household")
        .order("title")
    : await supabase.from("recipes").select(QUERY_FIELDS).eq("visibility", "personal").eq("created_by", ctx.userId).order("title");

  const rows: RecipeNutritionRow[] = (recipes ?? []).map((r) => {
    const inputs: RecipeIngredientForCalc[] = r.recipe_ingredients.map((ing) => ({
      id: ing.ingredient_name,
      ingredientName: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      nutritionOverride: (ing.nutrition_override as NutrientSet | null) ?? null,
      ingredientNutrition: ing.ingredients?.ingredient_nutrition ?? null,
      conversions: Object.fromEntries(
        (ing.ingredients?.ingredient_measurement_conversions ?? []).map((c) => [c.unit, c.grams_per_unit])
      ),
    }));

    const totals = calculateRecipeNutrition(inputs);
    const perServing = divideNutrients(totals.nutrients, r.servings);
    const complete =
      perServing.calories_kcal.complete &&
      perServing.protein_g.complete &&
      perServing.carbohydrate_g.complete &&
      perServing.fat_g.complete;

    return {
      id: r.id,
      title: r.title,
      servings: r.servings,
      caloriesPerServing: perServing.calories_kcal.value,
      proteinPerServing: perServing.protein_g.value,
      carbsPerServing: perServing.carbohydrate_g.value,
      fatPerServing: perServing.fat_g.value,
      fibrePerServing: perServing.fibre_g.value,
      complete,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
          <p className="text-sm text-muted-foreground">
            {activeTab === "recipes"
              ? `Per-serving nutrition across ${ctx.activeHousehold ? "your household's" : "your"} recipes.`
              : "What you've actually eaten, day by day."}{" "}
            A &quot;+&quot; means the figure is a lower bound — some ingredients don&apos;t have complete nutrition
            data yet.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          <Button size="sm" variant={activeTab === "recipes" ? "default" : "ghost"} render={<Link href="/nutrition" />}>
            Recipes
          </Button>
          <Button size="sm" variant={activeTab === "diary" ? "default" : "ghost"} render={<Link href="/nutrition?tab=diary" />}>
            Daily tracking
          </Button>
        </div>
      </div>

      {activeTab === "recipes" ? (
        rows.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No recipes to compare yet"
            description="Add recipes and link their ingredients to the ingredient database to see nutrition comparisons here."
          />
        ) : (
          <RecipeNutritionTable data={rows} />
        )
      ) : (
        <NutritionDiary
          householdId={ctx.activeHousehold?.householdId ?? null}
          userId={ctx.userId}
          period={sp.period}
        />
      )}
    </div>
  );
}
