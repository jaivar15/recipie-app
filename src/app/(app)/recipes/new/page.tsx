import { PlusCircle } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function AddRecipePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Recipe</h1>
        <p className="text-sm text-muted-foreground">Create, import, or duplicate a recipe.</p>
      </div>
      <EmptyState
        icon={PlusCircle}
        title="The recipe editor is coming in Phase 2"
        description="Basic info, prep details, unlimited ingredients with Australian units, step-by-step instructions, and photo uploads."
      />
    </div>
  );
}
