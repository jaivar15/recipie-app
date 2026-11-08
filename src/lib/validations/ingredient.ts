import { z } from "zod";
import { MEASUREMENT_UNITS } from "@/lib/validations/recipe";

export const FOOD_CATEGORIES = [
  "Vegetables",
  "Fruit",
  "Grains & cereals",
  "Meat & poultry",
  "Seafood",
  "Dairy & eggs",
  "Legumes & pulses",
  "Nuts & seeds",
  "Herbs & spices",
  "Oils & fats",
  "Condiments & sauces",
  "Baking",
  "Beverages",
  "Other",
] as const;

export const ALLERGENS = [
  "Gluten",
  "Dairy",
  "Eggs",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
] as const;

const numberField = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v))
  .pipe(z.number().nonnegative().optional())
  .optional();

export const ingredientNutritionSchema = z.object({
  source_id: z.string().uuid().optional(),
  source_detail: z.string().trim().optional(),
  energy_kj: numberField,
  calories_kcal: numberField,
  protein_g: numberField,
  carbohydrate_g: numberField,
  fat_g: numberField,
  saturated_fat_g: numberField,
  fibre_g: numberField,
  sugars_g: numberField,
  sodium_mg: numberField,
  iron_mg: numberField,
  calcium_mg: numberField,
  potassium_mg: numberField,
  magnesium_mg: numberField,
  vitamin_b12_ug: numberField,
  folate_ug: numberField,
});

export const ingredientConversionSchema = z.object({
  unit: z.enum(MEASUREMENT_UNITS),
  grams_per_unit: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().positive()),
});

export const ingredientFormSchema = z.object({
  visibility: z.enum(["personal", "household"]),
  household_id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1, "Name is required").max(200),
  alternative_names: z.array(z.string()).default([]),
  food_category: z.string().trim().optional(),
  state: z.enum(["raw", "cooked"]).optional(),
  brand: z.string().trim().optional(),
  allergens: z.array(z.string()).default([]),
  notes: z.string().trim().optional(),
  nutrition: ingredientNutritionSchema.default({}),
  conversions: z.array(ingredientConversionSchema).default([]),
});
export type IngredientFormValues = z.output<typeof ingredientFormSchema>;
export type IngredientFormInput = z.input<typeof ingredientFormSchema>;
