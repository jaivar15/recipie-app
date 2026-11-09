"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addMeasurementAction } from "@/app/(app)/health/measurements/actions";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

const FIELDS = [
  { key: "waist", label: "Waist (cm)" },
  { key: "hips", label: "Hips (cm)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "neck", label: "Neck (cm)" },
  { key: "upperArm", label: "Upper arm (cm)" },
  { key: "thigh", label: "Thigh (cm)" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

export function AddMeasurementDialog() {
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(today());
  const [values, setValues] = useState<Record<FieldKey, string>>({
    waist: "",
    hips: "",
    chest: "",
    neck: "",
    upperArm: "",
    thigh: "",
  });
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  const hasAnyValue = FIELDS.some((f) => values[f.key].trim() !== "");

  function reset() {
    setEntryDate(today());
    setValues({ waist: "", hips: "", chest: "", neck: "", upperArm: "", thigh: "" });
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
        Log measurements
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!hasAnyValue) return;
            startTransition(async () => {
              await addMeasurementAction({
                entryDate,
                waistCm: values.waist ? Number(values.waist) : null,
                hipsCm: values.hips ? Number(values.hips) : null,
                chestCm: values.chest ? Number(values.chest) : null,
                neckCm: values.neck ? Number(values.neck) : null,
                upperArmCm: values.upperArm ? Number(values.upperArm) : null,
                thighCm: values.thigh ? Number(values.thigh) : null,
                notes,
              });
              setOpen(false);
              reset();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Log measurements</DialogTitle>
            <DialogDescription>Enter whatever you measured — leave the rest blank.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="measurement-date">Date</Label>
              <Input
                id="measurement-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                max={today()}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={`measurement-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`measurement-${f.key}`}
                    type="number"
                    step="0.1"
                    min="0"
                    value={values[f.key]}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="measurement-notes">Notes (optional)</Label>
              <Textarea id="measurement-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !hasAnyValue}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
