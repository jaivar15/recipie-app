"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";
import { addFoodDiaryEntryAction } from "@/app/(app)/health/diary/actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type FoodDiaryMealType = Database["public"]["Enums"]["food_diary_meal_type"];

export type FrequentFood = {
  key: string;
  label: string;
  count: number;
  mealType: FoodDiaryMealType;
} & (
  | { sourceType: "recipe"; recipeId: string; servings: number }
  | { sourceType: "ingredient"; ingredientId: string; quantityGrams: number }
  | { sourceType: "custom"; customFoodName: string; nutrition: Partial<Record<"calories_kcal" | "protein_g" | "carbohydrate_g" | "fat_g" | "fibre_g", number>> }
);

export function FrequentFoodsMenu({ foods, entryDate }: { foods: FrequentFood[]; entryDate: string }) {
  const [isPending, startTransition] = useTransition();

  if (foods.length === 0) return null;

  function addFood(food: FrequentFood) {
    startTransition(async () => {
      if (food.sourceType === "recipe") {
        await addFoodDiaryEntryAction({
          sourceType: "recipe",
          recipeId: food.recipeId,
          servings: food.servings,
          entryDate,
          mealType: food.mealType,
        });
      } else if (food.sourceType === "ingredient") {
        await addFoodDiaryEntryAction({
          sourceType: "ingredient",
          ingredientId: food.ingredientId,
          quantityGrams: food.quantityGrams,
          entryDate,
          mealType: food.mealType,
        });
      } else {
        await addFoodDiaryEntryAction({
          sourceType: "custom",
          customFoodName: food.customFoodName,
          entryDate,
          mealType: food.mealType,
          nutrition: food.nutrition,
        });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
        <Star className="h-3.5 w-3.5" />
        Frequent
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Logged often — add to today</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {foods.map((food) => (
            <DropdownMenuItem key={food.key} onClick={() => addFood(food)}>
              {food.label}
              <span className="ml-auto text-xs text-muted-foreground">×{food.count}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
