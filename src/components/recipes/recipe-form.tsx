"use client";

import { useState, useTransition } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  recipeFormSchema,
  type RecipeFormValues,
  type RecipeFormInput,
  MEASUREMENT_UNITS,
  UNIT_LABELS,
  CUISINES,
  COOKING_METHODS,
  MEAL_TYPES,
  DIETARY_LABELS,
  DIFFICULTIES,
} from "@/lib/validations/recipe";
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
import { IngredientAutocomplete } from "@/components/recipes/ingredient-autocomplete";

type HouseholdOption = { id: string; name: string };

export function RecipeForm({
  defaultValues,
  households,
  availableTags,
  submitLabel,
  onSubmit,
}: {
  defaultValues: Partial<RecipeFormInput>;
  households: HouseholdOption[];
  availableTags: { id: string; name: string }[];
  submitLabel: string;
  onSubmit: (values: RecipeFormValues) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<RecipeFormInput, unknown, RecipeFormValues>({
    resolver: zodResolver(recipeFormSchema),
    defaultValues: {
      visibility: households.length > 0 ? "household" : "personal",
      household_id: households[0]?.id ?? null,
      title: "",
      servings: 4,
      meal_type: [],
      equipment: [],
      dietary_labels: [],
      dietary_labels_verified: [],
      tag_ids: [],
      ingredients: [{ ingredient_name: "" }],
      steps: [{ instruction: "" }],
      ...defaultValues,
    },
  });

  const ingredients = useFieldArray({ control: form.control, name: "ingredients" });
  const steps = useFieldArray({ control: form.control, name: "steps" });

  const visibility = form.watch("visibility");
  const equipmentValue = form.watch("equipment");
  const mealTypeValue = form.watch("meal_type");
  const dietaryLabelsValue = form.watch("dietary_labels");
  const dietaryVerifiedValue = form.watch("dietary_labels_verified");
  const tagIdsValue = form.watch("tag_ids");

  function handleSubmit(values: RecipeFormValues) {
    setSubmitError(null);
    startTransition(async () => {
      try {
        await onSubmit(values);
      } catch (err) {
        // Server actions that call redirect() throw a special Next.js
        // control-flow error (digest starting with NEXT_REDIRECT) — it
        // must propagate, not be swallowed as a form error.
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
            <Label htmlFor="title">Recipe title</Label>
            <Input id="title" {...form.register("title")} placeholder="Grandma's Butter Chicken" />
            {form.formState.errors.title ? (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register("description")} rows={3} />
          </div>

          {households.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select
                  value={visibility}
                  onValueChange={(v) => form.setValue("visibility", v as RecipeFormValues["visibility"])}
                >
                  <SelectTrigger id="visibility" className="w-full">
                    <SelectValue>
                      {(value: string) => (value === "household" ? "Household — shared" : "Personal — only you")}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="author_name">Recipe author</Label>
              <Input id="author_name" {...form.register("author_name")} placeholder="e.g. Mum" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Input id="source" {...form.register("source")} placeholder="e.g. Family cookbook" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source_url">Source URL</Label>
            <Input id="source_url" type="url" {...form.register("source_url")} placeholder="https://" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preparation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="prep_time_minutes">Prep time (min)</Label>
              <Input id="prep_time_minutes" type="number" min={0} {...form.register("prep_time_minutes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cook_time_minutes">Cook time (min)</Label>
              <Input id="cook_time_minutes" type="number" min={0} {...form.register("cook_time_minutes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resting_time_minutes">Resting time (min)</Label>
              <Input id="resting_time_minutes" type="number" min={0} {...form.register("resting_time_minutes")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input id="servings" type="number" min={0.5} step={0.5} {...form.register("servings")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serving_size">Serving size</Label>
              <Input id="serving_size" {...form.register("serving_size")} placeholder="e.g. 1 bowl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finished_weight_grams">Finished weight (g)</Label>
              <Input
                id="finished_weight_grams"
                type="number"
                min={0}
                {...form.register("finished_weight_grams")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={form.watch("difficulty") ?? ""}
                onValueChange={(v) => form.setValue("difficulty", v as RecipeFormValues["difficulty"])}
              >
                <SelectTrigger id="difficulty" className="w-full">
                  <SelectValue placeholder="Select">
                    {(value: string | null) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Select")}
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
              <Label htmlFor="cuisine">Cuisine</Label>
              <Select
                value={form.watch("cuisine") ?? ""}
                onValueChange={(v) => form.setValue("cuisine", v ?? undefined)}
              >
                <SelectTrigger id="cuisine" className="w-full">
                  <SelectValue placeholder="Select" />
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
              <Label htmlFor="cooking_method">Cooking method</Label>
              <Select
                value={form.watch("cooking_method") ?? ""}
                onValueChange={(v) => form.setValue("cooking_method", v ?? undefined)}
              >
                <SelectTrigger id="cooking_method" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {COOKING_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Meal type</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {MEAL_TYPES.map((mt) => (
                <label key={mt} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={mealTypeValue?.includes(mt)}
                    onCheckedChange={(checked) => {
                      const current = form.getValues("meal_type") ?? [];
                      form.setValue(
                        "meal_type",
                        checked ? [...current, mt] : current.filter((x) => x !== mt)
                      );
                    }}
                  />
                  {mt}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment</Label>
            <Input
              id="equipment"
              placeholder="Comma-separated, e.g. Large pot, Wok"
              defaultValue={equipmentValue?.join(", ")}
              onBlur={(e) =>
                form.setValue(
                  "equipment",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Applying a dietary label here doesn&apos;t make it verified — tick &quot;verified&quot; once you&apos;ve
            confirmed it (e.g. checked every ingredient and ruled out cross-contact).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dietary labels</Label>
            <div className="space-y-1.5">
              {DIETARY_LABELS.map((label) => {
                const applied = dietaryLabelsValue?.includes(label);
                const verified = dietaryVerifiedValue?.includes(label);
                return (
                  <div key={label} className="flex items-center gap-4 text-sm">
                    <label className="flex w-40 items-center gap-2">
                      <Checkbox
                        checked={applied}
                        onCheckedChange={(checked) => {
                          const current = form.getValues("dietary_labels") ?? [];
                          const next = checked ? [...current, label] : current.filter((x) => x !== label);
                          form.setValue("dietary_labels", next);
                          if (!checked) {
                            form.setValue(
                              "dietary_labels_verified",
                              (form.getValues("dietary_labels_verified") ?? []).filter((x) => x !== label)
                            );
                          }
                        }}
                      />
                      {label}
                    </label>
                    {applied ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={verified}
                          onCheckedChange={(checked) => {
                            const current = form.getValues("dietary_labels_verified") ?? [];
                            form.setValue(
                              "dietary_labels_verified",
                              checked ? [...current, label] : current.filter((x) => x !== label)
                            );
                          }}
                        />
                        Verified
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {availableTags.length > 0 ? (
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {availableTags.map((tag) => (
                  <label key={tag.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={tagIdsValue?.includes(tag.id)}
                      onCheckedChange={(checked) => {
                        const current = form.getValues("tag_ids") ?? [];
                        form.setValue("tag_ids", checked ? [...current, tag.id] : current.filter((x) => x !== tag.id));
                      }}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
          <CardDescription>Add every ingredient with its quantity and unit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2 rounded-lg border p-3">
              <GripVertical className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="grid flex-1 gap-2 sm:grid-cols-[1fr_90px_100px_1fr]">
                <IngredientAutocomplete
                  value={form.watch(`ingredients.${index}.ingredient_name`) ?? ""}
                  linkedId={form.watch(`ingredients.${index}.ingredient_id`)}
                  householdId={visibility === "household" ? (form.watch("household_id") ?? null) : null}
                  onChange={(name, id) => {
                    form.setValue(`ingredients.${index}.ingredient_name`, name);
                    form.setValue(`ingredients.${index}.ingredient_id`, id);
                  }}
                />
                <Input
                  type="number"
                  step="any"
                  placeholder="Qty"
                  {...form.register(`ingredients.${index}.quantity` as const)}
                />
                <Select
                  value={form.watch(`ingredients.${index}.unit`) ?? ""}
                  onValueChange={(v) =>
                    form.setValue(`ingredients.${index}.unit`, v as RecipeFormValues["ingredients"][number]["unit"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unit">
                      {(value: (typeof MEASUREMENT_UNITS)[number] | null) => (value ? UNIT_LABELS[value] : "Unit")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {UNIT_LABELS[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Prep note, e.g. finely chopped"
                  {...form.register(`ingredients.${index}.preparation_note` as const)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={ingredients.fields.length <= 1}
                onClick={() => ingredients.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {form.formState.errors.ingredients?.message ? (
            <p className="text-xs text-destructive">{form.formState.errors.ingredients.message}</p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => ingredients.append({ ingredient_name: "" })}
          >
            <Plus className="h-4 w-4" />
            Add ingredient
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
          <CardDescription>Add each step in order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.fields.map((field, index) => (
            <div key={field.id} className="flex items-start gap-2 rounded-lg border p-3">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {index + 1}
              </span>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="What to do in this step"
                  rows={2}
                  {...form.register(`steps.${index}.instruction` as const)}
                />
                <div className="grid gap-2 sm:grid-cols-4">
                  <Input
                    type="number"
                    placeholder="Duration (min)"
                    {...form.register(`steps.${index}.duration_minutes` as const)}
                  />
                  <Input
                    type="number"
                    placeholder="Temp (°C)"
                    {...form.register(`steps.${index}.temperature_celsius` as const)}
                  />
                  <Input placeholder="Equipment" {...form.register(`steps.${index}.equipment` as const)} />
                  <Input placeholder="Tip" {...form.register(`steps.${index}.tip` as const)} />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                disabled={steps.fields.length <= 1}
                onClick={() => steps.remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {form.formState.errors.steps?.message ? (
            <p className="text-xs text-destructive">{form.formState.errors.steps.message}</p>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => steps.append({ instruction: "" })}>
            <Plus className="h-4 w-4" />
            Add step
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
