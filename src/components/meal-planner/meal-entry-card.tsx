"use client";

import Link from "next/link";
import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteMealPlanEntryAction } from "@/app/(app)/meal-planner/actions";
import { formatMacroValue } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/calculate";
import { Button } from "@/components/ui/button";

const SECONDARY_MACROS: { key: keyof Macros; label: string }[] = [
  { key: "protein_g", label: "P" },
  { key: "carbohydrate_g", label: "C" },
  { key: "fat_g", label: "F" },
  { key: "fibre_g", label: "Fb" },
];

export function MealEntryCard({
  id,
  title,
  recipeId,
  servings,
  memberNames,
  macros,
  canEdit,
}: {
  id: string;
  title: string;
  recipeId: string | null;
  servings: number;
  memberNames: string[];
  macros: Macros;
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const kcal = formatMacroValue(macros.calories_kcal.value, macros.calories_kcal.complete);
  const secondaryLine = SECONDARY_MACROS.map((m) => {
    const formatted = formatMacroValue(macros[m.key].value, macros[m.key].complete);
    return formatted ? `${m.label} ${formatted}g` : null;
  })
    .filter(Boolean)
    .join(" · ");

  const content = (
    <div className="space-y-0.5">
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">
        {servings} serving{servings === 1 ? "" : "s"}
        {memberNames.length > 0 ? ` · ${memberNames.join(", ")}` : ""}
      </p>
      {kcal != null ? <p className="text-xs font-medium text-foreground">{kcal} kcal</p> : null}
      {secondaryLine ? <p className="text-[11px] text-muted-foreground">{secondaryLine}</p> : null}
    </div>
  );

  return (
    <div className="group relative rounded-md border bg-card p-2 pr-6">
      {recipeId ? (
        <Link href={`/recipes/${recipeId}`} className="hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
      {canEdit ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          className="absolute top-1 right-1 h-5 w-5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => startTransition(() => deleteMealPlanEntryAction(id))}
        >
          <X className="h-3 w-3" />
        </Button>
      ) : null}
    </div>
  );
}
