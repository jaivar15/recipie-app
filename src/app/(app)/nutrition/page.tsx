import { Activity } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function NutritionPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
        <p className="text-sm text-muted-foreground">
          Recipe nutrition calculator, comparisons and daily planned totals.
        </p>
      </div>
      <EmptyState
        icon={Activity}
        title="The nutrition engine ships in Phase 3"
        description="Calories, macros and micronutrients per recipe, per serving, and per 100g — never fabricated, with sources shown."
      />
    </div>
  );
}
