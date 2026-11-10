import { notFound, redirect } from "next/navigation";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { IngredientForm } from "@/components/ingredients/ingredient-form";
import { updateIngredientAction, deleteIngredientAction } from "../../actions";
import type { IngredientFormValues } from "@/lib/validations/ingredient";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const [{ data: ingredient }, { data: sources }] = await Promise.all([
    supabase
      .from("ingredients")
      .select(
        `id, household_id, visibility, name, alternative_names, food_category, state, brand, allergens, notes, nutrition_reference_amount, nutrition_reference_unit,
         ingredient_nutrition(source_id, source_detail, energy_kj, calories_kcal, protein_g, carbohydrate_g,
           fat_g, saturated_fat_g, fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg,
           magnesium_mg, vitamin_b12_ug, folate_ug),
         ingredient_measurement_conversions(unit, grams_per_unit)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("nutrition_sources").select("id, name").order("name"),
  ]);

  if (!ingredient) notFound();

  const householdRole = ingredient.household_id
    ? ctx.households.find((h) => h.householdId === ingredient.household_id)?.role
    : null;
  const canEdit =
    ingredient.visibility === "personal" || householdRole === "owner" || householdRole === "editor";
  if (!canEdit) redirect("/ingredients");

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  const n = ingredient.ingredient_nutrition;

  const defaultValues: Partial<IngredientFormValues> = {
    visibility: ingredient.visibility,
    household_id: ingredient.household_id,
    name: ingredient.name,
    alternative_names: ingredient.alternative_names,
    food_category: ingredient.food_category ?? "",
    state: (ingredient.state as "raw" | "cooked" | null) ?? undefined,
    brand: ingredient.brand ?? "",
    allergens: ingredient.allergens,
    notes: ingredient.notes ?? "",
    nutrition_reference_amount: Number(ingredient.nutrition_reference_amount),
    nutrition_reference_unit: ingredient.nutrition_reference_unit as "g" | "ml",
    nutrition: n
      ? {
          source_id: n.source_id ?? undefined,
          source_detail: n.source_detail ?? "",
          energy_kj: n.energy_kj ?? undefined,
          calories_kcal: n.calories_kcal ?? undefined,
          protein_g: n.protein_g ?? undefined,
          carbohydrate_g: n.carbohydrate_g ?? undefined,
          fat_g: n.fat_g ?? undefined,
          saturated_fat_g: n.saturated_fat_g ?? undefined,
          fibre_g: n.fibre_g ?? undefined,
          sugars_g: n.sugars_g ?? undefined,
          sodium_mg: n.sodium_mg ?? undefined,
          iron_mg: n.iron_mg ?? undefined,
          calcium_mg: n.calcium_mg ?? undefined,
          potassium_mg: n.potassium_mg ?? undefined,
          magnesium_mg: n.magnesium_mg ?? undefined,
          vitamin_b12_ug: n.vitamin_b12_ug ?? undefined,
          folate_ug: n.folate_ug ?? undefined,
        }
      : {},
    conversions: ingredient.ingredient_measurement_conversions.map((c) => ({
      unit: c.unit,
      grams_per_unit: c.grams_per_unit,
    })),
  };

  async function handleUpdate(values: IngredientFormValues) {
    "use server";
    await updateIngredientAction(id, values);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Ingredient</h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="outline" />}>
            <Trash2 className="h-4 w-4" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {ingredient.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                Recipes using this ingredient keep their saved name and quantity, but lose the link
                to this ingredient&apos;s nutrition data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteIngredientAction.bind(null, id)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <IngredientForm
        defaultValues={defaultValues}
        households={editableHouseholds}
        nutritionSources={sources ?? []}
        submitLabel="Save changes"
        onSubmit={handleUpdate}
      />
    </div>
  );
}
