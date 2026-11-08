/**
 * Seeds the test.owner@example.com / "The Test Kitchen" household with a
 * large set of realistic dummy data: ingredients (with nutrition + unit
 * conversions), recipes, tags, collections, and a few meal plan / shopping
 * list entries. Local/dev use only — never run against a real household.
 *
 * Runs everything as an authenticated session for the test user (not the
 * service role directly) because created_by columns are set by BEFORE
 * INSERT triggers reading auth.uid(), which is null under a bare
 * service-role call.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const TEST_EMAIL = "test.owner@example.com";

async function getAuthedClient() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });
  if (linkError || !link) throw new Error(`generateLink failed: ${linkError?.message}`);

  const anon = createClient(SUPABASE_URL, ANON_KEY);
  const { data: session, error: otpError } = await anon.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: "magiclink",
  });
  if (otpError || !session.session) throw new Error(`verifyOtp failed: ${otpError?.message}`);

  const authed = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${session.session.access_token}` } },
  });
  return { authed, userId: session.user!.id };
}

type IngredientSeed = {
  name: string;
  category: string;
  state: "raw" | "cooked";
  nutrition: Record<string, number>;
  conversions?: { unit: string; grams_per_unit: number }[];
};

const INGREDIENTS: IngredientSeed[] = [
  { name: "Chicken breast", category: "Protein", state: "raw", nutrition: { calories_kcal: 165, protein_g: 31, fat_g: 3.6, carbohydrate_g: 0 } },
  { name: "Beef mince", category: "Protein", state: "raw", nutrition: { calories_kcal: 250, protein_g: 26, fat_g: 17, saturated_fat_g: 7 } },
  { name: "Salmon fillet", category: "Protein", state: "raw", nutrition: { calories_kcal: 208, protein_g: 20, fat_g: 13 } },
  { name: "Firm tofu", category: "Protein", state: "raw", nutrition: { calories_kcal: 144, protein_g: 15, fat_g: 9, carbohydrate_g: 3 }, conversions: [{ unit: "piece", grams_per_unit: 400 }] },
  { name: "Eggs", category: "Protein", state: "raw", nutrition: { calories_kcal: 143, protein_g: 13, fat_g: 10 }, conversions: [{ unit: "piece", grams_per_unit: 50 }] },
  { name: "Chickpeas (canned)", category: "Legume", state: "cooked", nutrition: { calories_kcal: 139, protein_g: 7.3, carbohydrate_g: 22.5, fibre_g: 7.6 }, conversions: [{ unit: "cup", grams_per_unit: 164 }] },
  { name: "Brown rice", category: "Grain", state: "cooked", nutrition: { calories_kcal: 123, protein_g: 2.7, carbohydrate_g: 25.6, fibre_g: 1.6 }, conversions: [{ unit: "cup", grams_per_unit: 195 }] },
  { name: "Quinoa", category: "Grain", state: "cooked", nutrition: { calories_kcal: 120, protein_g: 4.4, carbohydrate_g: 21.3, fibre_g: 2.8 }, conversions: [{ unit: "cup", grams_per_unit: 185 }] },
  { name: "Pasta (dried)", category: "Grain", state: "raw", nutrition: { calories_kcal: 371, protein_g: 13, carbohydrate_g: 75, fibre_g: 3.2 } },
  { name: "Plain flour", category: "Baking", state: "raw", nutrition: { calories_kcal: 364, protein_g: 10.3, carbohydrate_g: 76.3, fibre_g: 2.7 }, conversions: [{ unit: "cup", grams_per_unit: 120 }, { unit: "tbsp", grams_per_unit: 8 }] },
  { name: "Sugar", category: "Baking", state: "raw", nutrition: { calories_kcal: 387, carbohydrate_g: 100, sugars_g: 100 }, conversions: [{ unit: "cup", grams_per_unit: 200 }, { unit: "tbsp", grams_per_unit: 12.5 }] },
  { name: "Olive oil", category: "Fat", state: "raw", nutrition: { calories_kcal: 884, fat_g: 100, saturated_fat_g: 14 }, conversions: [{ unit: "tbsp", grams_per_unit: 13.5 }, { unit: "tsp", grams_per_unit: 4.5 }] },
  { name: "Butter", category: "Fat", state: "raw", nutrition: { calories_kcal: 717, fat_g: 81, saturated_fat_g: 51 }, conversions: [{ unit: "tbsp", grams_per_unit: 14 }] },
  { name: "Milk (full cream)", category: "Dairy", state: "raw", nutrition: { calories_kcal: 61, protein_g: 3.2, fat_g: 3.3, carbohydrate_g: 4.8 }, conversions: [{ unit: "cup", grams_per_unit: 240 }] },
  { name: "Greek yoghurt", category: "Dairy", state: "raw", nutrition: { calories_kcal: 59, protein_g: 10, fat_g: 0.4, carbohydrate_g: 3.6 }, conversions: [{ unit: "cup", grams_per_unit: 245 }] },
  { name: "Cheddar cheese", category: "Dairy", state: "raw", nutrition: { calories_kcal: 403, protein_g: 25, fat_g: 33, saturated_fat_g: 21 } },
  { name: "Onion", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 40, protein_g: 1.1, carbohydrate_g: 9.3, fibre_g: 1.7 }, conversions: [{ unit: "piece", grams_per_unit: 150 }] },
  { name: "Garlic", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 149, protein_g: 6.4, carbohydrate_g: 33 }, conversions: [{ unit: "clove", grams_per_unit: 3 }] },
  { name: "Tomato", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 18, protein_g: 0.9, carbohydrate_g: 3.9, fibre_g: 1.2 }, conversions: [{ unit: "piece", grams_per_unit: 120 }] },
  { name: "Capsicum", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 31, protein_g: 1, carbohydrate_g: 6, fibre_g: 2.1 }, conversions: [{ unit: "piece", grams_per_unit: 120 }] },
  { name: "Carrot", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 41, protein_g: 0.9, carbohydrate_g: 9.6, fibre_g: 2.8 }, conversions: [{ unit: "piece", grams_per_unit: 60 }] },
  { name: "Broccoli", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 34, protein_g: 2.8, carbohydrate_g: 6.6, fibre_g: 2.6 } },
  { name: "Spinach", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 23, protein_g: 2.9, carbohydrate_g: 3.6, fibre_g: 2.2, iron_mg: 2.7 } },
  { name: "Potato", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 77, protein_g: 2, carbohydrate_g: 17, fibre_g: 2.2 }, conversions: [{ unit: "piece", grams_per_unit: 170 }] },
  { name: "Mushrooms", category: "Vegetable", state: "raw", nutrition: { calories_kcal: 22, protein_g: 3.1, carbohydrate_g: 3.3, fibre_g: 1 } },
  { name: "Avocado", category: "Fruit", state: "raw", nutrition: { calories_kcal: 160, protein_g: 2, fat_g: 15, fibre_g: 6.7 }, conversions: [{ unit: "piece", grams_per_unit: 200 }] },
  { name: "Lemon", category: "Fruit", state: "raw", nutrition: { calories_kcal: 29, protein_g: 1.1, carbohydrate_g: 9.3, fibre_g: 2.8 }, conversions: [{ unit: "piece", grams_per_unit: 60 }] },
  { name: "Banana", category: "Fruit", state: "raw", nutrition: { calories_kcal: 89, protein_g: 1.1, carbohydrate_g: 22.8, fibre_g: 2.6, sugars_g: 12.2 }, conversions: [{ unit: "piece", grams_per_unit: 120 }] },
  { name: "Soy sauce", category: "Condiment", state: "raw", nutrition: { calories_kcal: 53, protein_g: 8, carbohydrate_g: 4.9, sodium_mg: 5493 }, conversions: [{ unit: "tbsp", grams_per_unit: 18 }] },
  { name: "Ground cumin", category: "Spice", state: "raw", nutrition: { calories_kcal: 375, protein_g: 17.8, carbohydrate_g: 44.2, fibre_g: 10.5 }, conversions: [{ unit: "tsp", grams_per_unit: 2.1 }] },
];

type RecipeSeed = {
  title: string;
  description: string;
  cuisine: string;
  difficulty: "easy" | "medium" | "hard";
  mealType: string[];
  dietaryLabels: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: { name: string; quantity: number; unit: string | null; note?: string }[];
  steps: string[];
};

const RECIPES: RecipeSeed[] = [
  {
    title: "Weeknight Chicken Stir-Fry",
    description: "Fast, colourful, and endlessly adaptable to whatever vegetables are in the crisper.",
    cuisine: "Asian",
    difficulty: "easy",
    mealType: ["Dinner", "Meal Prep"],
    dietaryLabels: ["Dairy Free"],
    prepTime: 15,
    cookTime: 10,
    servings: 4,
    ingredients: [
      { name: "Chicken breast", quantity: 500, unit: "g" },
      { name: "Capsicum", quantity: 2, unit: "piece" },
      { name: "Carrot", quantity: 2, unit: "piece" },
      { name: "Garlic", quantity: 3, unit: "clove" },
      { name: "Soy sauce", quantity: 3, unit: "tbsp" },
      { name: "Olive oil", quantity: 2, unit: "tbsp" },
    ],
    steps: [
      "Slice the chicken breast into thin strips.",
      "Heat oil in a wok over high heat and stir-fry the chicken until golden, about 5 minutes.",
      "Add the vegetables and garlic, stir-frying for another 3-4 minutes until crisp-tender.",
      "Pour in the soy sauce, toss to coat, and serve immediately over rice.",
    ],
  },
  {
    title: "Classic Beef Bolognese",
    description: "A rich, slow-simmered sauce the whole family can agree on.",
    cuisine: "Italian",
    difficulty: "medium",
    mealType: ["Dinner"],
    dietaryLabels: [],
    prepTime: 15,
    cookTime: 45,
    servings: 6,
    ingredients: [
      { name: "Beef mince", quantity: 600, unit: "g" },
      { name: "Onion", quantity: 1, unit: "piece" },
      { name: "Garlic", quantity: 2, unit: "clove" },
      { name: "Tomato", quantity: 4, unit: "piece" },
      { name: "Pasta (dried)", quantity: 500, unit: "g" },
      { name: "Olive oil", quantity: 2, unit: "tbsp" },
    ],
    steps: [
      "Finely dice the onion and garlic.",
      "Brown the beef mince in a large pot with olive oil, then set aside.",
      "Sauté the onion and garlic until soft, then return the beef to the pot.",
      "Add chopped tomatoes and simmer, covered, for 30-40 minutes, stirring occasionally.",
      "Cook pasta according to packet instructions and serve the sauce on top.",
    ],
  },
  {
    title: "Honey Garlic Salmon",
    description: "A sticky, 20-minute salmon dinner that still feels special.",
    cuisine: "Fusion",
    difficulty: "easy",
    mealType: ["Dinner"],
    dietaryLabels: ["Dairy Free", "Gluten Free"],
    prepTime: 10,
    cookTime: 12,
    servings: 2,
    ingredients: [
      { name: "Salmon fillet", quantity: 2, unit: "piece", note: "about 180g each" },
      { name: "Garlic", quantity: 2, unit: "clove" },
      { name: "Soy sauce", quantity: 2, unit: "tbsp" },
      { name: "Olive oil", quantity: 1, unit: "tbsp" },
    ],
    steps: [
      "Pat the salmon dry and season with salt and pepper.",
      "Sear skin-side down in a hot pan with olive oil for 4-5 minutes.",
      "Flip, add minced garlic and soy sauce, and cook for a further 3-4 minutes, basting with the pan sauce.",
    ],
  },
  {
    title: "Crispy Tofu Buddha Bowl",
    description: "A build-your-own bowl with crispy tofu, quinoa and a tahini-free dressing.",
    cuisine: "Fusion",
    difficulty: "medium",
    mealType: ["Lunch", "Dinner", "Meal Prep"],
    dietaryLabels: ["Vegan", "Vegetarian", "Dairy Free"],
    prepTime: 20,
    cookTime: 20,
    servings: 2,
    ingredients: [
      { name: "Firm tofu", quantity: 0.5, unit: "piece" },
      { name: "Quinoa", quantity: 1, unit: "cup" },
      { name: "Spinach", quantity: 100, unit: "g" },
      { name: "Avocado", quantity: 1, unit: "piece" },
      { name: "Olive oil", quantity: 1, unit: "tbsp" },
    ],
    steps: [
      "Press and cube the tofu, then pan-fry in olive oil until golden and crisp on all sides.",
      "Cook the quinoa according to packet instructions.",
      "Assemble bowls with quinoa, spinach, crispy tofu and sliced avocado.",
    ],
  },
  {
    title: "Weekend Pancakes",
    description: "Fluffy buttermilk-style pancakes for a lazy Sunday morning.",
    cuisine: "American",
    difficulty: "easy",
    mealType: ["Breakfast"],
    dietaryLabels: ["Vegetarian"],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    ingredients: [
      { name: "Plain flour", quantity: 2, unit: "cup" },
      { name: "Milk (full cream)", quantity: 1.5, unit: "cup" },
      { name: "Eggs", quantity: 2, unit: "piece" },
      { name: "Sugar", quantity: 2, unit: "tbsp" },
      { name: "Butter", quantity: 2, unit: "tbsp", note: "melted, plus extra for the pan" },
    ],
    steps: [
      "Whisk together flour and sugar in a large bowl.",
      "In a separate bowl, whisk the milk, eggs and melted butter.",
      "Combine the wet and dry ingredients, stirring until just combined (a few lumps are fine).",
      "Cook spoonfuls on a buttered griddle over medium heat until bubbles form, then flip.",
    ],
  },
  {
    title: "Mushroom Risotto",
    description: "Creamy, comforting risotto that rewards a little patience at the stove.",
    cuisine: "Italian",
    difficulty: "hard",
    mealType: ["Dinner"],
    dietaryLabels: ["Vegetarian"],
    prepTime: 10,
    cookTime: 35,
    servings: 4,
    ingredients: [
      { name: "Mushrooms", quantity: 300, unit: "g" },
      { name: "Onion", quantity: 1, unit: "piece" },
      { name: "Garlic", quantity: 2, unit: "clove" },
      { name: "Butter", quantity: 3, unit: "tbsp" },
      { name: "Cheddar cheese", quantity: 50, unit: "g", note: "or parmesan if you have it" },
    ],
    steps: [
      "Sauté the sliced mushrooms until golden and set aside.",
      "In the same pot, sauté diced onion and garlic in butter until translucent.",
      "Add risotto rice and toast for a minute, then add hot stock a ladle at a time, stirring constantly.",
      "Once the rice is creamy and al dente, fold through the mushrooms and cheese.",
    ],
  },
  {
    title: "Loaded Potato Soup",
    description: "A thick, warming soup that's basically a baked potato in a bowl.",
    cuisine: "American",
    difficulty: "easy",
    mealType: ["Dinner", "Lunch"],
    dietaryLabels: ["Vegetarian", "Gluten Free"],
    prepTime: 15,
    cookTime: 30,
    servings: 6,
    ingredients: [
      { name: "Potato", quantity: 6, unit: "piece" },
      { name: "Onion", quantity: 1, unit: "piece" },
      { name: "Milk (full cream)", quantity: 2, unit: "cup" },
      { name: "Cheddar cheese", quantity: 100, unit: "g" },
      { name: "Butter", quantity: 2, unit: "tbsp" },
    ],
    steps: [
      "Peel and dice the potatoes, then simmer in salted water until tender.",
      "Sauté the diced onion in butter until soft.",
      "Drain the potatoes, mash roughly, then combine with the onion and milk over low heat.",
      "Stir through the cheese until melted and season to taste.",
    ],
  },
  {
    title: "Chickpea & Spinach Curry",
    description: "A pantry-friendly curry that comes together in one pot.",
    cuisine: "Indian",
    difficulty: "easy",
    mealType: ["Dinner", "Meal Prep"],
    dietaryLabels: ["Vegan", "Vegetarian", "Dairy Free", "High Fibre"],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    ingredients: [
      { name: "Chickpeas (canned)", quantity: 2, unit: "cup" },
      { name: "Spinach", quantity: 150, unit: "g" },
      { name: "Onion", quantity: 1, unit: "piece" },
      { name: "Garlic", quantity: 3, unit: "clove" },
      { name: "Tomato", quantity: 3, unit: "piece" },
      { name: "Ground cumin", quantity: 2, unit: "tsp" },
      { name: "Olive oil", quantity: 2, unit: "tbsp" },
    ],
    steps: [
      "Sauté diced onion and garlic in oil until fragrant.",
      "Stir in cumin and cook for a minute, then add chopped tomatoes and simmer for 10 minutes.",
      "Add the chickpeas and simmer for a further 10 minutes.",
      "Stir through spinach until wilted and serve with rice or flatbread.",
    ],
  },
  {
    title: "Greek Yoghurt Banana Bowl",
    description: "A five-minute high-protein breakfast or snack.",
    cuisine: "Mediterranean",
    difficulty: "easy",
    mealType: ["Breakfast", "Snacks"],
    dietaryLabels: ["Vegetarian", "Gluten Free", "High Protein"],
    prepTime: 5,
    cookTime: 0,
    servings: 1,
    ingredients: [
      { name: "Greek yoghurt", quantity: 1, unit: "cup" },
      { name: "Banana", quantity: 1, unit: "piece" },
    ],
    steps: ["Slice the banana and layer with yoghurt in a bowl. Top with whatever you have on hand."],
  },
  {
    title: "Roast Vegetable Pasta",
    description: "Oven-roasted vegetables tossed through pasta with olive oil and garlic.",
    cuisine: "Italian",
    difficulty: "easy",
    mealType: ["Dinner"],
    dietaryLabels: ["Vegetarian", "Vegan", "Dairy Free"],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    ingredients: [
      { name: "Pasta (dried)", quantity: 400, unit: "g" },
      { name: "Capsicum", quantity: 2, unit: "piece" },
      { name: "Mushrooms", quantity: 200, unit: "g" },
      { name: "Garlic", quantity: 3, unit: "clove" },
      { name: "Olive oil", quantity: 3, unit: "tbsp" },
    ],
    steps: [
      "Toss chopped vegetables and garlic in olive oil and roast at 200°C for 25 minutes.",
      "Cook the pasta according to packet instructions, reserving a cup of pasta water.",
      "Toss the pasta with the roasted vegetables, loosening with a little pasta water as needed.",
    ],
  },
  {
    title: "Simple Avocado Toast",
    description: "A café classic, done at home in five minutes.",
    cuisine: "Fusion",
    difficulty: "easy",
    mealType: ["Breakfast", "Snacks"],
    dietaryLabels: ["Vegetarian", "Vegan", "Dairy Free"],
    prepTime: 5,
    cookTime: 2,
    servings: 1,
    ingredients: [
      { name: "Avocado", quantity: 1, unit: "piece" },
      { name: "Lemon", quantity: 0.25, unit: "piece" },
    ],
    steps: ["Toast your bread of choice.", "Mash the avocado with a squeeze of lemon juice, salt and pepper, and spread generously."],
  },
  {
    title: "Beef & Broccoli",
    description: "A takeaway favourite that's faster (and cheaper) to make at home.",
    cuisine: "Asian",
    difficulty: "medium",
    mealType: ["Dinner"],
    dietaryLabels: ["Dairy Free"],
    prepTime: 15,
    cookTime: 10,
    servings: 4,
    ingredients: [
      { name: "Beef mince", quantity: 500, unit: "g" },
      { name: "Broccoli", quantity: 300, unit: "g" },
      { name: "Garlic", quantity: 2, unit: "clove" },
      { name: "Soy sauce", quantity: 3, unit: "tbsp" },
      { name: "Olive oil", quantity: 2, unit: "tbsp" },
    ],
    steps: [
      "Brown the beef in a hot wok with oil.",
      "Add broccoli florets and garlic, stir-frying for 3-4 minutes.",
      "Pour in soy sauce, toss to coat, and serve over rice.",
    ],
  },
  {
    title: "Spanish Tortilla",
    description: "A hearty potato and egg omelette, served warm or at room temperature.",
    cuisine: "Spanish",
    difficulty: "medium",
    mealType: ["Dinner", "Lunch", "Breakfast"],
    dietaryLabels: ["Vegetarian", "Gluten Free"],
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    ingredients: [
      { name: "Potato", quantity: 4, unit: "piece" },
      { name: "Onion", quantity: 1, unit: "piece" },
      { name: "Eggs", quantity: 6, unit: "piece" },
      { name: "Olive oil", quantity: 4, unit: "tbsp" },
    ],
    steps: [
      "Thinly slice the potatoes and onion, then gently fry in olive oil until soft (not browned), about 15 minutes.",
      "Beat the eggs in a large bowl, season, then fold through the potato mixture.",
      "Pour back into the pan and cook over low heat until mostly set, then flip to finish the other side.",
    ],
  },
  {
    title: "Quinoa Tabbouleh",
    description: "A fresh, herby salad with quinoa standing in for the traditional bulgur.",
    cuisine: "Mediterranean",
    difficulty: "easy",
    mealType: ["Lunch", "Sides", "Meal Prep"],
    dietaryLabels: ["Vegan", "Vegetarian", "Gluten Free", "Dairy Free"],
    prepTime: 20,
    cookTime: 15,
    servings: 4,
    ingredients: [
      { name: "Quinoa", quantity: 1.5, unit: "cup" },
      { name: "Tomato", quantity: 3, unit: "piece" },
      { name: "Lemon", quantity: 1, unit: "piece" },
      { name: "Olive oil", quantity: 3, unit: "tbsp" },
    ],
    steps: [
      "Cook the quinoa and allow it to cool.",
      "Dice the tomatoes finely and combine with the quinoa.",
      "Dress with lemon juice, olive oil, salt and pepper, and toss well.",
    ],
  },
  {
    title: "Cheesy Baked Eggs",
    description: "A simple, protein-packed breakfast baked in a single dish.",
    cuisine: "Mediterranean",
    difficulty: "easy",
    mealType: ["Breakfast"],
    dietaryLabels: ["Vegetarian", "High Protein", "Gluten Free"],
    prepTime: 10,
    cookTime: 20,
    servings: 2,
    ingredients: [
      { name: "Eggs", quantity: 4, unit: "piece" },
      { name: "Tomato", quantity: 2, unit: "piece" },
      { name: "Cheddar cheese", quantity: 50, unit: "g" },
      { name: "Spinach", quantity: 50, unit: "g" },
    ],
    steps: [
      "Scatter chopped tomato and spinach in a baking dish.",
      "Crack the eggs over the top and sprinkle with cheese.",
      "Bake at 190°C for 15-18 minutes until the whites are set.",
    ],
  },
];

async function main() {
  console.log(`Seeding dummy data for ${TEST_EMAIL}...`);
  const { authed, userId } = await getAuthedClient();

  const { data: membership, error: membershipError } = await authed
    .from("household_members")
    .select("household_id, households(name)")
    .eq("user_id", userId)
    .limit(1)
    .single();
  if (membershipError || !membership) throw new Error(`Could not find a household for ${TEST_EMAIL}`);
  const householdId = membership.household_id;
  console.log(`Using household: ${(membership.households as unknown as { name: string }).name} (${householdId})`);

  // ---- Ingredients ----
  const ingredientIds = new Map<string, string>();
  for (const ing of INGREDIENTS) {
    const { data, error } = await authed.rpc("create_ingredient", {
      p_ingredient: {
        visibility: "household",
        household_id: householdId,
        name: ing.name,
        food_category: ing.category,
        state: ing.state,
      },
      p_nutrition: ing.nutrition,
      p_conversions: (ing.conversions ?? []).map((c) => ({ unit: c.unit, grams_per_unit: c.grams_per_unit })),
    });
    if (error) {
      console.error(`  ✗ ingredient "${ing.name}": ${error.message}`);
      continue;
    }
    ingredientIds.set(ing.name, data as string);
    console.log(`  ✓ ingredient: ${ing.name}`);
  }

  // ---- Tags ----
  const tagNames = ["Weeknight", "Meal Prep Friendly", "Kid Approved", "Budget", "Freezer Friendly"];
  const tagIds = new Map<string, string>();
  for (const name of tagNames) {
    const { data, error } = await authed
      .from("tags")
      .insert({ name, visibility: "household", household_id: householdId })
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ tag "${name}": ${error.message}`);
      continue;
    }
    tagIds.set(name, data.id);
    console.log(`  ✓ tag: ${name}`);
  }

  // ---- Recipes ----
  const recipeIds: string[] = [];
  for (const recipe of RECIPES) {
    const assignedTags = [...tagIds.values()].filter(() => Math.random() > 0.6);
    const { data, error } = await authed.rpc("create_recipe", {
      p_recipe: {
        visibility: "household",
        household_id: householdId,
        title: recipe.title,
        description: recipe.description,
        prep_time_minutes: recipe.prepTime,
        cook_time_minutes: recipe.cookTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        cuisine: recipe.cuisine,
        meal_type: recipe.mealType,
        dietary_labels: recipe.dietaryLabels,
        dietary_labels_verified: recipe.dietaryLabels,
        tag_ids: assignedTags,
      },
      p_ingredients: recipe.ingredients.map((i) => ({
        ingredient_name: i.name,
        ingredient_id: ingredientIds.get(i.name) ?? "",
        quantity: i.quantity,
        unit: i.unit ?? "",
        preparation_note: i.note ?? "",
      })),
      p_steps: recipe.steps.map((instruction) => ({ instruction })),
    });
    if (error) {
      console.error(`  ✗ recipe "${recipe.title}": ${error.message}`);
      continue;
    }
    recipeIds.push(data as string);
    console.log(`  ✓ recipe: ${recipe.title}`);
  }

  // ---- Collections ----
  const collections = [
    { name: "Family Favourites", description: "The ones we make on repeat." },
    { name: "Quick Weeknight Dinners", description: "On the table in 30 minutes or less." },
  ];
  for (const col of collections) {
    const { data, error } = await authed
      .from("collections")
      .insert({ ...col, visibility: "household", household_id: householdId })
      .select("id")
      .single();
    if (error) {
      console.error(`  ✗ collection "${col.name}": ${error.message}`);
      continue;
    }
    const members = recipeIds.filter(() => Math.random() > 0.65);
    for (const recipeId of members) {
      await authed.from("collection_recipes").insert({ collection_id: data.id, recipe_id: recipeId });
    }
    console.log(`  ✓ collection: ${col.name} (${members.length} recipes)`);
  }

  // ---- A few favourites ----
  for (const recipeId of recipeIds.filter(() => Math.random() > 0.7)) {
    await authed.from("recipe_favourites").insert({ recipe_id: recipeId, user_id: userId });
  }

  console.log(`\nDone. Seeded ${ingredientIds.size} ingredients, ${recipeIds.length} recipes, ${tagIds.size} tags, ${collections.length} collections.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
