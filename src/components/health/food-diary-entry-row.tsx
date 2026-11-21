"use client";

import { useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";
import {
  copyFoodDiaryEntryAction,
  deleteFoodDiaryEntryAction,
} from "@/app/(app)/health/diary/actions";
import { formatMacroValue } from "@/lib/nutrition/format";
import { type NutrientResult, type MacroKey } from "@/lib/nutrition/calculate";
import { Button } from "@/components/ui/button";

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

  const cell = (key: MacroKey) => {
    const formatted = formatMacroValue(macros[key].value, macros[key].complete);
    return formatted ?? <span className="text-muted-foreground">–</span>;
  };

  return (
    <tr className="border-b last:border-b-0">
      <td className="px-3 py-2 text-sm">{title}</td>
      <td className="px-3 py-2 text-sm text-muted-foreground">{quantityLabel ?? "–"}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{cell("calories_kcal")}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{cell("protein_g")}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{cell("carbohydrate_g")}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{cell("fat_g")}</td>
      <td className="px-3 py-2 text-right text-sm tabular-nums">{cell("fibre_g")}</td>
      <td className="px-3 py-2">
        <div className="flex justify-end gap-1">
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
      </td>
    </tr>
  );
}
