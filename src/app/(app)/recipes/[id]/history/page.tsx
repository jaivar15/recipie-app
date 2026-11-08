import Link from "next/link";
import { notFound } from "next/navigation";
import { History as HistoryIcon, RotateCcw } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { restoreRecipeVersionAction } from "../../actions";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

type VersionSnapshot = {
  recipe: { title: string; servings: number };
  ingredients: { ingredient_name: string; quantity: number | null; unit: string | null }[];
  steps: { instruction: string }[];
};

export default async function RecipeHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: recipe } = await supabase.from("recipes").select("id, title").eq("id", id).maybeSingle();
  if (!recipe) notFound();

  const { data: versions } = await supabase
    .from("recipe_versions")
    .select("id, version_number, snapshot, created_at, profiles(display_name)")
    .eq("recipe_id", id)
    .order("version_number", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href={`/recipes/${id}`} className="hover:underline">
            {recipe.title}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Version History</h1>
        <p className="text-sm text-muted-foreground">
          A snapshot is saved every time this recipe is edited. Restoring creates a new version from the current
          state too, so nothing is ever lost.
        </p>
      </div>

      {!versions || versions.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No history yet"
          description="Version history starts recording after the first edit to this recipe."
        />
      ) : (
        <div className="space-y-3">
          {versions.map((v) => {
            const snapshot = v.snapshot as unknown as VersionSnapshot;
            return (
              <Card key={v.id}>
                <CardHeader className="flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      Version {v.version_number} — {snapshot.recipe.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("en-AU")}
                      {v.profiles?.display_name ? ` · ${v.profiles.display_name}` : ""}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Restore
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore version {v.version_number}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This replaces the current recipe with this older version. The current state is saved as a
                          new version first, so you can undo this too.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={restoreRecipeVersionAction.bind(null, id, v.id)}>
                          Restore
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">{snapshot.recipe.servings} servings</Badge>
                  <Badge variant="secondary">{snapshot.ingredients.length} ingredients</Badge>
                  <Badge variant="secondary">{snapshot.steps.length} steps</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
