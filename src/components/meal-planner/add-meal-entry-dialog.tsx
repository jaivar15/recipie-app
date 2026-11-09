"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addMealPlanEntryAction } from "@/app/(app)/meal-planner/actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type MealType = Database["public"]["Enums"]["meal_type"];
const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function AddMealEntryDialog({
  weekStart,
  date,
  dateLabel,
  recipes,
  members,
}: {
  weekStart: string;
  date: string;
  dateLabel: string;
  recipes: { id: string; title: string }[];
  members: { id: string; name: string; preferences: string[] }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"recipe" | "custom">("recipe");
  const [recipeId, setRecipeId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [mealType, setMealType] = useState<MealType>("dinner");
  const [servings, setServings] = useState("4");
  const [notes, setNotes] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const canSubmit = mode === "recipe" ? !!recipeId : customTitle.trim().length > 0;

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  function reset() {
    setRecipeId("");
    setCustomTitle("");
    setMealType("dinner");
    setServings("4");
    setNotes("");
    setMemberIds([]);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            startTransition(async () => {
              await addMealPlanEntryAction(weekStart, {
                entryDate: date,
                mealType,
                recipeId: mode === "recipe" ? recipeId : null,
                customTitle: mode === "custom" ? customTitle : null,
                servings: Number(servings) || 1,
                notes,
                memberIds,
              });
              setOpen(false);
              reset();
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Add meal — {dateLabel}</DialogTitle>
            <DialogDescription>Plan a recipe or a one-off meal for this day.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "recipe" | "custom")}>
              <TabsList className="w-full">
                <TabsTrigger value="recipe" className="flex-1">
                  From a recipe
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Custom
                </TabsTrigger>
              </TabsList>
              <TabsContent value="recipe" className="pt-3">
                <Select value={recipeId} onValueChange={(v) => setRecipeId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a recipe">
                      {(value: string) =>
                        recipes.find((r) => r.id === value)?.title ?? "Choose a recipe"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>
              <TabsContent value="custom" className="pt-3">
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. Takeout, Leftovers…"
                />
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Meal</Label>
                <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => MEAL_TYPES.find((m) => m.value === value)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meal-servings">Servings</Label>
                <Input
                  id="meal-servings"
                  type="number"
                  min={1}
                  step="0.5"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
              </div>
            </div>

            {members.length > 0 ? (
              <div className="space-y-2">
                <Label>Who&apos;s eating?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={memberIds.includes(m.id)}
                        onCheckedChange={() => toggleMember(m.id)}
                        className="mt-0.5"
                      />
                      <span className="space-y-1">
                        <span className="block">{m.name}</span>
                        {m.preferences.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {m.preferences.map((p) => (
                              <Badge key={p} variant="outline" className="font-normal">
                                {p}
                              </Badge>
                            ))}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="meal-notes">Notes</Label>
              <Textarea
                id="meal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isPending}>
              Add to plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
