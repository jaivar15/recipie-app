"use client";

import { useState } from "react";
import { AlertTriangle, Beef, Droplet, Flame, Wheat } from "lucide-react";
import {
  NUTRIENT_KEYS,
  NUTRIENT_LABELS,
  divideNutrients,
  multiplyNutrients,
  type NutrientKey,
  type NutrientResult,
} from "@/lib/nutrition/calculate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const HEADLINE_KEYS: NutrientKey[] = ["calories_kcal", "protein_g", "carbohydrate_g", "fat_g"];

const HEADLINE_STYLE: Record<string, { icon: typeof Flame; card: string; chip: string }> = {
  calories_kcal: { icon: Flame, card: "bg-chart-1/10", chip: "bg-chart-1/20 text-chart-1" },
  protein_g: { icon: Beef, card: "bg-chart-3/10", chip: "bg-chart-3/20 text-chart-3" },
  carbohydrate_g: { icon: Wheat, card: "bg-chart-2/10", chip: "bg-chart-2/20 text-chart-2" },
  fat_g: { icon: Droplet, card: "bg-chart-5/10", chip: "bg-chart-5/20 text-chart-5" },
};

function NutrientGrid({ nutrients }: { nutrients: Record<NutrientKey, NutrientResult> }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {HEADLINE_KEYS.map((key) => {
          const { icon: Icon, card, chip } = HEADLINE_STYLE[key];
          return (
            <div key={key} className={`space-y-2 rounded-lg border p-3 ${card}`}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-md ${chip}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-semibold tabular-nums">
                {nutrients[key].value != null ? nutrients[key].value : "—"}
                {!nutrients[key].complete && nutrients[key].value != null ? "+" : ""}
                <span className="ml-1 text-xs font-normal text-muted-foreground">{NUTRIENT_LABELS[key].unit}</span>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{NUTRIENT_LABELS[key].label}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-sm">
        {NUTRIENT_KEYS.filter((k) => !HEADLINE_KEYS.includes(k)).map((key) => {
          const n = nutrients[key];
          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="shrink-0 text-muted-foreground">{NUTRIENT_LABELS[key].label}</span>
              <span className="truncate tabular-nums">
                {n.value != null ? `${n.value}${!n.complete ? "+" : ""} ${NUTRIENT_LABELS[key].unit}` : "unknown"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NutritionCard({
  recipeTotals,
  servings,
  finishedWeightGrams,
  unresolvedIngredientNames,
}: {
  recipeTotals: Record<NutrientKey, NutrientResult>;
  servings: number;
  finishedWeightGrams: number | null;
  unresolvedIngredientNames: string[];
}) {
  const [customServings, setCustomServings] = useState(1);

  const perServing = divideNutrients(recipeTotals, servings);
  const per100g = finishedWeightGrams ? multiplyNutrients(divideNutrients(recipeTotals, finishedWeightGrams), 100) : null;
  const custom = multiplyNutrients(perServing, customServings);

  const hasAnyData = NUTRIENT_KEYS.some((k) => recipeTotals[k].value != null);

  if (!hasAnyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nutrition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No nutrition data yet. Link ingredients to the ingredient database (with nutrition filled in) to see a
            breakdown here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-base">Nutrition</CardTitle>
        {unresolvedIngredientNames.length > 0 ? (
          <Tooltip>
            <TooltipTrigger render={<AlertTriangle className="h-4 w-4 text-amber-600" />} />
            <TooltipContent>
              <p className="max-w-56 text-xs">
                Some values are a lower bound — nutrition for {unresolvedIngredientNames.join(", ")} isn&apos;t
                available yet.
              </p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="serving">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="recipe">Recipe</TabsTrigger>
            <TabsTrigger value="serving">Serving</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
            <TabsTrigger value="per100g" disabled={!per100g}>
              100 g
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recipe">
            <NutrientGrid nutrients={recipeTotals} />
          </TabsContent>
          <TabsContent value="serving">
            <NutrientGrid nutrients={perServing} />
          </TabsContent>
          <TabsContent value="custom">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Servings:</span>
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={customServings}
                onChange={(e) => setCustomServings(Math.max(0.25, Number(e.target.value) || 1))}
                className="h-8 w-20 rounded-md border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <NutrientGrid nutrients={custom} />
          </TabsContent>
          <TabsContent value="per100g">
            {per100g ? (
              <NutrientGrid nutrients={per100g} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter the recipe&apos;s finished weight (in the editor) to see nutrition per 100 g.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
