import { BookOpen } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";

export default function RecipeLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recipe Library</h1>
        <p className="text-sm text-muted-foreground">
          All household recipes, your private recipes, favourites and collections.
        </p>
      </div>
      <EmptyState
        icon={BookOpen}
        title="No recipes yet"
        description="The recipe editor, image uploads, and personal/household visibility ship in Phase 2. Add your first recipe to get started."
        action={
          <Button render={<Link href="/recipes/new" />}>Add your first recipe</Button>
        }
      />
    </div>
  );
}
