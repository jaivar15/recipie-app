"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteMeasurementAction } from "@/app/(app)/health/measurements/actions";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";

function cm(value: number | null): string {
  return value != null ? `${value} cm` : "—";
}

export function MeasurementRow({
  id,
  dateLabel,
  waistCm,
  hipsCm,
  chestCm,
  neckCm,
  upperArmCm,
  thighCm,
  notes,
}: {
  id: string;
  dateLabel: string;
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  neckCm: number | null;
  upperArmCm: number | null;
  thighCm: number | null;
  notes: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="font-medium">{dateLabel}</TableCell>
      <TableCell className="tabular-nums">{cm(waistCm)}</TableCell>
      <TableCell className="tabular-nums">{cm(hipsCm)}</TableCell>
      <TableCell className="tabular-nums">{cm(chestCm)}</TableCell>
      <TableCell className="tabular-nums">{cm(neckCm)}</TableCell>
      <TableCell className="tabular-nums">{cm(upperArmCm)}</TableCell>
      <TableCell className="tabular-nums">{cm(thighCm)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{notes ?? ""}</TableCell>
      <TableCell className="text-right">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={isPending}
          onClick={() => startTransition(() => deleteMeasurementAction(id))}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
