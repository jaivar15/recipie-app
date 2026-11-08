import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";
import { createRecipeAction } from "../actions";
import type { RecipeFormValues } from "@/lib/validations/recipe";

export default async function AddRecipePage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  const supabase = await createClient();
  const { data: tags } = ctx.activeHousehold
    ? await supabase
        .from("tags")
        .select("id, name")
        .or(`visibility.eq.personal,household_id.eq.${ctx.activeHousehold.householdId}`)
        .order("name")
    : await supabase.from("tags").select("id, name").eq("visibility", "personal").order("name");

  async function handleCreate(values: RecipeFormValues) {
    "use server";
    await createRecipeAction(values);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Recipe</h1>
        <p className="text-sm text-muted-foreground">Fill in as much or as little as you like — you can edit it later.</p>
      </div>
      <RecipeForm
        defaultValues={{
          visibility: editableHouseholds.length > 0 ? "household" : "personal",
          household_id: editableHouseholds[0]?.id ?? null,
        }}
        households={editableHouseholds}
        availableTags={tags ?? []}
        submitLabel="Create recipe"
        onSubmit={handleCreate}
      />
    </div>
  );
}
