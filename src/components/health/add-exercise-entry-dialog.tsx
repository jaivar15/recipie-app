"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addExerciseEntryAction } from "@/app/(app)/health/exercise/actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ExerciseActivityType = Database["public"]["Enums"]["exercise_activity_type"];
type ExerciseIntensity = Database["public"]["Enums"]["exercise_intensity"];

const ACTIVITY_LABELS: Record<ExerciseActivityType, string> = {
  walking: "Walking",
  yoga: "Yoga",
  muay_thai: "Muay Thai",
  strength_training: "Strength training",
  cycling: "Cycling",
  running: "Running",
  swimming: "Swimming",
  other: "Other",
};
const ACTIVITY_TYPES = Object.keys(ACTIVITY_LABELS) as ExerciseActivityType[];

const INTENSITY_LABELS: Record<ExerciseIntensity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
};
const INTENSITIES = Object.keys(INTENSITY_LABELS) as ExerciseIntensity[];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AddExerciseEntryDialog() {
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(today());
  const [activityType, setActivityType] = useState<ExerciseActivityType>("walking");
  const [duration, setDuration] = useState("30");
  const [intensity, setIntensity] = useState<ExerciseIntensity | "">("");
  const [distanceKm, setDistanceKm] = useState("");
  const [steps, setSteps] = useState("");
  const [estimatedCalories, setEstimatedCalories] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function reset() {
    setEntryDate(today());
    setActivityType("walking");
    setDuration("30");
    setIntensity("");
    setDistanceKm("");
    setSteps("");
    setEstimatedCalories("");
    setNotes("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Log activity
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const minutes = Number(duration);
            if (!minutes || minutes <= 0) return;
            startTransition(async () => {
              await addExerciseEntryAction({
                entryDate,
                activityType,
                durationMinutes: minutes,
                intensity: intensity || null,
                distanceKm: distanceKm ? Number(distanceKm) : null,
                steps: steps ? Number(steps) : null,
                estimatedCalories: estimatedCalories ? Number(estimatedCalories) : null,
                notes,
              });
              setOpen(false);
              reset();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Log activity</DialogTitle>
            <DialogDescription>
              Any calorie figure you enter is your own estimate, kept separate from your food
              budget.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exercise-date">Date</Label>
                <Input
                  id="exercise-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  max={today()}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Activity</Label>
                <Select
                  value={activityType}
                  onValueChange={(v) => setActivityType(v as ExerciseActivityType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => ACTIVITY_LABELS[value as ExerciseActivityType]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {ACTIVITY_LABELS[a]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exercise-duration">Duration (minutes)</Label>
                <Input
                  id="exercise-duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Intensity (optional)</Label>
                <Select
                  value={intensity}
                  onValueChange={(v) => setIntensity((v as ExerciseIntensity) ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Not set">
                      {(value: string) =>
                        value ? INTENSITY_LABELS[value as ExerciseIntensity] : "Not set"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {INTENSITIES.map((i) => (
                      <SelectItem key={i} value={i}>
                        {INTENSITY_LABELS[i]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="exercise-distance">Distance (km)</Label>
                <Input
                  id="exercise-distance"
                  type="number"
                  min={0}
                  step="0.1"
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise-steps">Steps</Label>
                <Input
                  id="exercise-steps"
                  type="number"
                  min={0}
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exercise-calories">Calories (est.)</Label>
                <Input
                  id="exercise-calories"
                  type="number"
                  min={0}
                  value={estimatedCalories}
                  onChange={(e) => setEstimatedCalories(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exercise-notes">Notes (optional)</Label>
              <Textarea
                id="exercise-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !duration}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
