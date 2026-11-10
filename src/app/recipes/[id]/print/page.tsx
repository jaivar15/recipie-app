import { notFound, redirect } from "next/navigation";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { UNIT_LABELS } from "@/lib/validations/recipe";
import { PrintButton } from "@/components/recipes/print-button";

export default async function RecipePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) redirect("/login");

  const supabase = await createClient();
  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      `title, description, author_name, source, prep_time_minutes, cook_time_minutes, servings, serving_size,
       difficulty, cuisine,
       recipe_ingredients(position, ingredient_name, quantity, unit, preparation_note, brand, is_section_header),
       recipe_steps(position, instruction, duration_minutes, tip, is_section_header)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
  const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="mx-auto max-w-2xl p-8 print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Print preview</p>
        <PrintButton />
      </div>

      <h1 className="text-3xl font-semibold">{recipe.title}</h1>
      {recipe.description ? (
        <p className="mt-2 text-muted-foreground">{recipe.description}</p>
      ) : null}
      <p className="mt-2 text-sm text-muted-foreground">
        {recipe.author_name ? `By ${recipe.author_name}` : null}
        {recipe.source ? ` · ${recipe.source}` : ""}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-y py-3 text-sm">
        {recipe.prep_time_minutes ? <span>Prep: {recipe.prep_time_minutes} min</span> : null}
        {recipe.cook_time_minutes ? <span>Cook: {recipe.cook_time_minutes} min</span> : null}
        {totalTime ? <span>Total: {totalTime} min</span> : null}
        <span>
          Servings: {recipe.servings}
          {recipe.serving_size ? ` (${recipe.serving_size})` : ""}
        </span>
        {recipe.difficulty ? (
          <span className="capitalize">Difficulty: {recipe.difficulty}</span>
        ) : null}
        {recipe.cuisine ? <span>Cuisine: {recipe.cuisine}</span> : null}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <h2 className="mb-2 text-lg font-semibold">Ingredients</h2>
          <ul className="space-y-1.5 text-sm">
            {ingredients.map((ing, i) =>
              ing.is_section_header ? (
                <li key={i} className="pt-2 font-semibold first:pt-0">
                  {ing.ingredient_name}
                </li>
              ) : (
                <li key={i}>
                  {ing.quantity != null ? (
                    <span className="font-medium">
                      {ing.quantity}
                      {ing.unit ? UNIT_LABELS[ing.unit] : ""}{" "}
                    </span>
                  ) : null}
                  {ing.ingredient_name}
                  {ing.preparation_note ? `, ${ing.preparation_note}` : ""}
                </li>
              ),
            )}
          </ul>
        </div>
        <div className="sm:col-span-2">
          <h2 className="mb-2 text-lg font-semibold">Instructions</h2>
          <ol className="space-y-3 text-sm">
            {(() => {
              let stepNumber = 0;
              return steps.map((step, i) => {
                if (step.is_section_header) {
                  stepNumber = 0;
                  return (
                    <li key={i} className="pt-2 font-semibold first:pt-0">
                      {step.instruction}
                    </li>
                  );
                }
                stepNumber += 1;
                return (
                  <li key={i} className="flex gap-3">
                    <span className="font-semibold">{stepNumber}.</span>
                    <span>
                      {step.instruction}
                      {step.duration_minutes ? ` (${step.duration_minutes} min)` : ""}
                      {step.tip ? (
                        <span className="block text-muted-foreground italic">
                          Tip: {step.tip}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              });
            })()}
          </ol>
        </div>
      </div>
    </div>
  );
}
