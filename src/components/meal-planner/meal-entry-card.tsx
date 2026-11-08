"use client";

import Link from "next/link";
import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteMealPlanEntryAction } from "@/app/(app)/meal-planner/actions";
import { formatMacroValue } from "@/lib/nutrition/format";
import type { Macros } from "@/lib/nutrition/calculate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

  const content = (
    <div className="space-y-1">
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">
        {servings} serving{servings === 1 ? "" : "s"}
        {memberNames.length > 0 ? ` · ${memberNames.join(", ")}` : ""}
      </p>
      {kcal != null ? (
        <Badge variant="secondary" className="font-medium tabular-nums">
          {kcal} kcal
        </Badge>
      ) : null}
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
