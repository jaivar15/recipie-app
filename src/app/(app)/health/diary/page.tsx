import { Fragment } from "react";
import Link from "next/link";
import { NotebookPen, ChevronLeft, ChevronRight } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { AddFoodDiaryEntryDialog } from "@/components/health/add-food-diary-entry-dialog";
import { FoodDiaryEntryRow } from "@/components/health/food-diary-entry-row";
import { RepeatDayButton } from "@/components/health/repeat-day-button";
import { FrequentFoodsMenu, type FrequentFood } from "@/components/health/frequent-foods-menu";
import { macrosFromSnapshotRow, sumMacros } from "@/lib/health/food-diary";
import { formatMacroValue } from "@/lib/nutrition/format";
import { type MacroKey } from "@/lib/nutrition/calculate";
import type { Database } from "@/lib/types/database";

const TABLE_MACRO_COLUMNS: { key: MacroKey; label: string }[] = [
  { key: "calories_kcal", label: "Calories (kcal)" },
  { key: "protein_g", label: "Protein (g)" },
  { key: "carbohydrate_g", label: "Carbs (g)" },
  { key: "fat_g", label: "Fat (g)" },
];

type FoodDiaryMealType = Database["public"]["Enums"]["food_diary_meal_type"];
const MEAL_ORDER: FoodDiaryMealType[] = ["breakfast", "lunch", "dinner", "snack", "drink"];
const MEAL_LABELS: Record<FoodDiaryMealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  drink: "Drink",
};
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/**
 * Adds days to an ISO date using UTC-based arithmetic throughout, matching
 * `toISODate`'s own UTC interpretation of "today" — mixing local-time
 * parsing (new Date(iso + "T00:00:00")) with UTC serialization silently
 * shifts the result by a day in any non-UTC positive offset timezone.
 */
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export default async function FoodDiaryPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  const sp = await searchParams;
  const today = toISODate(new Date());
  const entryDate = sp.date ?? today;
  const prevDate = addDays(entryDate, -1);
  const nextDate = addDays(entryDate, 1);
  const dateLabel = new Date(entryDate + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const supabase = await createClient();
  const thirtyDaysAgo = addDays(today, -30);

  const [
    { data: recipeRows },
    { data: ingredientRows },
    { data: entryRows },
    { count: yesterdayCount },
    { data: recentRows },
  ] = await Promise.all([
    supabase.from("recipes").select("id, title").is("deleted_at", null).order("title"),
    supabase.from("ingredients").select("id, name, nutrition_reference_unit").order("name"),
    supabase
      .from("food_diary_entries")
      .select(
        `id, meal_type, source_type, recipe_id, ingredient_id, custom_food_name, servings, quantity_grams, logged_at,
           recipes(title), ingredients(name, nutrition_reference_unit),
           food_diary_nutrition_snapshots(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g, calories_complete, protein_complete, carbs_complete, fat_complete, fibre_complete)`,
      )
      .eq("user_id", ctx.userId)
      .eq("entry_date", entryDate)
      .order("logged_at"),
    supabase
      .from("food_diary_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .eq("entry_date", prevDate),
    supabase
      .from("food_diary_entries")
      .select(
        `meal_type, source_type, recipe_id, ingredient_id, custom_food_name, servings, quantity_grams, entry_date,
           recipes(title), ingredients(name, nutrition_reference_unit),
           food_diary_nutrition_snapshots(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g)`,
      )
      .eq("user_id", ctx.userId)
      .gte("entry_date", thirtyDaysAgo)
      .order("entry_date", { ascending: false }),
  ]);

  const recipes = recipeRows ?? [];
  const ingredients = (ingredientRows ?? []).map((i) => ({
    ...i,
    nutrition_reference_unit: i.nutrition_reference_unit as "g" | "ml",
  }));

  type DisplayEntry = {
    id: string;
    mealType: FoodDiaryMealType;
    title: string;
    quantityLabel: string | null;
    macros: ReturnType<typeof macrosFromSnapshotRow>;
  };

  const entries: DisplayEntry[] = (entryRows ?? []).map((e) => ({
    id: e.id,
    mealType: e.meal_type,
    title: e.recipes?.title ?? e.ingredients?.name ?? e.custom_food_name ?? "Food",
    quantityLabel:
      e.source_type === "recipe"
        ? `${Number(e.servings)} serving${Number(e.servings) === 1 ? "" : "s"}`
        : e.source_type === "ingredient"
          ? `${Number(e.quantity_grams)} ${e.ingredients?.nutrition_reference_unit === "ml" ? "ml" : "g"}`
          : null,
    macros: macrosFromSnapshotRow(e.food_diary_nutrition_snapshots),
  }));

  const dayTotal = sumMacros(entries.map((e) => e.macros));

  // "Frequent" quick-add: most-logged distinct food over the last 30 days.
  const frequencyMap = new Map<string, { food: FrequentFood; count: number }>();
  for (const r of recentRows ?? []) {
    let food: FrequentFood | null = null;
    if (r.source_type === "recipe" && r.recipe_id && r.servings != null) {
      food = {
        key: `recipe:${r.recipe_id}:${r.servings}`,
        label: r.recipes?.title ?? "Recipe",
        count: 0,
        mealType: r.meal_type,
        sourceType: "recipe",
        recipeId: r.recipe_id,
        servings: Number(r.servings),
      };
    } else if (r.source_type === "ingredient" && r.ingredient_id && r.quantity_grams != null) {
      food = {
        key: `ingredient:${r.ingredient_id}:${r.quantity_grams}`,
        label: `${r.ingredients?.name ?? "Ingredient"} (${Number(r.quantity_grams)}${r.ingredients?.nutrition_reference_unit === "ml" ? "ml" : "g"})`,
        count: 0,
        mealType: r.meal_type,
        sourceType: "ingredient",
        ingredientId: r.ingredient_id,
        quantityGrams: Number(r.quantity_grams),
      };
    } else if (r.source_type === "custom" && r.custom_food_name) {
      const s = r.food_diary_nutrition_snapshots;
      food = {
        key: `custom:${r.custom_food_name}`,
        label: r.custom_food_name,
        count: 0,
        mealType: r.meal_type,
        sourceType: "custom",
        customFoodName: r.custom_food_name,
        nutrition: {
          calories_kcal: s?.calories_kcal ?? undefined,
          protein_g: s?.protein_g ?? undefined,
          carbohydrate_g: s?.carbohydrate_g ?? undefined,
          fat_g: s?.fat_g ?? undefined,
          fibre_g: s?.fibre_g ?? undefined,
        },
      };
    }
    if (!food) continue;
    const existing = frequencyMap.get(food.key);
    if (existing) existing.count += 1;
    else frequencyMap.set(food.key, { food, count: 1 });
  }
  const frequentFoods: FrequentFood[] = Array.from(frequencyMap.values())
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
    .map((f) => ({ ...f.food, count: f.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Food Diary</h1>
          <p className="text-sm text-muted-foreground">
            Log what you actually ate — private, and never fabricated when unknown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            render={<Link href={`/health/diary?date=${prevDate}`} />}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" render={<Link href={`/health/diary?date=${today}`} />}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            render={<Link href={`/health/diary?date=${nextDate}`} />}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{dateLabel}</p>
        <div className="flex flex-wrap gap-2">
          {(yesterdayCount ?? 0) > 0 ? (
            <RepeatDayButton
              sourceDate={prevDate}
              targetDate={entryDate}
              label="Repeat yesterday"
            />
          ) : null}
          <FrequentFoodsMenu foods={frequentFoods} entryDate={entryDate} />
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Nothing logged for this day"
          description="Add a recipe, an ingredient, or a quick custom entry to any meal below."
        />
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                <th className="px-3 py-2">Food or recipe</th>
                <th className="px-3 py-2">Serving size</th>
                {TABLE_MACRO_COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-2 text-right">
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MEAL_ORDER.map((mt) => {
                const mealEntries = entries.filter((e) => e.mealType === mt);
                const subtotal = sumMacros(mealEntries.map((e) => e.macros));
                return (
                  <Fragment key={mt}>
                    <tr className="bg-primary/10">
                      <td colSpan={6} className="px-3 py-1.5 font-semibold text-primary">
                        {MEAL_LABELS[mt]}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        <AddFoodDiaryEntryDialog
                          entryDate={entryDate}
                          mealType={mt}
                          mealLabel={MEAL_LABELS[mt]}
                          recipes={recipes}
                          ingredients={ingredients}
                        />
                      </td>
                    </tr>
                    {mealEntries.length > 0 ? (
                      mealEntries.map((e) => (
                        <FoodDiaryEntryRow
                          key={e.id}
                          id={e.id}
                          title={e.title}
                          quantityLabel={e.quantityLabel}
                          macros={e.macros}
                          today={today}
                        />
                      ))
                    ) : (
                      <tr className="border-b">
                        <td colSpan={7} className="px-3 py-2 text-xs text-muted-foreground">
                          Nothing logged
                        </td>
                      </tr>
                    )}
                    <tr className="border-b bg-muted/30 font-medium">
                      <td colSpan={2} className="px-3 py-1.5">
                        {MEAL_LABELS[mt]} subtotal
                      </td>
                      {TABLE_MACRO_COLUMNS.map((c) => (
                        <td key={c.key} className="px-3 py-1.5 text-right tabular-nums">
                          {formatMacroValue(subtotal[c.key].value, subtotal[c.key].complete) ?? "–"}
                        </td>
                      ))}
                      <td />
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-primary text-primary-foreground">
                <td colSpan={2} className="px-3 py-2.5 font-semibold">
                  Daily total
                </td>
                {TABLE_MACRO_COLUMNS.map((c) => (
                  <td key={c.key} className="px-3 py-2.5 text-right font-semibold tabular-nums">
                    {formatMacroValue(dayTotal[c.key].value, dayTotal[c.key].complete) ?? "–"}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
    </div>
  );
}
