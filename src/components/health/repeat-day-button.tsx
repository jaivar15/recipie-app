"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { repeatDayAction } from "@/app/(app)/health/diary/actions";
import { Button } from "@/components/ui/button";

export function RepeatDayButton({ sourceDate, targetDate, label }: { sourceDate: string; targetDate: string; label: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => repeatDayAction(sourceDate, targetDate))}
    >
      <RotateCcw className="h-3.5 w-3.5" />
      {isPending ? "Repeating…" : label}
    </Button>
  );
}
