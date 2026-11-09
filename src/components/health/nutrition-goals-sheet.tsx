"use client";

import { useMemo, useState, useTransition } from "react";
import { Target } from "lucide-react";
import { saveNutritionGoalsAction } from "@/app/(app)/health/actions";
import {
  calculateAge,
  deriveCalorieTarget,
  estimateBMR,
  estimateTDEE,
  MAX_SAFE_RATE_KG_PER_WEEK,
} from "@/lib/health/calculations";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GoalMode = Database["public"]["Enums"]["nutrition_goal_mode"];
type Profile = Database["public"]["Tables"]["health_profiles"]["Row"] | null;
type Goals = Database["public"]["Tables"]["nutrition_goals"]["Row"] | null;

const MODE_LABELS: Record<GoalMode, string> = {
  maintenance: "Maintain current weight",
  loss: "Gradual weight loss",
  gain: "Muscle / weight gain",
  custom: "Custom targets",
};

export function NutritionGoalsSheet({ profile, goals }: { profile: Profile; goals: Goals }) {
  const [open, setOpen] = useState(false);
  const [goalMode, setGoalMode] = useState<GoalMode>(goals?.goal_mode ?? "maintenance");
  const [rate, setRate] = useState(goals?.rate_kg_per_week?.toString() ?? "0.5");
  const [calorieTarget, setCalorieTarget] = useState(goals?.calorie_target?.toString() ?? "");
  const [proteinTarget, setProteinTarget] = useState(goals?.protein_target_g?.toString() ?? "");
  const [carbTarget, setCarbTarget] = useState(goals?.carb_target_g?.toString() ?? "");
  const [fatTarget, setFatTarget] = useState(goals?.fat_target_g?.toString() ?? "");
  const [fibreTarget, setFibreTarget] = useState(goals?.fibre_target_g?.toString() ?? "25");
  const [waterTarget, setWaterTarget] = useState(goals?.water_target_ml?.toString() ?? "2000");
  const [isPending, startTransition] = useTransition();

  const estimate = useMemo(() => {
    if (!profile?.current_weight_kg || !profile.height_cm || !profile.date_of_birth) return null;
    const age = calculateAge(profile.date_of_birth);
    if (age == null) return null;
    const bmr = estimateBMR({
      weightKg: Number(profile.current_weight_kg),
      heightCm: Number(profile.height_cm),
      age,
      sex: profile.sex,
    });
    const tdee = estimateTDEE(bmr, profile.activity_level);
    return { bmr, tdee };
  }, [profile]);

  const suggested =
    estimate && goalMode !== "custom"
      ? deriveCalorieTarget({ tdee: estimate.tdee, goalMode, rateKgPerWeek: rate ? Number(rate) : null, sex: profile?.sex ?? null })
      : null;

  function applySuggested() {
    if (suggested) setCalorieTarget(String(suggested.calorieTarget));
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={goals ? "outline" : "default"} />}>
        <Target className="h-4 w-4" />
        {goals ? "Edit goals" : "Set nutrition goals"}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Nutrition goals</SheetTitle>
          <SheetDescription>Targets are always yours to adjust — nothing here is applied automatically.</SheetDescription>
        </SheetHeader>
        <form
          className="space-y-5 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await saveNutritionGoalsAction({
                goalMode,
                rateKgPerWeek: goalMode === "loss" || goalMode === "gain" ? Number(rate) : null,
                calorieTarget: calorieTarget ? Number(calorieTarget) : null,
                proteinTargetG: proteinTarget ? Number(proteinTarget) : null,
                carbTargetG: carbTarget ? Number(carbTarget) : null,
                fatTargetG: fatTarget ? Number(fatTarget) : null,
                fibreTargetG: fibreTarget ? Number(fibreTarget) : null,
                waterTargetMl: waterTarget ? Number(waterTarget) : null,
                estimatedTdee: estimate?.tdee ?? null,
              });
              setOpen(false);
            });
          }}
        >
          <div className="space-y-2">
            <Label>Goal</Label>
            <Select value={goalMode} onValueChange={(v) => setGoalMode((v as GoalMode) ?? "maintenance")}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v: string) => MODE_LABELS[v as GoalMode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(MODE_LABELS) as [GoalMode, string][]).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {goalMode === "loss" || goalMode === "gain" ? (
            <div className="space-y-2">
              <Label htmlFor="rate">Target rate (kg/week)</Label>
              <Input
                id="rate"
                type="number"
                step="0.1"
                min="0.1"
                max={MAX_SAFE_RATE_KG_PER_WEEK}
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Capped at {MAX_SAFE_RATE_KG_PER_WEEK} kg/week.</p>
            </div>
          ) : null}

          {estimate ? (
            <Alert>
              <AlertDescription className="space-y-1 text-xs">
                <p>
                  Estimated (Mifflin-St Jeor): <strong>{estimate.bmr} kcal</strong> resting,{" "}
                  <strong>{estimate.tdee} kcal</strong> total daily — this is a formula-based estimate, not a
                  measurement.
                </p>
                {suggested ? (
                  <p>
                    Suggested target: <strong>{suggested.calorieTarget} kcal</strong>.{" "}
                    {suggested.warning ? <span>{suggested.warning} </span> : null}
                    <button type="button" onClick={applySuggested} className="underline">
                      Use this
                    </button>
                  </p>
                ) : null}
              </AlertDescription>
            </Alert>
          ) : (
            <p className="text-xs text-muted-foreground">
              Add your height, weight and date of birth to your profile to see a calorie estimate here.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="calorie-target">Daily calorie target</Label>
            <Input
              id="calorie-target"
              type="number"
              min="1000"
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value)}
              placeholder="e.g. 2000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="protein-target">Protein (g)</Label>
              <Input id="protein-target" type="number" min="0" value={proteinTarget} onChange={(e) => setProteinTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carb-target">Carbs (g)</Label>
              <Input id="carb-target" type="number" min="0" value={carbTarget} onChange={(e) => setCarbTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat-target">Fat (g)</Label>
              <Input id="fat-target" type="number" min="0" value={fatTarget} onChange={(e) => setFatTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fibre-target">Fibre (g)</Label>
              <Input id="fibre-target" type="number" min="0" value={fibreTarget} onChange={(e) => setFibreTarget(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="water-target">Water target (ml)</Label>
            <Input id="water-target" type="number" min="0" step="250" value={waterTarget} onChange={(e) => setWaterTarget(e.target.value)} />
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={isPending}>
              Save goals
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
