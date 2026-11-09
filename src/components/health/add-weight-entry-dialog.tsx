"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addWeightEntryAction } from "@/app/(app)/health/weight/actions";
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

export function AddWeightEntryDialog({ unit }: { unit: "kg" | "lb" }) {
  const [open, setOpen] = useState(false);
  const [entryDate, setEntryDate] = useState(today());
  const [entryTime, setEntryTime] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        Log weight
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const value = Number(weight);
            if (!value || value <= 0) return;
            const weightKg = unit === "lb" ? value / 2.20462 : value;
            startTransition(async () => {
              await addWeightEntryAction({ entryDate, entryTime: entryTime || null, weightKg, notes });
              setOpen(false);
              setWeight("");
              setNotes("");
              setEntryTime("");
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Log a weigh-in</DialogTitle>
            <DialogDescription>You can log more than once a day — the latest entry is used for daily summaries.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="weight-date">Date</Label>
                <Input id="weight-date" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} max={today()} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight-time">Time (optional)</Label>
                <Input id="weight-time" type="time" value={entryTime} onChange={(e) => setEntryTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight-value">Weight ({unit})</Label>
              <Input
                id="weight-value"
                type="number"
                step="0.1"
                min="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight-notes">Notes (optional)</Label>
              <Textarea id="weight-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !weight}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
