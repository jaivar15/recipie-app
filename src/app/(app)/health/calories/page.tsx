import Link from "next/link";
import { PieChart, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { macrosFromSnapshotRow, sumMacros } from "@/lib/health/food-diary";
import { formatMacroValue } from "@/lib/nutrition/format";
import type { MacroKey } from "@/lib/nutrition/calculate";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** UTC-based arithmetic throughout — see the matching comment in health/diary/page.tsx. */
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

const MACRO_TARGETS: {
  key: MacroKey;
  label: string;
  unit: string;
  barClassName: string;
  targetField: "calorie_target" | "protein_target_g" | "carb_target_g" | "fat_target_g" | "fibre_target_g";
}[] = [
  { key: "calories_kcal", label: "Calories", unit: "kcal", barClassName: "bg-chart-1", targetField: "calorie_target" },
  { key: "protein_g", label: "Protein", unit: "g", barClassName: "bg-chart-2", targetField: "protein_target_g" },
  { key: "carbohydrate_g", label: "Carbs", unit: "g", barClassName: "bg-chart-3", targetField: "carb_target_g" },
  { key: "fat_g", label: "Fat", unit: "g", barClassName: "bg-chart-4", targetField: "fat_target_g" },
  { key: "fibre_g", label: "Fibre", unit: "g", barClassName: "bg-chart-5", targetField: "fibre_target_g" },
];

export default async function CaloriesMacrosPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
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
  const [{ data: entryRows }, { data: exerciseRows }] = await Promise.all([
    supabase
      .from("food_diary_entries")
      .select(
        "food_diary_nutrition_snapshots(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g, calories_complete, protein_complete, carbs_complete, fat_complete, fibre_complete)"
      )
      .eq("user_id", ctx.userId)
      .eq("entry_date", entryDate),
    supabase.from("exercise_entries").select("estimated_calories").eq("user_id", ctx.userId).eq("entry_date", entryDate),
  ]);

  const dayTotal = sumMacros((entryRows ?? []).map((e) => macrosFromSnapshotRow(e.food_diary_nutrition_snapshots)));
  const exerciseCalories = (exerciseRows ?? []).reduce((sum, e) => sum + (e.estimated_calories ?? 0), 0);
  const hasAnyExercise = (exerciseRows ?? []).some((e) => e.estimated_calories != null);

  const g = ctx.goals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calories &amp; Macros</h1>
          <p className="text-sm text-muted-foreground">Today&apos;s intake against your targets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" render={<Link href={`/health/calories?date=${prevDate}`} />}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" render={<Link href={`/health/calories?date=${today}`} />}>
            Today
          </Button>
          <Button variant="outline" size="icon" render={<Link href={`/health/calories?date=${nextDate}`} />}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm font-medium">{dateLabel}</p>

      {!g ? (
        <EmptyState
          icon={PieChart}
          title="No nutrition goals set yet"
          description="Set a calorie and macro target on the Goals page to see progress here."
          action={
            <Button render={<Link href="/health/goals" />} variant="outline" size="sm">
              Set up goals
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {MACRO_TARGETS.map(({ key, label, unit, barClassName, targetField }) => {
            const result = dayTotal[key];
            const target = g[targetField] != null ? Number(g[targetField]) : null;
            const pct = result.value != null && target ? Math.min(100, Math.round((result.value / target) * 100)) : null;
            return (
              <Card key={key}>
                <CardHeader className="pb-0">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-xl font-semibold tabular-nums">
                    {result.value != null ? formatMacroValue(result.value, result.complete) : "—"}
                    {target != null ? <span className="text-sm font-normal text-muted-foreground"> / {target}{unit}</span> : <span className="text-sm font-normal text-muted-foreground"> {unit}</span>}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-all ${barClassName}`}
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                  {result.value == null ? (
                    <p className="text-xs text-muted-foreground">Not logged yet</p>
                  ) : !target ? (
                    <p className="text-xs text-muted-foreground">No target set</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Exercise today</p>
          <Flame className="h-4 w-4 text-chart-1" />
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold tabular-nums">
            {hasAnyExercise ? `${exerciseCalories} ` : "— "}
            <span className="text-sm font-normal text-muted-foreground">kcal (estimate)</span>
          </p>
          <p className="text-xs text-muted-foreground">
            An estimate from logged activity — kept separate from your calorie target above, not subtracted from it.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Targets are a guide, not a grade — going over or under on any day is normal.{" "}
        <Link href="/health/diary" className="underline">
          Go to Food Diary
        </Link>
      </p>
    </div>
  );
}
