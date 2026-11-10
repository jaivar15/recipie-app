"use client";

import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  ingredientFormSchema,
  type IngredientFormValues,
  type IngredientFormInput,
  FOOD_CATEGORIES,
  ALLERGENS,
} from "@/lib/validations/ingredient";
import { MEASUREMENT_UNITS, UNIT_LABELS } from "@/lib/validations/recipe";
import { NUTRIENT_KEYS, NUTRIENT_LABELS } from "@/lib/nutrition/calculate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HouseholdOption = { id: string; name: string };
type NutritionSource = { id: string; name: string };

/** Units that convert trivially (×1 or ×1000) for each nutrition reference unit, so don't need a conversion row. */
const TRIVIAL_UNITS: Record<IngredientFormValues["nutrition_reference_unit"], readonly string[]> = {
  g: ["g", "kg"],
  ml: ["ml", "l"],
};

/** Common label amounts to offer per reference unit — g products are almost always "per 100g"; liquids are sometimes labelled per 250ml (a glass/carton serving) instead. */
const REFERENCE_AMOUNT_OPTIONS: Record<IngredientFormValues["nutrition_reference_unit"], number[]> = {
  g: [100],
  ml: [100, 250],
};

export function IngredientForm({
  defaultValues,
  households,
  nutritionSources,
  submitLabel,
  onSubmit,
}: {
  defaultValues: Partial<IngredientFormInput>;
  households: HouseholdOption[];
  nutritionSources: NutritionSource[];
  submitLabel: string;
  onSubmit: (values: IngredientFormValues) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<IngredientFormInput, unknown, IngredientFormValues>({
    resolver: zodResolver(ingredientFormSchema),
    defaultValues: {
      visibility: households.length > 0 ? "household" : "personal",
      household_id: households[0]?.id ?? null,
      name: "",
      alternative_names: [],
      allergens: [],
      nutrition_reference_unit: "g",
      nutrition_reference_amount: 100,
      nutrition: {},
      conversions: [],
      ...defaultValues,
    },
  });

  const conversions = useFieldArray({ control: form.control, name: "conversions" });

  const visibility = form.watch("visibility");
  const allergensValue = form.watch("allergens");
  const altNamesValue = form.watch("alternative_names");
  const referenceUnit = form.watch("nutrition_reference_unit") ?? "g";
  const referenceAmount = form.watch("nutrition_reference_amount") ?? 100;
  const convertibleUnits = MEASUREMENT_UNITS.filter((u) => !TRIVIAL_UNITS[referenceUnit].includes(u));

  function handleSubmit(values: IngredientFormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof err.digest === "string" &&
          err.digest.startsWith("NEXT_REDIRECT")
        ) {
          throw err;
        }
        setSubmitError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {submitError ? (
        <Alert variant="destructive">
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ingredient name</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="e.g. Chicken thigh, skinless"
            />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternative_names">Alternative names</Label>
            <Input
              id="alternative_names"
              placeholder="Comma-separated, e.g. Chook, Poultry"
              defaultValue={altNamesValue?.join(", ")}
              onBlur={(e) =>
                form.setValue(
                  "alternative_names",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                )
              }
            />
          </div>

          {households.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(v) =>
                    form.setValue("visibility", v as IngredientFormValues["visibility"])
                  }
                >
                  <SelectTrigger id="visibility" className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === "household" ? "Household — shared" : "Personal — only you"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal — only you</SelectItem>
                    <SelectItem value="household">Household — shared</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {visibility === "household" ? (
                <div className="space-y-2">
                  <Label htmlFor="household_id">Household</Label>
                  <Select
                    value={form.watch("household_id") ?? ""}
                    onValueChange={(v) => form.setValue("household_id", v)}
                  >
                    <SelectTrigger id="household_id" className="w-full">
                      <SelectValue>
                        {(value: string) => households.find((h) => h.id === value)?.name ?? ""}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {households.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="food_category">Food category</Label>
              <Select
                value={form.watch("food_category") ?? ""}
                onValueChange={(v) => form.setValue("food_category", v ?? undefined)}
              >
                <SelectTrigger id="food_category" className="w-full">
                  <SelectValue placeholder="Select">
                    {(value: string) => value || "Select"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {FOOD_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select
                value={form.watch("state") ?? ""}
                onValueChange={(v) => form.setValue("state", v as IngredientFormValues["state"])}
              >
                <SelectTrigger id="state" className="w-full">
                  <SelectValue placeholder="Select">
                    {(value: string) =>
                      value ? value.charAt(0).toUpperCase() + value.slice(1) : "Select"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">Raw</SelectItem>
                  <SelectItem value="cooked">Cooked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" {...form.register("brand")} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Allergens</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ALLERGENS.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={allergensValue?.includes(a)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("allergens") ?? [];
                      form.setValue(
                        "allergens",
                        checked ? [...current, a] : current.filter((x) => x !== a),
                      );
                    }}
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register("notes")} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Nutrition per {referenceAmount} {referenceUnit}
          </CardTitle>
          <CardDescription>
            Leave a field blank if the value is unknown — it will show as unknown rather than zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nutrition_reference_unit">Nutrition is measured in</Label>
              <Select
                value={referenceUnit}
                onValueChange={(v) => {
                  const unit = v as IngredientFormValues["nutrition_reference_unit"];
                  form.setValue("nutrition_reference_unit", unit);
                  // Reset to that unit's first offered amount (g only ever offers 100).
                  form.setValue("nutrition_reference_amount", REFERENCE_AMOUNT_OPTIONS[unit][0]);
                }}
              >
                <SelectTrigger id="nutrition_reference_unit" className="w-full">
                  <SelectValue>
                    {(value: string) => (value === "ml" ? "Millilitres (liquids)" : "Grams (most foods)")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Grams (most foods)</SelectItem>
                  <SelectItem value="ml">Millilitres (liquids like milk, oil, stock)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {REFERENCE_AMOUNT_OPTIONS[referenceUnit].length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="nutrition_reference_amount">Per how many {referenceUnit}</Label>
                <Select
                  value={String(referenceAmount)}
                  onValueChange={(v) => form.setValue("nutrition_reference_amount", Number(v))}
                >
                  <SelectTrigger id="nutrition_reference_amount" className="w-full">
                    <SelectValue>{(value: string) => `${value} ${referenceUnit}`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_AMOUNT_OPTIONS[referenceUnit].map((amount) => (
                      <SelectItem key={amount} value={String(amount)}>
                        {amount} {referenceUnit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Match whatever the nutrition label actually says — most liquids are labelled per 100ml or per a
            serving size like 250ml, not per 100g.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="source_id">Source</Label>
              <Select
                value={form.watch("nutrition.source_id") ?? ""}
                onValueChange={(v) => form.setValue("nutrition.source_id", v ?? undefined)}
              >
                <SelectTrigger id="source_id" className="w-full">
                  <SelectValue placeholder="Select">
                    {(value: string) =>
                      nutritionSources.find((s) => s.id === value)?.name ?? "Select"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {nutritionSources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source_detail">Source detail</Label>
              <Input
                id="source_detail"
                {...form.register("nutrition.source_detail")}
                placeholder="e.g. AFCD food code, product name on label"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {NUTRIENT_KEYS.map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`nutrition.${key}`}>
                  {NUTRIENT_LABELS[key].label} ({NUTRIENT_LABELS[key].unit})
                </Label>
                <Input
                  id={`nutrition.${key}`}
                  type="number"
                  step="any"
                  min={0}
                  {...form.register(`nutrition.${key}` as const)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Measurement conversions</CardTitle>
          <CardDescription>
            {referenceUnit === "ml"
              ? "Millilitres and litres always work. Add a conversion for any other unit used in recipes (e.g. 1 cup = 240 ml) — without one, nutrition can't be calculated for that unit."
              : "Grams and kilograms always work. Add a conversion for any other unit used in recipes (e.g. 1 cup = 125 g) — without one, nutrition can't be calculated for that unit."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversions.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <Select
                value={form.watch(`conversions.${index}.unit`) ?? ""}
                onValueChange={(v) =>
                  form.setValue(
                    `conversions.${index}.unit`,
                    v as IngredientFormValues["conversions"][number]["unit"],
                  )
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Unit">
                    {(value: (typeof MEASUREMENT_UNITS)[number] | null) =>
                      value ? UNIT_LABELS[value] : "Unit"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {convertibleUnits.map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">=</span>
              <Input
                type="number"
                step="any"
                min={0}
                placeholder={referenceUnit}
                className="w-28"
                {...form.register(`conversions.${index}.grams_per_unit` as const)}
              />
              <span className="text-sm text-muted-foreground">{referenceUnit}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => conversions.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => conversions.append({ unit: "cup", grams_per_unit: 0 })}
          >
            <Plus className="h-4 w-4" />
            Add conversion
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
