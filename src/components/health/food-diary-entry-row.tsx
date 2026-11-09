"use client";

import { useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";
import { copyFoodDiaryEntryAction, deleteFoodDiaryEntryAction } from "@/app/(app)/health/diary/actions";
import { formatMacroValue } from "@/lib/nutrition/format";
import { MACRO_KEYS, NUTRIENT_LABELS, type NutrientResult, type MacroKey } from "@/lib/nutrition/calculate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SHORT_MACRO_LABELS: Record<MacroKey, string> = {
  calories_kcal: "Cal",
  protein_g: "P",
  carbohydrate_g: "C",
  fat_g: "F",
  fibre_g: "Fb",
};

export function FoodDiaryEntryRow({
  id,
  title,
  quantityLabel,
  macros,
  today,
}: {
  id: string;
  title: string;
  quantityLabel: string | null;
  macros: Record<MacroKey, NutrientResult>;
  /** Today's date (ISO) — "copy" duplicates this entry onto today. */
  today: string;
}) {
  const [isPending, startTransition] = useTransition();
  const calories = macros.calories_kcal;
  const otherMacros = MACRO_KEYS.filter((k) => k !== "calories_kcal" && macros[k].value != null);

  return (
    <div className="flex items-start justify-between gap-2 rounded-md border p-2">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {quantityLabel ? <span className="text-xs text-muted-foreground">{quantityLabel}</span> : null}
          {calories.value != null ? (
            <Badge variant="outline" className="font-normal tabular-nums">
              {formatMacroValue(calories.value, calories.complete)} {NUTRIENT_LABELS.calories_kcal.unit}
            </Badge>
          ) : (
            <span className="text-xs text-muted-foreground">Nutrition unknown</span>
          )}
          {otherMacros.map((k) => (
            <Badge key={k} variant="outline" className="font-normal tabular-nums">
              {SHORT_MACRO_LABELS[k]} {formatMacroValue(macros[k].value, macros[k].complete)}
              {NUTRIENT_LABELS[k].unit}
            </Badge>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Copy to today"
          disabled={isPending}
          onClick={() => startTransition(() => copyFoodDiaryEntryAction(id, today))}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Delete"
          disabled={isPending}
          onClick={() => startTransition(() => deleteFoodDiaryEntryAction(id))}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
