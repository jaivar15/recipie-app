"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { toggleShoppingListItemAction, deleteShoppingListItemAction } from "@/app/(app)/shopping-lists/actions";
import { UNIT_LABELS, type MEASUREMENT_UNITS } from "@/lib/validations/recipe";
import { formatQuantity } from "@/lib/nutrition/format";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export function ShoppingListItemRow({
  id,
  listId,
  name,
  quantity,
  unit,
  isChecked,
}: {
  id: string;
  listId: string;
  name: string;
  quantity: number | null;
  unit: (typeof MEASUREMENT_UNITS)[number] | null;
  isChecked: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="group flex items-center gap-3 rounded-md border bg-card px-3 py-2">
      <Checkbox
        checked={isChecked}
        disabled={isPending}
        onCheckedChange={() => startTransition(() => toggleShoppingListItemAction(id, listId))}
      />
      <div className={`flex-1 text-sm ${isChecked ? "text-muted-foreground line-through" : ""}`}>
        {quantity != null ? (
          <span className="mr-1.5 font-medium tabular-nums">
            {formatQuantity(quantity)}
            {unit ? ` ${UNIT_LABELS[unit]}` : ""}
          </span>
        ) : null}
        {name}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        disabled={isPending}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => startTransition(() => deleteShoppingListItemAction(id, listId))}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
