import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  Clock,
  Flame,
  History,
  Pencil,
  Printer,
  Scale,
  Users as UsersIcon,
} from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { signRecipeImageUrls } from "@/lib/supabase/storage";
import {
  calculateRecipeNutrition,
  type RecipeIngredientForCalc,
  type NutrientSet,
} from "@/lib/nutrition/calculate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FavouriteButton } from "@/components/recipes/favourite-button";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";
import { DuplicateRecipeDialog } from "@/components/recipes/duplicate-recipe-dialog";
import { AddToCollectionDialog } from "@/components/categories/add-to-collection-dialog";
import { PersonalNoteCard } from "@/components/recipes/personal-note-card";
import { ImageUpload } from "@/components/recipes/image-upload";
import {
  RecipeImageGallery,
  type RecipeImageItem,
} from "@/components/recipes/recipe-image-gallery";
import { ServingScaler, type ScalableIngredient } from "@/components/recipes/serving-scaler";
import { NutritionCard } from "@/components/nutrition/nutrition-card";
import { ExportRecipeMenu } from "@/components/recipes/export-recipe-menu";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select(
      `id, household_id, visibility, created_by, last_edited_by, original_author_id, title, description,
       source, source_url, author_name, prep_time_minutes, cook_time_minutes, resting_time_minutes,
       servings, serving_size, finished_weight_grams, difficulty, cuisine, meal_type, cooking_method,
       equipment, dietary_labels, dietary_labels_verified, created_at, updated_at,
       creator:profiles!recipes_created_by_fkey(display_name, avatar_url),
       editor:profiles!recipes_last_edited_by_fkey(display_name),
       recipe_ingredients(id, position, ingredient_name, quantity, unit, preparation_note, brand, ingredient_id, nutrition_override, is_section_header,
         ingredients(nutrition_reference_amount, nutrition_reference_unit, ingredient_nutrition(energy_kj, calories_kcal, protein_g, carbohydrate_g, fat_g, saturated_fat_g,
           fibre_g, sugars_g, sodium_mg, iron_mg, calcium_mg, potassium_mg, magnesium_mg, vitamin_b12_ug, folate_ug),
           ingredient_measurement_conversions(unit, grams_per_unit))),
       recipe_steps(id, position, instruction, duration_minutes, temperature_celsius, equipment, tip, is_section_header),
       recipe_images(id, storage_path, is_primary, caption, position),
       recipe_tags(tags(id, name))`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!recipe) notFound();

  const [{ data: favourite }, { data: note }, { data: collectionRows }, imageUrlMap] =
    await Promise.all([
      supabase
        .from("recipe_favourites")
        .select("id")
        .eq("recipe_id", id)
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      supabase
        .from("recipe_personal_notes")
        .select("note")
        .eq("recipe_id", id)
        .eq("user_id", ctx.userId)
        .maybeSingle(),
      ctx.activeHousehold
        ? supabase
            .from("collections")
            .select("id, name, collection_recipes(recipe_id)")
            .or(`visibility.eq.personal,household_id.eq.${ctx.activeHousehold.householdId}`)
            .order("name")
        : supabase
            .from("collections")
            .select("id, name, collection_recipes(recipe_id)")
            .eq("visibility", "personal")
            .order("name"),
      signRecipeImageUrls(recipe.recipe_images.map((i) => i.storage_path)),
    ]);

  const collectionOptions = (collectionRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    inCollection: c.collection_recipes.some((cr) => cr.recipe_id === id),
  }));

  const householdRole = recipe.household_id
    ? ctx.households.find((h) => h.householdId === recipe.household_id)?.role
    : null;
  const canEdit =
    recipe.visibility === "personal"
      ? recipe.created_by === ctx.userId
      : householdRole === "owner" || householdRole === "editor";
  const canDelete =
    recipe.visibility === "personal" ? recipe.created_by === ctx.userId : householdRole === "owner";

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  const ingredients = [...recipe.recipe_ingredients].sort((a, b) => a.position - b.position);
  const steps = [...recipe.recipe_steps].sort((a, b) => a.position - b.position);

  const scalableIngredients: ScalableIngredient[] = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.ingredient_name,
    quantity: ing.quantity,
    unit: ing.unit,
    preparationNote: ing.preparation_note,
    brand: ing.brand,
    isSectionHeader: ing.is_section_header,
  }));

  const nutritionInputs: RecipeIngredientForCalc[] = ingredients
    .filter((ing) => !ing.is_section_header)
    .map((ing) => {
    const conversions = Object.fromEntries(
      (ing.ingredients?.ingredient_measurement_conversions ?? []).map((c) => [
        c.unit,
        c.grams_per_unit,
      ]),
    );
    return {
      id: ing.id,
      ingredientName: ing.ingredient_name,
      quantity: ing.quantity,
      unit: ing.unit,
      nutritionOverride: (ing.nutrition_override as NutrientSet | null) ?? null,
      ingredientNutrition: ing.ingredients?.ingredient_nutrition ?? null,
      nutritionReferenceAmount: ing.ingredients?.nutrition_reference_amount,
      nutritionReferenceUnit: ing.ingredients?.nutrition_reference_unit as "g" | "ml" | undefined,
      conversions,
    };
  });
  const nutritionResult = calculateRecipeNutrition(nutritionInputs);
  const images: RecipeImageItem[] = [...recipe.recipe_images]
    .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.position - b.position)
    .map((img) => ({
      id: img.id,
      url: imageUrlMap[img.storage_path] ?? "",
      storagePath: img.storage_path,
      isPrimary: img.is_primary,
      caption: img.caption,
    }))
    .filter((img) => img.url);

  const totalTime =
    (recipe.prep_time_minutes ?? 0) +
    (recipe.cook_time_minutes ?? 0) +
    (recipe.resting_time_minutes ?? 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{recipe.title}</h1>
            <Badge variant={recipe.visibility === "household" ? "default" : "secondary"}>
              {recipe.visibility === "household" ? "Household" : "Personal"}
            </Badge>
          </div>
          {recipe.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">{recipe.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            {recipe.author_name ? `By ${recipe.author_name} · ` : ""}
            Added by {recipe.creator?.display_name ?? "Unknown"}
            {recipe.editor && recipe.editor.display_name !== recipe.creator?.display_name
              ? ` · Last edited by ${recipe.editor.display_name}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FavouriteButton recipeId={recipe.id} isFavourite={!!favourite} />
          {canEdit ? (
            <Button render={<Link href={`/recipes/${recipe.id}/edit`} />} variant="outline">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : null}
          <AddToCollectionDialog recipeId={recipe.id} collections={collectionOptions} />
          <DuplicateRecipeDialog recipeId={recipe.id} households={editableHouseholds} />
          {canEdit ? (
            <Button render={<Link href={`/recipes/${recipe.id}/history`} />} variant="outline">
              <History className="h-4 w-4" />
              History
            </Button>
          ) : null}
          <Button
            render={<a href={`/recipes/${recipe.id}/print`} target="_blank" rel="noopener" />}
            variant="outline"
          >
            <Printer className="h-4 w-4" />
            Print / PDF
          </Button>
          <ExportRecipeMenu recipeId={recipe.id} />
          {canDelete ? <DeleteRecipeButton recipeId={recipe.id} title={recipe.title} /> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {recipe.difficulty ? (
          <Badge variant="outline" className="capitalize">
            {recipe.difficulty}
          </Badge>
        ) : null}
        {recipe.cuisine ? <Badge variant="outline">{recipe.cuisine}</Badge> : null}
        {recipe.cooking_method ? <Badge variant="outline">{recipe.cooking_method}</Badge> : null}
        {recipe.meal_type.map((mt) => (
          <Badge key={mt} variant="outline">
            {mt}
          </Badge>
        ))}
        {recipe.dietary_labels.map((label) => {
          const verified = recipe.dietary_labels_verified.includes(label);
          return (
            <Badge
              key={label}
              variant={verified ? "default" : "secondary"}
              title={verified ? "Verified" : "Applied, not yet verified"}
            >
              {verified ? <Check className="h-3 w-3" /> : null}
              {label}
            </Badge>
          );
        })}
        {recipe.recipe_tags.map((rt) =>
          rt.tags ? (
            <Badge key={rt.tags.id} variant="outline">
              #{rt.tags.name}
            </Badge>
          ) : null,
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          icon={Clock}
          label="Prep"
          value={recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min` : "—"}
          chip="bg-chart-2/20 text-chart-2"
        />
        <StatTile
          icon={Flame}
          label="Cook"
          value={recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min` : "—"}
          chip="bg-chart-3/20 text-chart-3"
        />
        <StatTile
          icon={Clock}
          label="Total"
          value={totalTime ? `${totalTime} min` : "—"}
          chip="bg-chart-1/20 text-chart-1"
        />
        <StatTile
          icon={UsersIcon}
          label="Servings"
          value={`${recipe.servings}${recipe.serving_size ? ` (${recipe.serving_size})` : ""}`}
          chip="bg-chart-5/20 text-chart-5"
        />
      </div>

      {images.length > 0 || canEdit ? (
        <div className="space-y-3">
          <RecipeImageGallery recipeId={recipe.id} images={images} canEdit={canEdit} />
          {canEdit ? (
            <ImageUpload recipeId={recipe.id} hasPrimary={images.some((i) => i.isPrimary)} />
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <ServingScaler
            originalServings={recipe.servings}
            servingSize={recipe.serving_size}
            ingredients={scalableIngredients}
          />
          <NutritionCard
            recipeTotals={nutritionResult.nutrients}
            servings={recipe.servings}
            finishedWeightGrams={recipe.finished_weight_grams}
            unresolvedIngredientNames={nutritionResult.unresolvedIngredientNames}
          />
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {(() => {
                let stepNumber = 0;
                return steps.map((step) => {
                  if (step.is_section_header) {
                    stepNumber = 0;
                    return (
                      <li key={step.id} className="pt-1 first:pt-0">
                        <p className="text-sm font-semibold">{step.instruction}</p>
                      </li>
                    );
                  }
                  stepNumber += 1;
                  return (
                    <li key={step.id} className="flex gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-chart-2/20 text-xs font-medium text-chart-2">
                        {stepNumber}
                      </span>
                      <div className="space-y-1">
                        <p>{step.instruction}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            step.duration_minutes ? `${step.duration_minutes} min` : null,
                            step.temperature_celsius ? `${step.temperature_celsius}°C` : null,
                            step.equipment,
                            step.tip ? `Tip: ${step.tip}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </li>
                  );
                });
              })()}
            </ol>
          </CardContent>
        </Card>
      </div>

      {recipe.source ||
      recipe.source_url ||
      recipe.equipment.length > 0 ||
      recipe.finished_weight_grams ? (
        <>
          <Separator />
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
            {recipe.source ? <span>Source: {recipe.source}</span> : null}
            {recipe.source_url ? (
              <a href={recipe.source_url} target="_blank" rel="noreferrer" className="underline">
                {recipe.source_url}
              </a>
            ) : null}
            {recipe.equipment.length > 0 ? (
              <span>Equipment: {recipe.equipment.join(", ")}</span>
            ) : null}
            {recipe.finished_weight_grams ? (
              <span className="flex items-center gap-1">
                <Scale className="h-3 w-3" /> {recipe.finished_weight_grams} g finished weight
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      <PersonalNoteCard recipeId={recipe.id} initialNote={note?.note ?? ""} />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  chip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  chip: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${chip}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
