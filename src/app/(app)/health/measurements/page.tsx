import { Ruler } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function BodyMeasurementsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Body Measurements</h1>
        <p className="text-sm text-muted-foreground">Waist, hips, chest and more, tracked privately over time.</p>
      </div>
      <EmptyState
        icon={Ruler}
        title="Coming next"
        description="Measurement logging and progress photos ship in the next build pass."
      />
    </div>
  );
}
