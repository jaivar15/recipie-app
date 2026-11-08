"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { restoreRecipeAction } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";

export function RestoreRecipeButton({ recipeId }: { recipeId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => restoreRecipeAction(recipeId))}
    >
      <Undo2 className="h-4 w-4" />
      {isPending ? "Restoring…" : "Restore"}
    </Button>
  );
}
