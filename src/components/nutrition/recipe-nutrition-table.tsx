"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export type IngredientBreakdownRow = {
  id: string;
  name: string;
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatPerServing: number | null;
  resolved: boolean;
};

export type RecipeNutritionRow = {
  id: string;
  title: string;
  servings: number;
  caloriesPerServing: number | null;
  proteinPerServing: number | null;
  carbsPerServing: number | null;
  fatPerServing: number | null;
  fibrePerServing: number | null;
  complete: boolean;
  ingredients: IngredientBreakdownRow[];
};

type SortKey = Exclude<keyof RecipeNutritionRow, "id" | "servings" | "complete">;

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: "title", label: "Recipe" },
  { key: "caloriesPerServing", label: "Calories" },
  { key: "proteinPerServing", label: "Protein (g)" },
  { key: "carbsPerServing", label: "Carbs (g)" },
  { key: "fatPerServing", label: "Fat (g)" },
  { key: "fibrePerServing", label: "Fibre (g)" },
];

function nutrientCell(value: number | null, complete: boolean) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="tabular-nums">
      {value}
      {!complete ? "+" : ""}
    </span>
  );
}

export function RecipeNutritionTable({ data }: { data: RecipeNutritionRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("caloriesPerServing");
  const [sortDesc, setSortDesc] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp =
        typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDesc ? -cmp : cmp;
    });
  }, [data, sortKey, sortDesc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            {COLUMNS.map((col) => (
              <TableHead key={col.key}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-3"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const isExpanded = expanded.has(row.id);
            return (
              <Fragment key={row.id}>
                <TableRow>
                  <TableCell>
                    {row.ingredients.length > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => toggleExpanded(row.id)}
                        title="Breakdown by ingredient"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Link href={`/recipes/${row.id}`} className="font-medium hover:underline">
                      {row.title}
                    </Link>
                  </TableCell>
                  <TableCell>{nutrientCell(row.caloriesPerServing, row.complete)}</TableCell>
                  <TableCell>{nutrientCell(row.proteinPerServing, row.complete)}</TableCell>
                  <TableCell>{nutrientCell(row.carbsPerServing, row.complete)}</TableCell>
                  <TableCell>{nutrientCell(row.fatPerServing, row.complete)}</TableCell>
                  <TableCell>{nutrientCell(row.fibrePerServing, row.complete)}</TableCell>
                </TableRow>
                {isExpanded ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={COLUMNS.length + 1} className="bg-muted/30 p-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Per serving, by ingredient
                      </p>
                      <div className="overflow-hidden rounded-md border bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-8">Ingredient</TableHead>
                              <TableHead className="h-8">Calories</TableHead>
                              <TableHead className="h-8">Protein (g)</TableHead>
                              <TableHead className="h-8">Carbs (g)</TableHead>
                              <TableHead className="h-8">Fat (g)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {row.ingredients.map((ing) => (
                              <TableRow key={ing.id}>
                                <TableCell className="py-1.5">{ing.name}</TableCell>
                                <TableCell className="py-1.5">
                                  {ing.resolved ? (
                                    nutrientCell(ing.caloriesPerServing, true)
                                  ) : (
                                    <span className="text-muted-foreground">
                                      Needs quantity &amp; unit
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="py-1.5">
                                  {ing.resolved ? nutrientCell(ing.proteinPerServing, true) : null}
                                </TableCell>
                                <TableCell className="py-1.5">
                                  {ing.resolved ? nutrientCell(ing.carbsPerServing, true) : null}
                                </TableCell>
                                <TableCell className="py-1.5">
                                  {ing.resolved ? nutrientCell(ing.fatPerServing, true) : null}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
