import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import {
  calculateRecipeNutrition,
  multiplyNutrients,
  EMPTY_MACROS,
  MACRO_KEYS,
  NUTRIENT_LABELS,
  type Macros,
  type NutrientSet,
  type RecipeIngredientForCalc,
} from "@/lib/nutrition/calculate";
import { EmptyState } from "@/components/layout/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddMealEntryDialog } from "@/components/meal-planner/add-meal-entry-dialog";
import { MealEntryCard } from "@/components/meal-planner/meal-entry-card";
import { GenerateShoppingListButton } from "@/components/meal-planner/generate-shopping-list-button";
import type { Database } from "@/lib/types/database";

type MealType = Database["public"]["Enums"]["meal_type"];
const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const SHORT_MACRO_LABELS: Record<(typeof MACRO_KEYS)[number], string> = {
  calories_kcal: "Cal",
  protein_g: "P",
  carbohydrate_g: "C",
  fat_g: "F",
  fibre_g: "Fb",
};


function mondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

export default async function MealPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  if (!ctx.activeHousehold) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meal Planner</h1>
        </div>
        <EmptyState
          icon={CalendarDays}
          title="No household yet"
          description="Create a household to start planning meals together."
        />
      </div>
    );
  }

  const sp = await searchParams;
  const weekStart = sp.week ? mondayOf(new Date(sp.week)) : mondayOf(new Date());
  const weekStartISO = toISODate(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const prevWeek = toISODate(addDays(weekStart, -7));
  const nextWeek = toISODate(addDays(weekStart, 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const householdId = ctx.activeHousehold.householdId;
  const canEdit = ctx.activeHousehold.role === "owner" || ctx.activeHousehold.role === "editor";
  const supabase = await createClient();

  const [{ data: mealPlan }, { data: recipeRows }, { data: memberRows }] = await Promise.all([
    supabase.from("meal_plans").select("id").eq("household_id", householdId).eq("start_date", weekStartISO).maybeSingle(),
    supabase
      .from("recipes")
      .select("id, title")
      .or(`and(visibility.eq.household,household_id.eq.${householdId}),and(visibility.eq.personal,created_by.eq.${ctx.userId})`)
      .is("deleted_at", null)
      .order("title"),
    supabase
      .from("household_members")
      .select("user_id, profiles!household_members_user_id_fkey(display_name)")
      .eq("household_id", householdId),
  ]);

  const members = (memberRows ?? [])
    .filter((m) => m.profiles)
    .map((m) => ({ id: m.user_id, name: m.profiles!.display_name || "Member" }));

  type DayEntry = {
    id: string;
    mealType: MealType;
    servings: number;
    title: string;
    recipeId: string | null;
    memberNames: string[];
    macros: Macros;
  };

  const entriesByDay = new Map<string, DayEntry[]>();

  if (mealPlan) {
    const { data: entries } = await supabase
      .from("meal_plan_entries")
      .select(
        `id, entry_date, meal_type, servings, custom_title, recipe_id,
         recipes(title, servings, recipe_ingredients(ingredient_name, quantity, unit, nutrition_override,
           ingredients(ingredient_nutrition(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g),
             ingredient_measurement_conversions(unit, grams_per_unit)))),
         meal_plan_member_portions(user_id, profiles!meal_plan_member_portions_user_id_fkey(display_name))`
      )
      .eq("meal_plan_id", mealPlan.id)
      .order("entry_date")
      .order("meal_type");

    for (const e of entries ?? []) {
      let macros: Macros = EMPTY_MACROS;

      if (e.recipes) {
        const inputs: RecipeIngredientForCalc[] = e.recipes.recipe_ingredients.map((ing) => ({
          id: ing.ingredient_name,
          ingredientName: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          nutritionOverride: ing.nutrition_override as NutrientSet | null,
          ingredientNutrition: ing.ingredients?.ingredient_nutrition ?? null,
          conversions: Object.fromEntries(
            (ing.ingredients?.ingredient_measurement_conversions ?? []).map((c) => [c.unit, c.grams_per_unit])
          ),
        }));
        const totals = calculateRecipeNutrition(inputs).nutrients;
        const factor = e.recipes.servings > 0 ? Number(e.servings) / e.recipes.servings : 0;
        const scaled = multiplyNutrients(totals, factor);
        macros = Object.fromEntries(MACRO_KEYS.map((k) => [k, scaled[k]])) as Macros;
      }

      const list = entriesByDay.get(e.entry_date) ?? [];
      list.push({
        id: e.id,
        mealType: e.meal_type,
        servings: Number(e.servings),
        title: e.recipes?.title ?? e.custom_title ?? "Meal",
        recipeId: e.recipe_id,
        memberNames: (e.meal_plan_member_portions ?? []).map((p) => p.profiles?.display_name || "Member"),
        macros,
      });
      entriesByDay.set(e.entry_date, list);
    }
  }

  const totalEntries = Array.from(entriesByDay.values()).reduce((sum, list) => sum + list.length, 0);
  const formatHeader = (d: Date) => d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Meal Planner</h1>
          <p className="text-sm text-muted-foreground">
            Week of {formatHeader(weekStart)} – {formatHeader(weekEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" render={<Link href={`/meal-planner?week=${prevWeek}`} />}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" render={<Link href={`/meal-planner?week=${toISODate(mondayOf(new Date()))}`} />}>
            This week
          </Button>
          <Button variant="outline" size="icon" render={<Link href={`/meal-planner?week=${nextWeek}`} />}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          {mealPlan && totalEntries > 0 ? (
            <GenerateShoppingListButton mealPlanId={mealPlan.id} weekLabel={`${formatHeader(weekStart)} – ${formatHeader(weekEnd)}`} />
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day) => {
          const dateISO = toISODate(day);
          const dayLabel = day.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
          const dayEntries = entriesByDay.get(dateISO) ?? [];
          const isToday = dateISO === toISODate(new Date());
          const dayTotals = MACRO_KEYS.map((key) => ({
            key,
            ...NUTRIENT_LABELS[key],
            value: dayEntries.reduce((sum, e) => sum + (e.macros[key].value ?? 0), 0),
            known: dayEntries.some((e) => e.macros[key].value != null),
            complete: dayEntries.every((e) => e.macros[key].value != null && e.macros[key].complete),
          }));
          const dayCalories = dayTotals.find((t) => t.key === "calories_kcal")!;
          const dayMacroBadges = dayTotals.filter((t) => t.key !== "calories_kcal" && t.known);
          const dayHasNutrition = dayTotals.some((t) => t.known);

          return (
            <div key={dateISO} className={`space-y-2 rounded-lg border p-3 ${isToday ? "border-primary/40 bg-primary/5" : ""}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{dayLabel}</p>
                {canEdit ? (
                  <AddMealEntryDialog
                    weekStart={weekStartISO}
                    date={dateISO}
                    dateLabel={dayLabel}
                    recipes={recipeRows ?? []}
                    members={members}
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                {MEAL_ORDER.filter((mt) => dayEntries.some((e) => e.mealType === mt)).map((mt) => (
                  <div key={mt} className="space-y-1">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      {MEAL_LABELS[mt]}
                    </p>
                    {dayEntries
                      .filter((e) => e.mealType === mt)
                      .map((e) => (
                        <MealEntryCard
                          key={e.id}
                          id={e.id}
                          title={e.title}
                          recipeId={e.recipeId}
                          servings={e.servings}
                          memberNames={e.memberNames}
                          macros={e.macros}
                          canEdit={canEdit}
                        />
                      ))}
                  </div>
                ))}
                {dayEntries.length === 0 ? <p className="text-xs text-muted-foreground">Nothing planned</p> : null}
              </div>
              {dayHasNutrition ? (
                <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Day total</p>
                  {dayCalories.known ? (
                    <p className="font-semibold tabular-nums">
                      {Math.round(dayCalories.value).toLocaleString()}
                      {dayCalories.complete ? "" : "+"}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">kcal</span>
                    </p>
                  ) : null}
                  {dayMacroBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {dayMacroBadges.map((t) => (
                        <Badge key={t.key} variant="outline" className="font-normal tabular-nums">
                          {SHORT_MACRO_LABELS[t.key]} {Math.round(t.value).toLocaleString()}
                          {t.complete ? "" : "+"}
                          {t.unit}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
