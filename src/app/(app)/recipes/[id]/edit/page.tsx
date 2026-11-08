import { notFound, redirect } from "next/navigation";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { updateRecipeAction } from "../../actions";
import type { RecipeFormValues } from "@/lib/validations/recipe";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      `id, household_id, visibility, created_by, title, description, source, source_url, author_name,
       prep_time_minutes, cook_time_minutes, resting_time_minutes, servings, serving_size,
       finished_weight_grams, difficulty, cuisine, meal_type, cooking_method, equipment,
       dietary_labels, dietary_labels_verified,
       recipe_ingredients(ingredient_name, quantity, unit, preparation_note, brand, position, ingredient_id),
       recipe_steps(instruction, duration_minutes, temperature_celsius, equipment, tip, position),
       recipe_tags(tag_id)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  const householdRole = recipe.household_id
    ? ctx.households.find((h) => h.householdId === recipe.household_id)?.role
    : null;
  const canEdit =
    recipe.visibility === "personal"
      ? recipe.created_by === ctx.userId
      : householdRole === "owner" || householdRole === "editor";

  if (!canEdit) redirect(`/recipes/${id}`);

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  const { data: tags } = recipe.household_id
    ? await supabase
        .from("tags")
        .select("id, name")
        .or(`visibility.eq.personal,household_id.eq.${recipe.household_id}`)
        .order("name")
    : await supabase.from("tags").select("id, name").eq("visibility", "personal").order("name");

  const defaultValues: Partial<RecipeFormValues> = {
    visibility: recipe.visibility,
    household_id: recipe.household_id,
    title: recipe.title,
    description: recipe.description ?? "",
    source: recipe.source ?? "",
    source_url: recipe.source_url ?? "",
    author_name: recipe.author_name ?? "",
    prep_time_minutes: recipe.prep_time_minutes ?? undefined,
    cook_time_minutes: recipe.cook_time_minutes ?? undefined,
    resting_time_minutes: recipe.resting_time_minutes ?? undefined,
    servings: recipe.servings,
    serving_size: recipe.serving_size ?? "",
    finished_weight_grams: recipe.finished_weight_grams ?? undefined,
    difficulty: recipe.difficulty ?? undefined,
    cuisine: recipe.cuisine ?? "",
    meal_type: recipe.meal_type,
    cooking_method: recipe.cooking_method ?? "",
    equipment: recipe.equipment,
    dietary_labels: recipe.dietary_labels,
    dietary_labels_verified: recipe.dietary_labels_verified,
    tag_ids: recipe.recipe_tags.map((t) => t.tag_id),
    ingredients: [...recipe.recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        ingredient_name: i.ingredient_name,
        ingredient_id: i.ingredient_id,
        quantity: i.quantity ?? undefined,
        unit: i.unit ?? undefined,
        preparation_note: i.preparation_note ?? "",
        brand: i.brand ?? "",
      })),
    steps: [...recipe.recipe_steps]
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        instruction: s.instruction,
        duration_minutes: s.duration_minutes ?? undefined,
        temperature_celsius: s.temperature_celsius ?? undefined,
        equipment: s.equipment ?? "",
        tip: s.tip ?? "",
      })),
  };

  async function handleUpdate(values: RecipeFormValues) {
    "use server";
    await updateRecipeAction(id, values);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Recipe</h1>
      </div>
      <RecipeForm
        defaultValues={defaultValues}
        households={editableHouseholds}
        availableTags={tags ?? []}
        submitLabel="Save changes"
        onSubmit={handleUpdate}
      />
    </div>
  );
}
