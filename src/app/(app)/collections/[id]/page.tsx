import { notFound } from "next/navigation";
import { BookOpen, Trash2 } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { signRecipeImageUrls } from "@/lib/supabase/storage";
import { EmptyState } from "@/components/layout/empty-state";
import { RecipeCard, type RecipeCardData } from "@/components/recipes/recipe-card";
import { EditCollectionDialog } from "@/components/categories/edit-collection-dialog";
import { deleteCollectionAction, removeRecipeFromCollectionAction } from "../../categories/actions";
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

const RECIPE_CARD_FIELDS =
  "id, title, visibility, difficulty, cuisine, prep_time_minutes, cook_time_minutes, servings, author_name, recipe_images(storage_path, is_primary)";

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: collection } = await supabase
    .from("collections")
    .select(`id, name, description, visibility, household_id, created_by, collection_recipes(recipe_id, recipes(${RECIPE_CARD_FIELDS}))`)
    .eq("id", id)
    .maybeSingle();

  if (!collection) notFound();

  const householdRole = collection.household_id
    ? ctx.households.find((h) => h.householdId === collection.household_id)?.role
    : null;
  const canEdit =
    collection.visibility === "personal"
      ? collection.created_by === ctx.userId
      : householdRole === "owner" || householdRole === "editor";

  const recipeRows = collection.collection_recipes.map((cr) => cr.recipes).filter((r) => r !== null);
  const primaryPaths = recipeRows
    .map((r) => r.recipe_images.find((i) => i.is_primary)?.storage_path ?? r.recipe_images[0]?.storage_path)
    .filter((p): p is string => !!p);
  const urlMap = await signRecipeImageUrls(primaryPaths);

  const recipes: (RecipeCardData & { collectionRecipeId: string })[] = recipeRows.map((r) => {
    const path = r.recipe_images.find((i) => i.is_primary)?.storage_path ?? r.recipe_images[0]?.storage_path;
    return {
      id: r.id,
      collectionRecipeId: r.id,
      title: r.title,
      visibility: r.visibility,
      difficulty: r.difficulty,
      cuisine: r.cuisine,
      prepTimeMinutes: r.prep_time_minutes,
      cookTimeMinutes: r.cook_time_minutes,
      servings: r.servings,
      authorName: r.author_name,
      imageUrl: path ? (urlMap[path] ?? null) : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{collection.name}</h1>
          {collection.description ? <p className="text-sm text-muted-foreground">{collection.description}</p> : null}
        </div>
        {canEdit ? (
          <div className="flex gap-2">
          <EditCollectionDialog
            collectionId={id}
            initialName={collection.name}
            initialDescription={collection.description}
          />
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              <Trash2 className="h-4 w-4" />
              Delete collection
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {collection.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the collection. Recipes in it are not deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteCollectionAction.bind(null, id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        ) : null}
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No recipes in this collection yet"
          description="Add recipes to this collection from their detail page."
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {recipes.map((r) => (
            <div key={r.id} className="group relative">
              <RecipeCard recipe={r} />
              {canEdit ? (
                <form
                  action={removeRecipeFromCollectionAction.bind(null, id, r.id)}
                  className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Button type="submit" size="icon-sm" variant="secondary" title="Remove from collection">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
