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
  ingredient_nutrition: {
    calories_kcal: number | null;
    protein_g: number | null;
    carbohydrate_g: number | null;
    fat_g: number | null;
    fibre_g: number | null;
  } | null;
};

const FIELDS = `
  id, name, visibility, food_category, state, brand, allergens,
  ingredient_nutrition(calories_kcal, protein_g, carbohydrate_g, fat_g, fibre_g)
`;

export default async function IngredientsPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const [householdResult, personalResult] = await Promise.all([
    ctx.activeHousehold
      ? supabase
          .from("ingredients")
          .select(FIELDS)
          .eq("household_id", ctx.activeHousehold.householdId)
          .order("name")
      : Promise.resolve({ data: [] as IngredientRow[] }),
    supabase.from("ingredients").select(FIELDS).eq("visibility", "personal").order("name"),
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
        <div className="flex gap-2">
          <Button render={<Link href="/ingredients/import" />} variant="outline">
            Import
          </Button>
          <Button render={<Link href="/ingredients/new" />}>Add Ingredient</Button>
        </div>
      </div>

      <Tabs defaultValue={ctx.activeHousehold ? "household" : "personal"}>
        <TabsList>
          {ctx.activeHousehold ? <TabsTrigger value="household">Household</TabsTrigger> : null}
          <TabsTrigger value="personal">My private ingredients</TabsTrigger>
        </TabsList>
        {ctx.activeHousehold ? (
          <TabsContent value="household">
            <IngredientSections ingredients={(householdResult.data ?? []) as IngredientRow[]} />
          </TabsContent>
        ) : null}
        <TabsContent value="personal">
          <IngredientSections ingredients={(personalResult.data ?? []) as IngredientRow[]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IngredientSections({ ingredients }: { ingredients: IngredientRow[] }) {
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

  const sections = new Map<string, IngredientRow[]>();
  for (const ing of ingredients) {
    const category = ing.food_category || "Other";
    const list = sections.get(category) ?? [];
    list.push(ing);
    sections.set(category, list);
  }
  const sortedCategories = [...sections.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      {sortedCategories.map((category) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {category}
            </h2>
            <span className="text-xs text-muted-foreground">
              ({sections.get(category)!.length})
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.get(category)!.map((ing) => (
              <IngredientCard key={ing.id} ingredient={ing} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function round(n: number | null): string | null {
  return n != null ? String(Math.round(n * 10) / 10) : null;
}

function IngredientCard({ ingredient: ing }: { ingredient: IngredientRow }) {
  const n = ing.ingredient_nutrition;
  const macros = n
    ? [
        { label: "Cal", value: round(n.calories_kcal), unit: "", color: "text-chart-1" },
        { label: "P", value: round(n.protein_g), unit: "g", color: "text-chart-3" },
        { label: "C", value: round(n.carbohydrate_g), unit: "g", color: "text-chart-2" },
        { label: "F", value: round(n.fat_g), unit: "g", color: "text-chart-5" },
        { label: "Fb", value: round(n.fibre_g), unit: "g", color: "text-chart-4" },
      ].filter((m) => m.value != null)
    : [];

  return (
    <Link
      href={`/ingredients/${ing.id}/edit`}
      className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {ing.name}
          {ing.brand ? <span className="text-muted-foreground"> · {ing.brand}</span> : null}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
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
      {macros.length > 0 ? (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 border-t pt-2 text-xs">
          {macros.map((m) => (
            <span key={m.label} className="tabular-nums">
              <span className={`font-semibold ${m.color}`}>{m.value}</span>
              <span className="text-muted-foreground">
                {m.unit ? `${m.unit} ${m.label}` : ` ${m.label.toLowerCase()}`}
              </span>
            </span>
          ))}
          <span className="text-muted-foreground">/100g</span>
        </div>
      ) : (
        <p className="border-t pt-2 text-xs text-muted-foreground">No nutrition data yet</p>
      )}
    </Link>
  );
}
