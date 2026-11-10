import type { IngredientFormValues } from "@/lib/validations/ingredient";

/** Shapes a validated ingredient form into the JSONB payload the create_ingredient / update_ingredient RPCs expect. */
export function toIngredientRpcPayload(values: IngredientFormValues) {
  const n = values.nutrition;
  return {
    ingredient: {
      visibility: values.visibility,
      household_id: values.visibility === "household" ? values.household_id : null,
      name: values.name,
      alternative_names: values.alternative_names,
      food_category: values.food_category ?? "",
      state: values.state ?? "",
      brand: values.brand ?? "",
      allergens: values.allergens,
      notes: values.notes ?? "",
      nutrition_reference_amount: values.nutrition_reference_amount,
      nutrition_reference_unit: values.nutrition_reference_unit,
    },
    nutrition: {
      source_id: n.source_id ?? "",
      source_detail: n.source_detail ?? "",
      energy_kj: n.energy_kj ?? "",
      calories_kcal: n.calories_kcal ?? "",
      protein_g: n.protein_g ?? "",
      carbohydrate_g: n.carbohydrate_g ?? "",
      fat_g: n.fat_g ?? "",
      saturated_fat_g: n.saturated_fat_g ?? "",
      fibre_g: n.fibre_g ?? "",
      sugars_g: n.sugars_g ?? "",
      sodium_mg: n.sodium_mg ?? "",
      iron_mg: n.iron_mg ?? "",
      calcium_mg: n.calcium_mg ?? "",
      potassium_mg: n.potassium_mg ?? "",
      magnesium_mg: n.magnesium_mg ?? "",
      vitamin_b12_ug: n.vitamin_b12_ug ?? "",
      folate_ug: n.folate_ug ?? "",
    },
    conversions: values.conversions.map((c) => ({
      unit: c.unit,
      grams_per_unit: c.grams_per_unit,
    })),
  };
}
