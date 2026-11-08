import { Tags } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Meal type, cuisine, dietary labels, custom tags and family collections.
        </p>
      </div>
      <EmptyState
        icon={Tags}
        title="Organisation ships in Phase 4"
        description="Multi-category tagging, custom family collections like 'Mum's Recipes', and saved filters."
      />
    </div>
  );
}
