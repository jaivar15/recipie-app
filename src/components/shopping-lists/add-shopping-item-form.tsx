"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addShoppingListItemAction } from "@/app/(app)/shopping-lists/actions";
import { MEASUREMENT_UNITS, UNIT_LABELS } from "@/lib/validations/recipe";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddShoppingItemForm({ listId }: { listId: string }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        startTransition(async () => {
          await addShoppingListItemAction(listId, {
            name,
            quantity: quantity ? Number(quantity) : null,
            unit: (unit || null) as (typeof MEASUREMENT_UNITS)[number] | null,
          });
          setName("");
          setQuantity("");
          setUnit("");
        });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add an item…"
        className="h-9 flex-1 min-w-[160px]"
      />
      <Input
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        type="number"
        min={0}
        step="0.1"
        placeholder="Qty"
        className="h-9 w-20"
      />
      <Select value={unit} onValueChange={(v) => setUnit(v ?? "")}>
        <SelectTrigger className="h-9 w-24">
          <SelectValue placeholder="Unit">{(value: string) => (value ? UNIT_LABELS[value as (typeof MEASUREMENT_UNITS)[number]] : "Unit")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MEASUREMENT_UNITS.map((u) => (
            <SelectItem key={u} value={u}>
              {UNIT_LABELS[u]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </form>
  );
}
