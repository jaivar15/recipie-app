import Link from "next/link";
import { FolderHeart, Tags } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateTagForm } from "@/components/categories/create-tag-form";
import { TagBadge } from "@/components/categories/tag-badge";
import { CreateCollectionDialog } from "@/components/categories/create-collection-dialog";

export default async function CategoriesPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const isEditor = ctx.activeHousehold?.role === "owner" || ctx.activeHousehold?.role === "editor";

  const [householdTagsResult, personalTagsResult, householdCollectionsResult, personalCollectionsResult] =
    await Promise.all([
      ctx.activeHousehold
        ? supabase.from("tags").select("id, name").eq("household_id", ctx.activeHousehold.householdId).order("name")
        : Promise.resolve({ data: [] }),
      supabase.from("tags").select("id, name").eq("visibility", "personal").order("name"),
      ctx.activeHousehold
        ? supabase
            .from("collections")
            .select("id, name, description, collection_recipes(recipe_id)")
            .eq("household_id", ctx.activeHousehold.householdId)
            .order("name")
        : Promise.resolve({ data: [] }),
      supabase
        .from("collections")
        .select("id, name, description, collection_recipes(recipe_id)")
        .eq("visibility", "personal")
        .order("name"),
    ]);

  const editableHouseholds = ctx.households
    .filter((h) => h.role === "owner" || h.role === "editor")
    .map((h) => ({ id: h.householdId, name: h.householdName }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Tags and family collections for organising recipes.</p>
      </div>

      <Tabs defaultValue="tags">
        <TabsList>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="tags" className="space-y-4">
          {ctx.activeHousehold ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">{ctx.activeHousehold.householdName}</CardTitle>
                {isEditor ? (
                  <CreateTagForm visibility="household" householdId={ctx.activeHousehold.householdId} />
                ) : null}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(householdTagsResult.data ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No household tags yet.</p>
                ) : (
                  (householdTagsResult.data ?? []).map((t) => (
                    <TagBadge key={t.id} id={t.id} name={t.name} canDelete={isEditor} />
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">My private tags</CardTitle>
              <CreateTagForm visibility="personal" householdId={null} />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(personalTagsResult.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No private tags yet.</p>
              ) : (
                (personalTagsResult.data ?? []).map((t) => <TagBadge key={t.id} id={t.id} name={t.name} canDelete />)
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex justify-end">
            <CreateCollectionDialog households={editableHouseholds} />
          </div>
          <CollectionGrid
            title={ctx.activeHousehold?.householdName}
            collections={householdCollectionsResult.data ?? []}
          />
          <CollectionGrid title="My private collections" collections={personalCollectionsResult.data ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CollectionGrid({
  title,
  collections,
}: {
  title?: string;
  collections: { id: string; name: string; description: string | null; collection_recipes: { recipe_id: string }[] }[];
}) {
  if (collections.length === 0 && !title) return null;

  return (
    <div className="space-y-2">
      {title ? <h2 className="text-sm font-medium text-muted-foreground">{title}</h2> : null}
      {collections.length === 0 ? (
        <EmptyState
          icon={FolderHeart}
          title="No collections yet"
          description="Create a collection to group recipes together."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {collections.map((c) => (
            <Link key={c.id} href={`/collections/${c.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2 pt-6">
                  <div className="flex items-center gap-2">
                    <Tags className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">{c.name}</h3>
                  </div>
                  {c.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p> : null}
                  <Badge variant="outline" className="text-xs">
                    {c.collection_recipes.length} recipe{c.collection_recipes.length === 1 ? "" : "s"}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
