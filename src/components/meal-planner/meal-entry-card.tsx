"use client";

import Link from "next/link";
import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteMealPlanEntryAction } from "@/app/(app)/meal-planner/actions";
import { Button } from "@/components/ui/button";

export function MealEntryCard({
  id,
  title,
  recipeId,
  servings,
  memberNames,
  canEdit,
}: {
  id: string;
  title: string;
  recipeId: string | null;
  servings: number;
  memberNames: string[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const content = (
    <div className="space-y-0.5">
      <p className="truncate text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">
        {servings} serving{servings === 1 ? "" : "s"}
        {memberNames.length > 0 ? ` · ${memberNames.join(", ")}` : ""}
      </p>
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
