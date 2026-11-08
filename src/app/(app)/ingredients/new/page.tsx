import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { IngredientForm } from "@/components/ingredients/ingredient-form";
import { createIngredientAction } from "../actions";
import type { IngredientFormValues } from "@/lib/validations/ingredient";

export default async function NewIngredientPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: sources } = await supabase.from("nutrition_sources").select("id, name").order("name");

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  async function handleCreate(values: IngredientFormValues) {
    "use server";
    await createIngredientAction(values);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Ingredient</h1>
        <p className="text-sm text-muted-foreground">
          Nutrition per 100 g, allergens, and unit conversions for use in recipes.
        </p>
      </div>
      <IngredientForm
        defaultValues={{
          visibility: editableHouseholds.length > 0 ? "household" : "personal",
          household_id: editableHouseholds[0]?.id ?? null,
        }}
        households={editableHouseholds}
        nutritionSources={sources ?? []}
        submitLabel="Create ingredient"
        onSubmit={handleCreate}
      />
    </div>
  );
}
