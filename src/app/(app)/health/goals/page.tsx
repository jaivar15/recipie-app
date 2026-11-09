import Link from "next/link";
import { Target } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { NutritionGoalsSheet } from "@/components/health/nutrition-goals-sheet";

export default async function GoalsPage() {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  const g = ctx.goals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals &amp; Progress</h1>
          <p className="text-sm text-muted-foreground">Your nutrition targets, and how you&apos;re tracking against them.</p>
        </div>
        <NutritionGoalsSheet profile={ctx.profile} goals={g} />
      </div>

      {!g ? (
        <EmptyState
          icon={Target}
          title="No nutrition goals set yet"
          description="Set a calorie and macro target so your Food Diary and Calories & Macros pages can show progress."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Calories</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {g.calorie_target ?? "—"} <span className="text-sm font-normal text-muted-foreground">kcal/day</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Protein</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {g.protein_target_g ?? "—"} <span className="text-sm font-normal text-muted-foreground">g/day</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Carbs</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {g.carb_target_g ?? "—"} <span className="text-sm font-normal text-muted-foreground">g/day</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fat</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {g.fat_target_g ?? "—"} <span className="text-sm font-normal text-muted-foreground">g/day</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fibre</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {g.fibre_target_g ?? "—"} <span className="text-sm font-normal text-muted-foreground">g/day</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-0">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Water</p>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {g.water_target_ml ?? "—"} <span className="text-sm font-normal text-muted-foreground">ml/day</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/health" className="underline">
          Back to overview
        </Link>
        {" · "}
        <Link href="/health/insights" className="underline">
          View trend charts
        </Link>
      </p>
    </div>
  );
}
