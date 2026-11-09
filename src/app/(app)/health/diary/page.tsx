import { NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function FoodDiaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Food Diary</h1>
        <p className="text-sm text-muted-foreground">Log what you actually ate, with nutrition calculated automatically.</p>
      </div>
      <EmptyState
        icon={NotebookPen}
        title="Coming next"
        description="Food diary logging — recipes, ingredients and custom foods — ships in the next build pass."
      />
    </div>
  );
}
