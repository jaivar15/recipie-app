import { Carrot } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function IngredientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ingredients</h1>
        <p className="text-sm text-muted-foreground">
          Shared ingredient database, custom ingredients, nutrition and conversions.
        </p>
      </div>
      <EmptyState
        icon={Carrot}
        title="The ingredient database ships in Phase 3"
        description="Nutrition per 100g, Australian food composition data, ingredient-specific unit conversions, and allergen tracking."
      />
    </div>
  );
}
