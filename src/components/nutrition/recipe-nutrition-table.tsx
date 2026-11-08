"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

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

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
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
            {COLUMNS.map((col) => (
              <TableHead key={col.key}>
                <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => toggleSort(col.key)}>
                  {col.label}
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.id}>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
