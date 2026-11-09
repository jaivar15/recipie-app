import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function ExerciseTrackerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exercise Tracker</h1>
        <p className="text-sm text-muted-foreground">Log activity — estimated calories are always labelled as estimates.</p>
      </div>
      <EmptyState icon={Dumbbell} title="Coming next" description="Exercise logging ships in the next build pass." />
    </div>
  );
}
