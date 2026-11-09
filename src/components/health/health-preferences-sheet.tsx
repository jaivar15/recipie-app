"use client";

import { useState, useTransition } from "react";
import { Salad } from "lucide-react";
import { saveHealthPreferencesAction } from "@/app/(app)/health/actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type Preferences = Database["public"]["Tables"]["health_preferences"]["Row"] | null;

const FIELDS = [
  { key: "strictGlutenFree", column: "strict_gluten_free", label: "Strict gluten-free" },
  { key: "vegetarian", column: "vegetarian", label: "Vegetarian" },
  { key: "lowFodmap", column: "low_fodmap", label: "Low FODMAP" },
  { key: "higherFibre", column: "higher_fibre", label: "Higher fibre" },
  { key: "lowerSaturatedFat", column: "lower_saturated_fat", label: "Lower saturated fat" },
  { key: "proteinFocused", column: "protein_focused", label: "Protein-focused" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

export function HealthPreferencesSheet({ preferences }: { preferences: Preferences }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<FieldKey, boolean>>(
    Object.fromEntries(FIELDS.map((f) => [f.key, preferences?.[f.column] ?? false])) as Record<FieldKey, boolean>
  );
  const [shareWithHousehold, setShareWithHousehold] = useState(preferences?.share_preferences_with_household ?? false);
  const [isPending, startTransition] = useTransition();

  function toggle(key: FieldKey) {
    setValues((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function save() {
    startTransition(async () => {
      await saveHealthPreferencesAction({
        strictGlutenFree: values.strictGlutenFree,
        vegetarian: values.vegetarian,
        lowFodmap: values.lowFodmap,
        higherFibre: values.higherFibre,
        lowerSaturatedFat: values.lowerSaturatedFat,
        proteinFocused: values.proteinFocused,
        sharePreferencesWithHousehold: shareWithHousehold,
      });
      setOpen(false);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <Salad className="h-4 w-4" />
        Preferences
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Food preferences</SheetTitle>
          <SheetDescription>
            Informational filters only — not medical diagnoses. These never affect your private weight or nutrition
            data.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <Checkbox checked={values[f.key]} onCheckedChange={() => toggle(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
          <div className="space-y-2 border-t pt-4">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={shareWithHousehold} onCheckedChange={() => setShareWithHousehold((v) => !v)} />
              <span>
                Share these preferences with my household
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Only the checked preferences above become visible to your household members, shown as tags when
                  planning meals — never your weight, measurements, goals or food diary.
                </span>
              </span>
            </label>
          </div>
        </div>
        <SheetFooter>
          <Button onClick={save} disabled={isPending}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
