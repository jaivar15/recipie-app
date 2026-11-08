import Link from "next/link";
import { BookOpen } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { signRecipeImageUrls } from "@/lib/supabase/storage";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard, type RecipeCardData } from "@/components/recipes/recipe-card";
import { RestoreRecipeButton } from "@/components/recipes/restore-recipe-button";

const RECIPE_CARD_FIELDS =
  "id, title, visibility, difficulty, cuisine, prep_time_minutes, cook_time_minutes, servings, author_name, deleted_at, recipe_images(storage_path, is_primary)";

type RawRecipeRow = {
  id: string;
  title: string;
  visibility: "personal" | "household";
  difficulty: string | null;
  cuisine: string | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number;
  author_name: string | null;
  deleted_at: string | null;
  recipe_images: { storage_path: string; is_primary: boolean }[];
};

async function toCardData(rows: RawRecipeRow[]): Promise<RecipeCardData[]> {
  const primaryPaths = rows
    .map((r) => r.recipe_images.find((i) => i.is_primary)?.storage_path ?? r.recipe_images[0]?.storage_path)
    .filter((p): p is string => !!p);
  const urlMap = await signRecipeImageUrls(primaryPaths);

  return rows.map((r) => {
    const path = r.recipe_images.find((i) => i.is_primary)?.storage_path ?? r.recipe_images[0]?.storage_path;
    return {
      id: r.id,
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
}

export default async function RecipeLibraryPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const [householdResult, personalResult, favouritesResult, deletedResult] = await Promise.all([
    ctx.activeHousehold
      ? supabase
          .from("recipes")
          .select(RECIPE_CARD_FIELDS)
          .eq("household_id", ctx.activeHousehold.householdId)
          .eq("visibility", "household")
          // RLS also lets the owner see their soft-deleted recipes (for the
          // "recently deleted" list below), so this must be filtered
          // explicitly rather than relying on RLS alone.
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as RawRecipeRow[] }),
    supabase
      .from("recipes")
      .select(RECIPE_CARD_FIELDS)
      .eq("visibility", "personal")
      .eq("created_by", ctx.userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("recipe_favourites")
      .select(`recipes!inner(${RECIPE_CARD_FIELDS})`)
      .eq("user_id", ctx.userId),
    // RLS (recipes_select_deleted_by_owner) already restricts this to
    // household recipes the caller owns, or their own deleted personal
    // recipes — nothing extra to filter here.
    supabase
      .from("recipes")
      .select("id, title, deleted_at")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
  ]);

  const householdRecipes = await toCardData((householdResult.data ?? []) as unknown as RawRecipeRow[]);
  const personalRecipes = await toCardData((personalResult.data ?? []) as unknown as RawRecipeRow[]);
  const favouriteRows = ((favouritesResult.data ?? []) as unknown as { recipes: RawRecipeRow }[])
    .map((f) => f.recipes)
    .filter((r) => !r.deleted_at);
  const favouriteRecipes = await toCardData(favouriteRows);
  const deletedRecipes = deletedResult.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recipe Library</h1>
          <p className="text-sm text-muted-foreground">
            All household recipes, your private recipes, and favourites.
          </p>
        </div>
        <Button render={<Link href="/recipes/new" />}>Add Recipe</Button>
      </div>

      <Tabs defaultValue={ctx.activeHousehold ? "household" : "personal"}>
        <TabsList>
          {ctx.activeHousehold ? <TabsTrigger value="household">Household</TabsTrigger> : null}
          <TabsTrigger value="personal">My private recipes</TabsTrigger>
          <TabsTrigger value="favourites">Favourites</TabsTrigger>
        </TabsList>

        {ctx.activeHousehold ? (
          <TabsContent value="household">
            <RecipeGrid recipes={householdRecipes} emptyLabel="No household recipes yet." />
          </TabsContent>
        ) : null}
        <TabsContent value="personal">
          <RecipeGrid recipes={personalRecipes} emptyLabel="No private recipes yet." />
        </TabsContent>
        <TabsContent value="favourites">
          <RecipeGrid recipes={favouriteRecipes} emptyLabel="Favourite a recipe to see it here." />
        </TabsContent>
      </Tabs>

      {deletedRecipes.length > 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed p-4">
          <p className="text-sm font-medium">Recently deleted</p>
          <ul className="space-y-2">
            {deletedRecipes.map((r) => (
              <li key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{r.title}</span>
                <RestoreRecipeButton recipeId={r.id} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function RecipeGrid({ recipes, emptyLabel }: { recipes: RecipeCardData[]; emptyLabel: string }) {
  if (recipes.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="Nothing here yet"
        description={emptyLabel}
        action={
          <Button render={<Link href="/recipes/new" />} variant="outline">
            Add your first recipe
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {recipes.map((r) => (
        <RecipeCard key={r.id} recipe={r} />
      ))}
    </div>
  );
}
