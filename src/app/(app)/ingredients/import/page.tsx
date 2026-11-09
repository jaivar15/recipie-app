import { getHouseholdContext } from "@/lib/households/context";
import { ImportIngredientsForm } from "@/components/ingredients/import-ingredients-form";

export default async function ImportIngredientsPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import ingredients</h1>
        <p className="text-sm text-muted-foreground">
          Paste or upload a CSV to add many ingredients at once. Unknown nutrition can be left blank —
          it stays unknown, never zero.
        </p>
      </div>
      <ImportIngredientsForm households={editableHouseholds} />
    </div>
  );
}
