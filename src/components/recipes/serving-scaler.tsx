"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatQuantity, scaleQuantity } from "@/lib/nutrition/format";
import { UNIT_LABELS } from "@/lib/validations/recipe";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MeasurementUnit = Database["public"]["Enums"]["measurement_unit"];

export type ScalableIngredient = {
  id: string;
  name: string;
  quantity: number | null;
  unit: MeasurementUnit | null;
  preparationNote: string | null;
  brand: string | null;
};

export function ServingScaler({
  originalServings,
  servingSize,
  ingredients,
}: {
  originalServings: number;
  servingSize: string | null;
  ingredients: ScalableIngredient[];
}) {
  const [targetServings, setTargetServings] = useState(originalServings);
  const scaled = targetServings !== originalServings;
  const multiplier = originalServings > 0 ? targetServings / originalServings : 1;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Ingredients</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={targetServings <= 0.5}
            onClick={() => setTargetServings((s) => Math.max(0.5, s - 0.5))}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-28 text-center text-sm tabular-nums">
            {formatQuantity(targetServings)} serving{targetServings === 1 ? "" : "s"}
          </span>
          <Button type="button" variant="outline" size="icon-sm" onClick={() => setTargetServings((s) => s + 0.5)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scaled ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Scaled {multiplier.toFixed(2).replace(/\.?0+$/, "")}× from the original {originalServings}
            {servingSize ? ` (${servingSize})` : ""}. Edit the recipe to save new amounts permanently.
          </p>
        ) : null}
        <ul className="space-y-2 text-sm">
          {ingredients.map((ing) => {
            const displayQty =
              ing.quantity != null ? scaleQuantity(ing.quantity, originalServings, targetServings) : null;
            return (
              <li key={ing.id} className="flex items-baseline gap-2">
                <span className="w-20 shrink-0 font-medium tabular-nums">
                  {displayQty != null ? `${formatQuantity(displayQty)}${ing.unit ? UNIT_LABELS[ing.unit] : ""}` : ""}
                </span>
                <span>
                  {ing.name}
                  {ing.preparationNote ? `, ${ing.preparationNote}` : ""}
                  {ing.brand ? ` (${ing.brand})` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
