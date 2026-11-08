import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function MealPlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meal Planner</h1>
        <p className="text-sm text-muted-foreground">Weekly calendar, household meal assignments and templates.</p>
      </div>
      <EmptyState
        icon={CalendarDays}
        title="The shared meal planner ships in Phase 5"
        description="Drag-and-drop meals, per-member serving portions, repeat meals, and saved weekly templates."
      />
    </div>
  );
}
