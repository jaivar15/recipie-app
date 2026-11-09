"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteExerciseEntryAction } from "@/app/(app)/health/exercise/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ACTIVITY_LABELS: Record<string, string> = {
  walking: "Walking",
  yoga: "Yoga",
  muay_thai: "Muay Thai",
  strength_training: "Strength training",
  cycling: "Cycling",
  running: "Running",
  swimming: "Swimming",
  other: "Other",
};

export function ExerciseEntryRow({
  id,
  dateLabel,
  activityType,
  durationMinutes,
  intensity,
  distanceKm,
  steps,
  estimatedCalories,
  notes,
}: {
  id: string;
  dateLabel: string;
  activityType: string;
  durationMinutes: number;
  intensity: string | null;
  distanceKm: number | null;
  steps: number | null;
  estimatedCalories: number | null;
  notes: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{ACTIVITY_LABELS[activityType] ?? activityType}</p>
          <span className="text-xs text-muted-foreground">{dateLabel}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="font-normal tabular-nums">
            {durationMinutes} min
          </Badge>
          {intensity ? (
            <Badge variant="outline" className="font-normal capitalize">
              {intensity}
            </Badge>
          ) : null}
          {distanceKm != null ? (
            <Badge variant="outline" className="font-normal tabular-nums">
              {distanceKm} km
            </Badge>
          ) : null}
          {steps != null ? (
            <Badge variant="outline" className="font-normal tabular-nums">
              {steps.toLocaleString()} steps
            </Badge>
          ) : null}
          {estimatedCalories != null ? (
            <Badge variant="outline" className="font-normal tabular-nums">
              {estimatedCalories} kcal (est.)
            </Badge>
          ) : null}
        </div>
        {notes ? <p className="text-xs text-muted-foreground">{notes}</p> : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        onClick={() => startTransition(() => deleteExerciseEntryAction(id))}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
