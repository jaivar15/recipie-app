import { Lightbulb } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function NutritionInsightsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nutrition Insights</h1>
        <p className="text-sm text-muted-foreground">Neutral, evidence-informed observations about your recent trends.</p>
      </div>
      <EmptyState
        icon={Lightbulb}
        title="Coming next"
        description="Trend charts and insights ship once there's enough logged data to summarise."
      />
    </div>
  );
}
