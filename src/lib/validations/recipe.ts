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

/** User-ticked dietary labels — not derivable from ingredient data alone. */
export const MANUAL_DIETARY_LABELS = [
  "Vegetarian",
  "Vegan",
  "High Protein",
  "High Fibre",
  "Low FODMAP",
  "Low Lactose",
] as const;

/**
 * Allergen (from ingredients.allergens, see ALLERGENS in validations/ingredient.ts)
 * -> the "free from" dietary label applied automatically when NONE of a
 * recipe's ingredients carry that allergen. Kept in sync with the same
 * mapping in supabase/migrations/20261110000001_auto_dietary_labels.sql.
 */
export const ALLERGEN_TO_FREE_LABEL = {
  Gluten: "Gluten Free",
  Dairy: "Dairy Free",
  Eggs: "Egg Free",
  Peanuts: "Peanut Free",
  "Tree nuts": "Tree Nut Free",
  Soy: "Soy Free",
  Fish: "Fish Free",
  Shellfish: "Shellfish Free",
  Sesame: "Sesame Free",
} as const;

/** Dietary labels computed server-side from ingredient allergens — not user-editable. */
export const AUTO_DIETARY_LABELS = Object.values(ALLERGEN_TO_FREE_LABEL);

export const DIETARY_LABELS = [...MANUAL_DIETARY_LABELS, ...AUTO_DIETARY_LABELS] as const;

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

/** The subset of MEAL_TYPES surfaced as one-click chips on the Recipe Library, per the user's ask. */
export const QUICK_MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snacks"] as const;

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
  /** True for a section header row (e.g. "Black Sesame Paste") — ingredient_name is the label, nothing else applies. */
  is_section_header: z.boolean().default(false),
});
export type RecipeIngredientInput = z.infer<typeof recipeIngredientSchema>;

export const recipeStepSchema = z.object({
  instruction: z.string().trim().min(1, "Instruction is required"),
  duration_minutes: numberFromInput,
  temperature_celsius: numberFromInput,
  equipment: z.string().trim().optional(),
  tip: z.string().trim().optional(),
  /** True for a section header row (e.g. "Ice Cream") — instruction is the label, not a numbered step. */
  is_section_header: z.boolean().default(false),
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
  dietary_labels: z.array(z.string()).default([]),
  dietary_labels_verified: z.array(z.string()).default([]),
  tag_ids: z.array(z.string().uuid()).default([]),
  ingredients: z.array(recipeIngredientSchema).min(1, "Add at least one ingredient"),
  steps: z.array(recipeStepSchema).min(1, "Add at least one step"),
});
export type RecipeFormValues = z.output<typeof recipeFormSchema>;
export type RecipeFormInput = z.input<typeof recipeFormSchema>;
