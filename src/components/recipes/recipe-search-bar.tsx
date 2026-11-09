"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, Search, X, Bookmark, Trash2, Target } from "lucide-react";
import { CUISINES, DIFFICULTIES, DIETARY_LABELS } from "@/lib/validations/recipe";
import { createSavedFilterAction, deleteSavedFilterAction } from "@/app/(app)/categories/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FILTER_KEYS = [
  "q",
  "cuisine",
  "difficulty",
  "dietary",
  "maxTime",
  "minProtein",
  "maxCalories",
  "tag",
];

type SavedFilter = { id: string; name: string; filter: Record<string, string> };

export function RecipeSearchBar({
  tags,
  savedFilters,
  householdId,
  nutritionTargets,
}: {
  tags: { id: string; name: string }[];
  savedFilters: SavedFilter[];
  householdId: string | null;
  /** Per-meal calorie/protein split (target ÷ 4) from the signed-in user's own nutrition goals, if set. */
  nutritionTargets: { maxCaloriesPerMeal: number | null; minProteinPerMeal: number | null } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const activeFilterCount = FILTER_KEYS.filter((k) => k !== "q" && searchParams.get(k)).length;

  function applyFilter(filter: Record<string, string>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value) params.set(key, value);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  async function handleSaveFilter() {
    if (!saveName.trim()) return;
    const filter: Record<string, string> = {};
    for (const key of FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) filter[key] = value;
    }
    await createSavedFilterAction(saveName, householdId, filter);
    setSaveName("");
  }

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function toggleDietary(label: string) {
    const current = searchParams.get("dietary")?.split(",").filter(Boolean) ?? [];
    const next = current.includes(label) ? current.filter((x) => x !== label) : [...current, label];
    updateParams({ dietary: next.length > 0 ? next.join(",") : null });
  }

  const selectedDietary = searchParams.get("dietary")?.split(",").filter(Boolean) ?? [];

  const fitsTargetsActive =
    !!nutritionTargets &&
    (nutritionTargets.maxCaloriesPerMeal == null ||
      searchParams.get("maxCalories") === String(nutritionTargets.maxCaloriesPerMeal)) &&
    (nutritionTargets.minProteinPerMeal == null ||
      searchParams.get("minProtein") === String(nutritionTargets.minProteinPerMeal)) &&
    (nutritionTargets.maxCaloriesPerMeal != null || nutritionTargets.minProteinPerMeal != null);

  function toggleFitsTargets() {
    if (!nutritionTargets) return;
    if (fitsTargetsActive) {
      updateParams({ maxCalories: null, minProtein: null });
    } else {
      updateParams({
        maxCalories:
          nutritionTargets.maxCaloriesPerMeal != null
            ? String(nutritionTargets.maxCaloriesPerMeal)
            : null,
        minProtein:
          nutritionTargets.minProteinPerMeal != null
            ? String(nutritionTargets.minProteinPerMeal)
            : null,
      });
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && updateParams({ q: q || null })}
          onBlur={() => updateParams({ q: q || null })}
          placeholder="Search by title or ingredient…"
          className="pl-8"
        />
      </div>
      {nutritionTargets ? (
        <Button
          type="button"
          variant={fitsTargetsActive ? "default" : "outline"}
          onClick={toggleFitsTargets}
          title="Filter by your own per-meal calorie/protein split, from Health & Fitness → Goals"
        >
          <Target className="h-4 w-4" />
          Fits my targets
        </Button>
      ) : null}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" />}>
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 ? (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          ) : null}
        </SheetTrigger>
        <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Filter recipes</SheetTitle>
            <SheetDescription>Combine filters to narrow down the library.</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-4 pb-4">
            <div className="space-y-2">
              <Label>Cuisine</Label>
              <Select
                value={searchParams.get("cuisine") ?? ""}
                onValueChange={(v) => updateParams({ cuisine: v || null })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any">{(value: string) => value || "Any"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {CUISINES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select
                value={searchParams.get("difficulty") ?? ""}
                onValueChange={(v) => updateParams({ difficulty: v || null })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any">
                    {(value: string) =>
                      value ? value.charAt(0).toUpperCase() + value.slice(1) : "Any"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d} className="capitalize">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTime">Max total time (min)</Label>
              <Input
                id="maxTime"
                type="number"
                min={0}
                defaultValue={searchParams.get("maxTime") ?? ""}
                onBlur={(e) => updateParams({ maxTime: e.target.value || null })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minProtein">Min protein (g)</Label>
                <Input
                  id="minProtein"
                  type="number"
                  min={0}
                  defaultValue={searchParams.get("minProtein") ?? ""}
                  onBlur={(e) => updateParams({ minProtein: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxCalories">Max calories</Label>
                <Input
                  id="maxCalories"
                  type="number"
                  min={0}
                  defaultValue={searchParams.get("maxCalories") ?? ""}
                  onBlur={(e) => updateParams({ maxCalories: e.target.value || null })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dietary</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {DIETARY_LABELS.map((label) => (
                  <label key={label} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedDietary.includes(label)}
                      onCheckedChange={() => toggleDietary(label)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {tags.length > 0 ? (
              <div className="space-y-2">
                <Label>Tag</Label>
                <Select
                  value={searchParams.get("tag") ?? ""}
                  onValueChange={(v) => updateParams({ tag: v || null })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any">
                      {(value: string) => tags.find((t) => t.id === value)?.name ?? "Any"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tags.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2 border-t pt-4">
              <Label>Saved filters</Label>
              {savedFilters.length > 0 ? (
                <div className="space-y-1.5">
                  {savedFilters.map((sf) => (
                    <div key={sf.id} className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 justify-start"
                        onClick={() => applyFilter(sf.filter)}
                      >
                        <Bookmark className="h-3.5 w-3.5" />
                        {sf.name}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => startTransition(() => deleteSavedFilterAction(sf.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No saved filters yet.</p>
              )}
              {activeFilterCount > 0 ? (
                <div className="flex items-center gap-1.5 pt-1">
                  <Input
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Name this search…"
                    className="h-8 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveFilter}
                    disabled={!saveName.trim()}
                  >
                    Save
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                router.push(pathname);
                setQ("");
              }}
            >
              <X className="h-4 w-4" />
              Clear all filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
