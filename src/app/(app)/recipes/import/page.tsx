import { getHouseholdContext } from "@/lib/households/context";
import { ImportRecipeForm } from "@/components/recipes/import-recipe-form";

export default async function ImportRecipePage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import a recipe</h1>
        <p className="text-sm text-muted-foreground">
          Import from a recipe website URL, or paste a JSON export from this app (or another Family Recipe Vault
          household).
        </p>
      </div>
      <ImportRecipeForm households={editableHouseholds} />
    </div>
  );
}
