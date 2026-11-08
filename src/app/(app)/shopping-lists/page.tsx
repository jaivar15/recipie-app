import { ShoppingCart } from "lucide-react";
import { EmptyState } from "@/components/layout/empty-state";

export default function ShoppingListsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Shopping Lists</h1>
        <p className="text-sm text-muted-foreground">Shared grocery lists generated from your meal plan.</p>
      </div>
      <EmptyState
        icon={ShoppingCart}
        title="Shared shopping lists ship in Phase 5"
        description="Auto-combined ingredient quantities, item assignment, purchase tracking, and safe concurrent editing."
      />
    </div>
  );
}
