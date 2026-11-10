import Link from "next/link";
import { CalendarClock } from "lucide-react";
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
import { formatMacroValue } from "@/lib/nutrition/format";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MacroTrendChart, type MacroTrendPoint } from "@/components/nutrition/macro-trend-chart";

const PERIODS = [7, 14, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const CARD_META = [
  { key: "calories_kcal" as const, icon: "🔥" },
  { key: "protein_g" as const, icon: "🥩" },
  { key: "carbohydrate_g" as const, icon: "🌾" },
  { key: "fat_g" as const, icon: "💧" },
];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function NutritionDiary({
  householdId,
  userId,
  period: rawPeriod,
}: {
  householdId: string | null;
  userId: string;
  period?: string;
}) {
  if (!householdId) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No household yet"
        description="Daily tracking follows meals planned in a household's meal planner."
      />
    );
  }

  const period = (PERIODS.includes(Number(rawPeriod) as Period) ? Number(rawPeriod) : 90) as Period;
  const today = todayLocal();
  const startDate = addDays(today, -(period - 1));
  const startISO = toISODate(startDate);
  const todayISO = toISODate(today);

  const supabase = await createClient();
  const { data: entries } = await supabase
    .from("meal_plan_entries")
    .select(
      `entry_date, servings, recipe_id,
       recipes(servings, recipe_ingredients(ingredient_name, quantity, unit, nutrition_override,
         ingredients(nutrition_reference_amount, nutrition_reference_unit, ingredient_nutrition(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g),
           ingredient_measurement_conversions(unit, grams_per_unit)))),
       meal_plan_member_portions(user_id, portions),
       meal_plans!inner(household_id)`,
    )
    .eq("meal_plans.household_id", householdId)
    .gte("entry_date", startISO)
    .lte("entry_date", todayISO)
    .order("entry_date");

  // Attribute each entry to "me" by my share of its tagged portions — an
  // entry nobody tagged a "who's eating" member on can't be attributed to
  // anyone, so (correctly) it contributes nothing rather than a guess.
  const dayEntryMacros = new Map<string, Macros[]>();
  for (const e of entries ?? []) {
    if (!e.recipes) continue;
    const portionRows = e.meal_plan_member_portions ?? [];
    const myRow = portionRows.find((p) => p.user_id === userId);
    if (!myRow) continue;
    const totalPortions = portionRows.reduce((sum, p) => sum + Number(p.portions), 0);
    if (totalPortions <= 0) continue;

    const inputs: RecipeIngredientForCalc[] = e.recipes.recipe_ingredients.map((ing) => ({
      id: ing.ingredient_name,
      ingredientName: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      nutritionOverride: ing.nutrition_override as NutrientSet | null,
      ingredientNutrition: ing.ingredients?.ingredient_nutrition ?? null,
      nutritionReferenceAmount: ing.ingredients?.nutrition_reference_amount,
      nutritionReferenceUnit: ing.ingredients?.nutrition_reference_unit as "g" | "ml" | undefined,
      conversions: Object.fromEntries(
        (ing.ingredients?.ingredient_measurement_conversions ?? []).map((c) => [
          c.unit,
          c.grams_per_unit,
        ]),
      ),
    }));
    const totals = calculateRecipeNutrition(inputs).nutrients;
    const servingsFactor = e.recipes.servings > 0 ? Number(e.servings) / e.recipes.servings : 0;
    const myShare = Number(myRow.portions) / totalPortions;
    const scaled = multiplyNutrients(totals, servingsFactor * myShare);
    const macros = Object.fromEntries(MACRO_KEYS.map((k) => [k, scaled[k]])) as Macros;

    const list = dayEntryMacros.get(e.entry_date) ?? [];
    list.push(macros);
    dayEntryMacros.set(e.entry_date, list);
  }

  function aggregate(list: Macros[]): Macros {
    return Object.fromEntries(
      MACRO_KEYS.map((key) => [
        key,
        {
          value: list.some((m) => m[key].value != null)
            ? list.reduce((sum, m) => sum + (m[key].value ?? 0), 0)
            : null,
          complete: list.length > 0 && list.every((m) => m[key].value != null && m[key].complete),
        },
      ]),
    ) as Macros;
  }

  const dailyTotals = new Map<string, Macros>();
  for (const [date, list] of dayEntryMacros) {
    dailyTotals.set(date, aggregate(list));
  }

  const loggedDates = [...dailyTotals.keys()].sort((a, b) => (a < b ? 1 : -1));

  const todayMacros = dailyTotals.get(todayISO) ?? EMPTY_MACROS;

  const last7Start = toISODate(addDays(today, -6));
  const last7Dates = loggedDates.filter((d) => d >= last7Start && d <= todayISO);
  const avg7 = aggregate(last7Dates.flatMap((d) => dayEntryMacros.get(d) ?? []));
  const avg7Divided = Object.fromEntries(
    MACRO_KEYS.map((k) => [
      k,
      {
        value:
          avg7[k].value != null && last7Dates.length > 0
            ? avg7[k].value! / last7Dates.length
            : null,
        complete: avg7[k].complete,
      },
    ]),
  ) as Macros;

  const chartData: MacroTrendPoint[] = Array.from({ length: period }, (_, i) => {
    const d = addDays(startDate, i);
    const iso = toISODate(d);
    const macros = dailyTotals.get(iso);
    return {
      date: d.toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      protein: macros?.protein_g.value ?? 0,
      carbs: macros?.carbohydrate_g.value ?? 0,
      fat: macros?.fat_g.value ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Based on meals you&apos;re tagged as eating in the meal planner, scaled by your portion
          share.
        </p>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === period ? "default" : "outline"}
              render={<Link href={`/nutrition?tab=diary&period=${p}`} />}
            >
              {p}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARD_META.map(({ key, icon }) => {
          const label = NUTRIENT_LABELS[key];
          const today = formatMacroValue(todayMacros[key].value, todayMacros[key].complete);
          const avg = formatMacroValue(
            avg7Divided[key].value != null ? Math.round(avg7Divided[key].value!) : null,
            avg7Divided[key].complete,
          );
          return (
            <Card key={key}>
              <CardHeader className="flex-row items-center justify-between pb-0">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {label.label}
                </p>
                <span aria-hidden>{icon}</span>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-semibold tabular-nums">
                  {today ?? "0"}{" "}
                  <span className="text-sm font-normal text-muted-foreground">{label.unit}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {avg != null ? `${avg} ${label.unit}/day · 7d avg` : "No data in the last 7 days"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <p className="font-medium">Macro trend</p>
          <p className="text-sm text-muted-foreground">
            Daily protein, carbs and fat over the last {period} days
          </p>
        </CardHeader>
        <CardContent>
          <MacroTrendChart data={chartData} />
        </CardContent>
      </Card>

      {loggedDates.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing logged yet"
          description="Add meals in the Meal Planner and tag yourself under “Who's eating?” to start tracking."
        />
      ) : (
        <Card>
          <CardHeader>
            <p className="font-medium">Daily log</p>
            <p className="text-sm text-muted-foreground">
              {loggedDates.length} day{loggedDates.length === 1 ? "" : "s"} logged in this period
            </p>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Calories</TableHead>
                  <TableHead className="text-right">Protein</TableHead>
                  <TableHead className="text-right">Carbs</TableHead>
                  <TableHead className="text-right">Fat</TableHead>
                  <TableHead className="text-right">Fibre</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loggedDates.map((date) => {
                  const m = dailyTotals.get(date)!;
                  const label = new Date(date).toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <TableRow key={date}>
                      <TableCell className="font-medium">
                        {date === todayISO ? `${label} (today)` : label}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMacroValue(m.calories_kcal.value, m.calories_kcal.complete) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMacroValue(m.protein_g.value, m.protein_g.complete) ?? "—"}g
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMacroValue(m.carbohydrate_g.value, m.carbohydrate_g.complete) ?? "—"}
                        g
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMacroValue(m.fat_g.value, m.fat_g.complete) ?? "—"}g
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMacroValue(m.fibre_g.value, m.fibre_g.complete) ?? "—"}g
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
