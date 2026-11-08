import { z } from "zod";

export const MEASUREMENT_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "piece",
  "slice",
  "clove",
] as const;

export const UNIT_LABELS: Record<(typeof MEASUREMENT_UNITS)[number], string> = {
  g: "g",
  kg: "kg",
  ml: "mL",
  l: "L",
  tsp: "tsp",
  tbsp: "tbsp",
  cup: "cup",
  piece: "piece",
  slice: "slice",
  clove: "clove",
};

export const CUISINES = [
  "Indian",
  "Chinese",
  "Italian",
  "Thai",
  "Japanese",
  "Mediterranean",
  "Mexican",
  "Australian",
  "Middle Eastern",
  "Other",
] as const;

export const COOKING_METHODS = [
  "Stovetop",
  "Oven",
  "Air Fryer",
  "Pressure Cooker",
  "Slow Cooker",
  "Steamed",
  "Grilled",
  "No Cook",
] as const;

export const MEAL_TYPES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Snacks",
  "Desserts",
  "Drinks",
  "Sides",
  "Meal Prep",
] as const;

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;

const numberFromInput = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v)) : v))
  .pipe(z.number().nonnegative().optional())
  .optional();

export const recipeIngredientSchema = z.object({
  ingredient_name: z.string().trim().min(1, "Ingredient name is required"),
  ingredient_id: z.string().uuid().nullable().optional(),
  quantity: numberFromInput,
  unit: z.enum(MEASUREMENT_UNITS).optional(),
  preparation_note: z.string().trim().optional(),
  brand: z.string().trim().optional(),
});
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;

export const recipeStepSchema = z.object({
  instruction: z.string().trim().min(1, "Instruction is required"),
  duration_minutes: numberFromInput,
  temperature_celsius: numberFromInput,
  equipment: z.string().trim().optional(),
  tip: z.string().trim().optional(),
});
export type RecipeStepInput = z.infer<typeof recipeStepSchema>;

export const recipeFormSchema = z.object({
  visibility: z.enum(["personal", "household"]),
  household_id: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().optional(),
  source: z.string().trim().optional(),
  source_url: z.string().trim().optional(),
  author_name: z.string().trim().optional(),
  prep_time_minutes: numberFromInput,
  cook_time_minutes: numberFromInput,
  resting_time_minutes: numberFromInput,
  servings: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(z.number().positive())
    .default(4),
  serving_size: z.string().trim().optional(),
  finished_weight_grams: numberFromInput,
  difficulty: z.enum(DIFFICULTIES).optional(),
  cuisine: z.string().trim().optional(),
  meal_type: z.array(z.string()).default([]),
  cooking_method: z.string().trim().optional(),
  equipment: z.array(z.string()).default([]),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
  steps: z.array(recipeStepSchema).min(1, "Add at least one step"),
});
export type RecipeFormValues = z.output<typeof recipeFormSchema>;
export type RecipeFormInput = z.input<typeof recipeFormSchema>;
