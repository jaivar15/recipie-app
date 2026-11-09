import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { rollingAverage, kgToLb } from "@/lib/health/calculations";
import { macrosFromSnapshotRow } from "@/lib/health/food-diary";
import { buildNeutralInsights, averageKnown } from "@/lib/health/insights";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { WeightTrendChart, type WeightTrendPoint } from "@/components/health/weight-trend-chart";
import { CalorieTrendChart, type CalorieTrendPoint } from "@/components/health/calorie-trend-chart";
import {
  ProteinFibreTrendChart,
  type ProteinFibreTrendPoint,
} from "@/components/health/protein-fibre-trend-chart";
import {
  MeasurementTrendChart,
  type MeasurementTrendPoint,
} from "@/components/health/measurement-trend-chart";
import {
  ActivityTrendChart,
  type ActivityTrendPoint,
} from "@/components/health/activity-trend-chart";

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDaysUTC(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

export default async function NutritionInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  const sp = await searchParams;
  const range = (RANGES.includes(Number(sp.range) as Range) ? Number(sp.range) : 30) as Range;
  const today = toISODate(new Date());
  const startISO = addDaysUTC(today, -(range - 1));
  const unit = (ctx.profile?.weight_unit ?? "kg") as "kg" | "lb";
  const days = Array.from({ length: range }, (_, i) => addDaysUTC(startISO, i));

  const supabase = await createClient();
  const [
    { data: weightRows },
    { data: diaryRows },
    { data: measurementRows },
    { data: exerciseRows },
  ] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("entry_date, entry_time, weight_kg, created_at")
      .eq("user_id", ctx.userId)
      .gte("entry_date", startISO)
      .lte("entry_date", today)
      .order("entry_date")
      .order("entry_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("food_diary_entries")
      .select(
        "entry_date, food_diary_nutrition_snapshots(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g, calories_complete, protein_complete, carbs_complete, fat_complete, fibre_complete)",
      )
      .eq("user_id", ctx.userId)
      .gte("entry_date", startISO)
      .lte("entry_date", today),
    supabase
      .from("body_measurements")
      .select("entry_date, waist_cm, hips_cm")
      .eq("user_id", ctx.userId)
      .gte("entry_date", startISO)
      .lte("entry_date", today)
      .order("entry_date"),
    supabase
      .from("exercise_entries")
      .select("entry_date, duration_minutes")
      .eq("user_id", ctx.userId)
      .gte("entry_date", startISO)
      .lte("entry_date", today),
  ]);

  // Weight: one entry-of-record per day (latest by time, then created_at).
  const weightByDate = new Map<string, number>();
  for (const r of weightRows ?? []) {
    if (!weightByDate.has(r.entry_date)) weightByDate.set(r.entry_date, Number(r.weight_kg));
  }
  const weightDaysAsc = [...weightByDate.keys()].sort();
  const weightValuesKg = weightDaysAsc.map((d) => weightByDate.get(d)!);
  const weightRolling = rollingAverage(weightValuesKg, 7);
  const weightRollingByDate = new Map(weightDaysAsc.map((d, i) => [d, weightRolling[i]]));

  // Food diary: sum calories/protein/fibre per day across all entries that day.
  const caloriesByDate = new Map<string, number[]>();
  const proteinByDate = new Map<string, number[]>();
  const fibreByDate = new Map<string, number[]>();
  for (const e of diaryRows ?? []) {
    const m = macrosFromSnapshotRow(e.food_diary_nutrition_snapshots);
    if (m.calories_kcal.value != null) {
      const list = caloriesByDate.get(e.entry_date) ?? [];
      list.push(m.calories_kcal.value);
      caloriesByDate.set(e.entry_date, list);
    }
    if (m.protein_g.value != null) {
      const list = proteinByDate.get(e.entry_date) ?? [];
      list.push(m.protein_g.value);
      proteinByDate.set(e.entry_date, list);
    }
    if (m.fibre_g.value != null) {
      const list = fibreByDate.get(e.entry_date) ?? [];
      list.push(m.fibre_g.value);
      fibreByDate.set(e.entry_date, list);
    }
  }
  const sumOrNull = (list: number[] | undefined) =>
    list && list.length > 0 ? list.reduce((a, b) => a + b, 0) : null;

  // Measurements.
  const waistByDate = new Map<string, number>();
  const hipsByDate = new Map<string, number>();
  for (const r of measurementRows ?? []) {
    if (r.waist_cm != null) waistByDate.set(r.entry_date, Number(r.waist_cm));
    if (r.hips_cm != null) hipsByDate.set(r.entry_date, Number(r.hips_cm));
  }

  // Exercise minutes per day.
  const minutesByDate = new Map<string, number>();
  for (const r of exerciseRows ?? []) {
    minutesByDate.set(r.entry_date, (minutesByDate.get(r.entry_date) ?? 0) + r.duration_minutes);
  }

  const dateLabel = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  const weightChartData: WeightTrendPoint[] = days.map((d) => {
    const kg = weightByDate.get(d);
    const rollingKg = weightRollingByDate.get(d);
    return {
      date: dateLabel(d),
      weight: kg != null ? Math.round((unit === "lb" ? kgToLb(kg) : kg) * 10) / 10 : null,
      rollingAverage:
        rollingKg != null
          ? Math.round((unit === "lb" ? kgToLb(rollingKg) : rollingKg) * 10) / 10
          : null,
    };
  });
  const hasWeightData = weightDaysAsc.length > 0;

  const calorieChartData: CalorieTrendPoint[] = days.map((d) => ({
    date: dateLabel(d),
    calories: sumOrNull(caloriesByDate.get(d)),
  }));
  const hasCalorieData = caloriesByDate.size > 0;

  const proteinFibreChartData: ProteinFibreTrendPoint[] = days.map((d) => ({
    date: dateLabel(d),
    protein: sumOrNull(proteinByDate.get(d)),
    fibre: sumOrNull(fibreByDate.get(d)),
  }));
  const hasProteinFibreData = proteinByDate.size > 0 || fibreByDate.size > 0;

  const measurementChartData: MeasurementTrendPoint[] = days
    .filter((d) => waistByDate.has(d) || hipsByDate.has(d))
    .map((d) => ({
      date: dateLabel(d),
      waist: waistByDate.get(d) ?? null,
      hips: hipsByDate.get(d) ?? null,
    }));
  const hasMeasurementData = measurementChartData.length > 0;

  const activityChartData: ActivityTrendPoint[] = days.map((d) => ({
    date: dateLabel(d),
    minutes: minutesByDate.get(d) ?? 0,
  }));
  const hasActivityData = minutesByDate.size > 0;

  const avgCalories = averageKnown(days.map((d) => sumOrNull(caloriesByDate.get(d))));
  const avgProtein = averageKnown(days.map((d) => sumOrNull(proteinByDate.get(d))));
  const avgFibre = averageKnown(days.map((d) => sumOrNull(fibreByDate.get(d))));
  const totalExerciseMinutes = [...minutesByDate.values()].reduce((a, b) => a + b, 0);

  const insights = buildNeutralInsights({
    periodDays: range,
    weightLoggedDays: weightDaysAsc.length,
    weightSeriesKg: weightValuesKg,
    calorieLoggedDays: caloriesByDate.size,
    avgCalories,
    calorieTarget: ctx.goals?.calorie_target ?? null,
    avgProtein,
    proteinTarget: ctx.goals?.protein_target_g != null ? Number(ctx.goals.protein_target_g) : null,
    avgFibre,
    fibreTarget: ctx.goals?.fibre_target_g != null ? Number(ctx.goals.fibre_target_g) : null,
    exerciseLoggedDays: minutesByDate.size,
    totalExerciseMinutes,
  });

  const hasAnyData =
    hasWeightData || hasCalorieData || hasProteinFibreData || hasMeasurementData || hasActivityData;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrition Insights</h1>
          <p className="text-sm text-muted-foreground">
            Neutral, evidence-informed observations about your recent trends.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border p-1">
          {RANGES.map((r) => (
            <Button
              key={r}
              size="sm"
              variant={r === range ? "default" : "ghost"}
              render={<Link href={`/health/insights?range=${r}`} />}
            >
              {r}d
            </Button>
          ))}
        </div>
      </div>

      {!hasAnyData ? (
        <EmptyState
          icon={Lightbulb}
          title="Not enough data yet"
          description="Log weight, food, measurements or activity to start seeing trends here."
        />
      ) : (
        <>
          {insights.length > 0 ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Observations</p>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
                  {insights.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {hasWeightData ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Weight trend</p>
              </CardHeader>
              <CardContent>
                <WeightTrendChart data={weightChartData} unit={unit} />
              </CardContent>
            </Card>
          ) : null}

          {hasCalorieData ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Calories</p>
              </CardHeader>
              <CardContent>
                <CalorieTrendChart
                  data={calorieChartData}
                  target={ctx.goals?.calorie_target ?? null}
                />
              </CardContent>
            </Card>
          ) : null}

          {hasProteinFibreData ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Protein &amp; fibre</p>
              </CardHeader>
              <CardContent>
                <ProteinFibreTrendChart data={proteinFibreChartData} />
              </CardContent>
            </Card>
          ) : null}

          {hasMeasurementData ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Waist &amp; hips</p>
              </CardHeader>
              <CardContent>
                <MeasurementTrendChart data={measurementChartData} />
              </CardContent>
            </Card>
          ) : null}

          {hasActivityData ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Activity</p>
              </CardHeader>
              <CardContent>
                <ActivityTrendChart data={activityChartData} />
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
