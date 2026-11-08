import Link from "next/link";
import { Carrot } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type IngredientRow = {
  id: string;
  name: string;
  visibility: "personal" | "household";
  food_category: string | null;
  state: string | null;
  brand: string | null;
  allergens: string[];
};

export default async function IngredientsPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const [householdResult, personalResult] = await Promise.all([
    ctx.activeHousehold
      ? supabase
          .from("ingredients")
          .select("id, name, visibility, food_category, state, brand, allergens")
          .eq("household_id", ctx.activeHousehold.householdId)
          .order("name")
      : Promise.resolve({ data: [] as IngredientRow[] }),
    supabase
      .from("ingredients")
      .select("id, name, visibility, food_category, state, brand, allergens")
      .eq("visibility", "personal")
      .order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ingredients</h1>
          <p className="text-sm text-muted-foreground">
            Shared household ingredients, your private ones, nutrition and conversions.
          </p>
        </div>
        <Button render={<Link href="/ingredients/new" />}>Add Ingredient</Button>
      </div>

      <Tabs defaultValue={ctx.activeHousehold ? "household" : "personal"}>
        <TabsList>
          {ctx.activeHousehold ? <TabsTrigger value="household">Household</TabsTrigger> : null}
          <TabsTrigger value="personal">My private ingredients</TabsTrigger>
        </TabsList>
        {ctx.activeHousehold ? (
          <TabsContent value="household">
            <IngredientList ingredients={(householdResult.data ?? []) as IngredientRow[]} />
          </TabsContent>
        ) : null}
        <TabsContent value="personal">
          <IngredientList ingredients={(personalResult.data ?? []) as IngredientRow[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IngredientList({ ingredients }: { ingredients: IngredientRow[] }) {
  if (ingredients.length === 0) {
    return (
      <EmptyState
        icon={Carrot}
        title="No ingredients yet"
        description="Add ingredients with nutrition data so recipes can calculate accurate totals."
        action={
          <Button render={<Link href="/ingredients/new" />} variant="outline">
            Add your first ingredient
          </Button>
        }
      />
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {ingredients.map((ing) => (
        <Link
          key={ing.id}
          href={`/ingredients/${ing.id}/edit`}
          className="flex items-center justify-between gap-3 p-3 hover:bg-muted/50"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {ing.name}
              {ing.brand ? <span className="text-muted-foreground"> · {ing.brand}</span> : null}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {ing.food_category ? (
                <Badge variant="outline" className="text-xs">
                  {ing.food_category}
                </Badge>
              ) : null}
              {ing.state ? (
                <Badge variant="outline" className="text-xs capitalize">
                  {ing.state}
                </Badge>
              ) : null}
              {ing.allergens.map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">
                  {a}
                </Badge>
              ))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
