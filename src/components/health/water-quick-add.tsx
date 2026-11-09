"use client";

import { useTransition } from "react";
import { Undo2 } from "lucide-react";
import { addWaterEntryAction, removeLastWaterEntryAction } from "@/app/(app)/health/actions";
import { Button } from "@/components/ui/button";

const PRESETS_ML = [250, 500];

export function WaterQuickAdd({ hasEntriesToday }: { hasEntriesToday: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS_ML.map((ml) => (
        <Button
          key={ml}
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => startTransition(() => addWaterEntryAction(ml))}
        >
          +{ml}ml
        </Button>
      ))}
      {hasEntriesToday ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Undo last"
          disabled={isPending}
          onClick={() => startTransition(() => removeLastWaterEntryAction())}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
