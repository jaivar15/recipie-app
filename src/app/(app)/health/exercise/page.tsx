import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { AddExerciseEntryDialog } from "@/components/health/add-exercise-entry-dialog";
import { ExerciseEntryRow } from "@/components/health/exercise-entry-row";

export default async function ExerciseTrackerPage() {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: entryRows } = await supabase
    .from("exercise_entries")
    .select("id, entry_date, activity_type, duration_minutes, intensity, distance_km, steps, estimated_calories, notes")
    .eq("user_id", ctx.userId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  const rows = entryRows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Exercise Tracker</h1>
          <p className="text-sm text-muted-foreground">Log activity — estimated calories are always labelled as estimates.</p>
        </div>
        <AddExerciseEntryDialog />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Dumbbell} title="No activity logged yet" description="Log a workout to start building your history." />
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <ExerciseEntryRow
              key={r.id}
              id={r.id}
              dateLabel={new Date(r.entry_date).toLocaleDateString("en-AU", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              activityType={r.activity_type}
              durationMinutes={r.duration_minutes}
              intensity={r.intensity}
              distanceKm={r.distance_km != null ? Number(r.distance_km) : null}
              steps={r.steps}
              estimatedCalories={r.estimated_calories}
              notes={r.notes}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/health" className="underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
