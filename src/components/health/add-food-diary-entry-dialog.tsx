"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addFoodDiaryEntryAction } from "@/app/(app)/health/diary/actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type FoodDiaryMealType = Database["public"]["Enums"]["food_diary_meal_type"];

export function AddFoodDiaryEntryDialog({
  entryDate,
  mealType,
  mealLabel,
  recipes,
  ingredients,
}: {
  entryDate: string;
  mealType: FoodDiaryMealType;
  mealLabel: string;
  recipes: { id: string; title: string }[];
  ingredients: { id: string; name: string; nutrition_reference_unit: "g" | "ml" }[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"recipe" | "ingredient" | "custom">("recipe");
  const [recipeId, setRecipeId] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredientId, setIngredientId] = useState("");
  const [grams, setGrams] = useState("100");
  const [customName, setCustomName] = useState("");
  const [customCalories, setCustomCalories] = useState("");
  const [customProtein, setCustomProtein] = useState("");
  const [customCarbs, setCustomCarbs] = useState("");
  const [customFat, setCustomFat] = useState("");
  const [customFibre, setCustomFibre] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedIngredientUnit =
    ingredients.find((i) => i.id === ingredientId)?.nutrition_reference_unit === "ml" ? "ml" : "grams";

  const canSubmit =
    mode === "recipe"
      ? !!recipeId && Number(servings) > 0
      : mode === "ingredient"
        ? !!ingredientId && Number(grams) > 0
        : customName.trim().length > 0;

  function reset() {
    setRecipeId("");
    setServings("1");
    setIngredientId("");
    setGrams("100");
    setCustomName("");
    setCustomCalories("");
    setCustomProtein("");
    setCustomCarbs("");
    setCustomFat("");
    setCustomFibre("");
  }

  function submit() {
    if (!canSubmit) return;
    startTransition(async () => {
      if (mode === "recipe") {
        await addFoodDiaryEntryAction({
          sourceType: "recipe",
          recipeId,
          servings: Number(servings),
          entryDate,
          mealType,
        });
      } else if (mode === "ingredient") {
        await addFoodDiaryEntryAction({
          sourceType: "ingredient",
          ingredientId,
          quantityGrams: Number(grams),
          entryDate,
          mealType,
        });
      } else {
        await addFoodDiaryEntryAction({
          sourceType: "custom",
          customFoodName: customName.trim(),
          entryDate,
          mealType,
          nutrition: {
            calories_kcal: customCalories ? Number(customCalories) : undefined,
            protein_g: customProtein ? Number(customProtein) : undefined,
            carbohydrate_g: customCarbs ? Number(customCarbs) : undefined,
            fat_g: customFat ? Number(customFat) : undefined,
            fibre_g: customFibre ? Number(customFibre) : undefined,
          },
        });
      }
      setOpen(false);
      reset();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </DialogTrigger>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>Log {mealLabel.toLowerCase()}</DialogTitle>
            <DialogDescription>
              From a recipe, a database ingredient, or a quick custom entry.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
              <TabsList className="w-full">
                <TabsTrigger value="recipe" className="flex-1">
                  Recipe
                </TabsTrigger>
                <TabsTrigger value="ingredient" className="flex-1">
                  Ingredient
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex-1">
                  Custom
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recipe" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Recipe</Label>
                  <Select value={recipeId} onValueChange={(v) => setRecipeId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a recipe">
                        {(value: string) =>
                          recipes.find((r) => r.id === value)?.title ?? "Choose a recipe"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diary-servings">Servings eaten</Label>
                  <Input
                    id="diary-servings"
                    type="number"
                    min={0.25}
                    step="0.25"
                    value={servings}
                    onChange={(e) => setServings(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. 1.5 servings scales the recipe&apos;s nutrition proportionally.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="ingredient" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label>Ingredient</Label>
                  <Select value={ingredientId} onValueChange={(v) => setIngredientId(v ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose an ingredient">
                        {(value: string) =>
                          ingredients.find((i) => i.id === value)?.name ?? "Choose an ingredient"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ingredients.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diary-grams">Quantity ({selectedIngredientUnit})</Label>
                  <Input
                    id="diary-grams"
                    type="number"
                    min={1}
                    step="1"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="custom" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="diary-custom-name">What did you eat?</Label>
                  <Input
                    id="diary-custom-name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Restaurant pasta"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter whatever you know — leave the rest blank. Unknown values stay unknown, never
                  zero.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="diary-custom-cal">Calories (kcal)</Label>
                    <Input
                      id="diary-custom-cal"
                      type="number"
                      min={0}
                      value={customCalories}
                      onChange={(e) => setCustomCalories(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diary-custom-protein">Protein (g)</Label>
                    <Input
                      id="diary-custom-protein"
                      type="number"
                      min={0}
                      value={customProtein}
                      onChange={(e) => setCustomProtein(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diary-custom-carbs">Carbs (g)</Label>
                    <Input
                      id="diary-custom-carbs"
                      type="number"
                      min={0}
                      value={customCarbs}
                      onChange={(e) => setCustomCarbs(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diary-custom-fat">Fat (g)</Label>
                    <Input
                      id="diary-custom-fat"
                      type="number"
                      min={0}
                      value={customFat}
                      onChange={(e) => setCustomFat(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="diary-custom-fibre">Fibre (g)</Label>
                    <Input
                      id="diary-custom-fibre"
                      type="number"
                      min={0}
                      value={customFibre}
                      onChange={(e) => setCustomFibre(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!canSubmit || isPending}>
              Add to diary
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
