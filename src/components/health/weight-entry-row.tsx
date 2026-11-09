"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWeightEntryAction } from "@/app/(app)/health/weight/actions";
import { formatWeight } from "@/lib/health/calculations";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

export function WeightEntryRow({
  id,
  dateLabel,
  time,
  weightKg,
  unit,
  notes,
}: {
  id: string;
  dateLabel: string;
  time: string | null;
  weightKg: number;
  unit: "kg" | "lb";
  notes: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">
        {dateLabel}
        {time ? <span className="ml-1 text-xs text-muted-foreground">{time}</span> : null}
      </TableCell>
      <TableCell className="tabular-nums">{formatWeight(weightKg, unit)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{notes ?? ""}</TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() => startTransition(() => deleteWeightEntryAction(id))}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
