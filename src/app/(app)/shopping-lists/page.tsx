import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { CreateShoppingListDialog } from "@/components/shopping-lists/create-shopping-list-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ShoppingListsPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  if (!ctx.activeHousehold) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopping Lists</h1>
        </div>
        <EmptyState icon={ShoppingCart} title="No household yet" description="Create a household to start a shared shopping list." />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: lists } = await supabase
    .from("shopping_lists")
    .select("id, name, created_at, shopping_list_items(id, is_checked)")
    .eq("household_id", ctx.activeHousehold.householdId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Shopping Lists</h1>
          <p className="text-sm text-muted-foreground">Shared lists everyone in the household can check off.</p>
        </div>
        <CreateShoppingListDialog />
      </div>

      {lists && lists.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => {
            const total = list.shopping_list_items.length;
            const checked = list.shopping_list_items.filter((i) => i.is_checked).length;
            return (
              <Link key={list.id} href={`/shopping-lists/${list.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader>
                    <CardTitle className="text-base">{list.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {total === 0 ? "No items yet" : `${checked} of ${total} checked off`}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={ShoppingCart}
          title="No shopping lists yet"
          description="Start a list by hand, or generate one from the meal planner."
        />
      )}
    </div>
  );
}
