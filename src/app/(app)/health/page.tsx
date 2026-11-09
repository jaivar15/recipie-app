import Link from "next/link";
import { HeartPulse, Scale, Flame, Droplets, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { summarizeWeightChange, formatWeight } from "@/lib/health/calculations";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthProfileSheet } from "@/components/health/health-profile-sheet";
import { NutritionGoalsSheet } from "@/components/health/nutrition-goals-sheet";
import { WaterQuickAdd } from "@/components/health/water-quick-add";

export default async function HealthOverviewPage() {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  if (!ctx.profile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Health &amp; Fitness</h1>
          <p className="text-sm text-muted-foreground">
            Private to you. Your household can&apos;t see your weight, food diary or measurements.
          </p>
        </div>
        <EmptyState
          icon={HeartPulse}
          title="Set up your health profile to get started"
          description="A few basics — height, weight, activity level — power your dashboard and an optional calorie estimate."
          action={<HealthProfileSheet profile={null} />}
        />
      </div>
    );
  }

  const unit = (ctx.profile.weight_unit ?? "kg") as "kg" | "lb";
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: latestWeight }, { data: todayWater }] = await Promise.all([
    supabase
      .from("weight_entries")
      .select("weight_kg, entry_date")
      .eq("user_id", ctx.userId)
      .order("entry_date", { ascending: false })
      .order("entry_time", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("water_entries").select("amount_ml").eq("user_id", ctx.userId).eq("entry_date", today),
  ]);

  const startingKg = ctx.profile.starting_weight_kg ? Number(ctx.profile.starting_weight_kg) : null;
  const currentKg = latestWeight ? Number(latestWeight.weight_kg) : ctx.profile.current_weight_kg ? Number(ctx.profile.current_weight_kg) : null;
  const targetKg = ctx.profile.target_weight_kg ? Number(ctx.profile.target_weight_kg) : null;
  const change = startingKg != null && currentKg != null ? summarizeWeightChange(startingKg, currentKg) : null;
  const waterToday = (todayWater ?? []).reduce((sum, w) => sum + w.amount_ml, 0);

  const TrendIcon = change?.trend === "down" ? TrendingDown : change?.trend === "up" ? TrendingUp : Minus;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Health &amp; Fitness</h1>
          <p className="text-sm text-muted-foreground">
            Private to you. Your household can&apos;t see your weight, food diary or measurements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HealthProfileSheet profile={ctx.profile} />
          <NutritionGoalsSheet profile={ctx.profile} goals={ctx.goals} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Starting</p>
            <Scale className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{startingKg != null ? formatWeight(startingKg, unit) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Current</p>
            <Scale className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{currentKg != null ? formatWeight(currentKg, unit) : "—"}</p>
            {latestWeight ? (
              <p className="text-xs text-muted-foreground">as of {new Date(latestWeight.entry_date).toLocaleDateString("en-AU")}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Target</p>
            <Scale className="h-4 w-4 text-chart-5" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{targetKg != null ? formatWeight(targetKg, unit) : "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Change</p>
            <TrendIcon className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {change ? `${change.totalChangeKg > 0 ? "+" : ""}${formatWeight(change.totalChangeKg, unit)}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {change?.percentChange != null ? `${change.percentChange.toFixed(1)}% since start` : "Log a starting weight to compare"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Daily calorie target</p>
            <Flame className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {ctx.goals?.calorie_target ?? "—"} <span className="text-sm font-normal text-muted-foreground">kcal</span>
            </p>
            <p className="text-xs text-muted-foreground">
              <Link href="/health/calories" className="underline">
                See today&apos;s intake
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Water today</p>
            <Droplets className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-semibold tabular-nums">
              {waterToday} <span className="text-sm font-normal text-muted-foreground">ml</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {ctx.goals?.water_target_ml ? `Target: ${ctx.goals.water_target_ml} ml` : "No target set"}
            </p>
            <WaterQuickAdd hasEntriesToday={waterToday > 0} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-0">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Quick links</p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" render={<Link href="/health/weight" />}>
              Log weight
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/health/diary" />}>
              Log food
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/health/goals" />}>
              View progress
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Short-term weight changes include water and digestion, not just fat — the Weight Tracker uses a 7-day
        average to help separate normal fluctuation from a longer-term trend.
      </p>
    </div>
  );
}
