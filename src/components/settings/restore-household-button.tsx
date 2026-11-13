"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { restoreHouseholdAction } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";

export function RestoreHouseholdButton({ householdId }: { householdId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => startTransition(() => restoreHouseholdAction(householdId))}
    >
      <Undo2 className="h-4 w-4" />
      {isPending ? "Restoring…" : "Restore"}
    </Button>
  );
}
