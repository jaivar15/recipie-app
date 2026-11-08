import { notFound } from "next/navigation";
import { Archive, Trash2, ShoppingCart } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/layout/empty-state";
import { AddShoppingItemForm } from "@/components/shopping-lists/add-shopping-item-form";
import { ShoppingListItemRow } from "@/components/shopping-lists/shopping-list-item-row";
import { archiveShoppingListAction, clearCheckedItemsAction } from "../actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default async function ShoppingListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: list } = await supabase
    .from("shopping_lists")
    .select(
      "id, name, household_id, shopping_list_items(id, ingredient_name, quantity, unit, is_checked, sort_order)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!list) notFound();

  const items = [...list.shopping_list_items].sort((a, b) => a.sort_order - b.sort_order);
  const unchecked = items.filter((i) => !i.is_checked);
  const checked = items.filter((i) => i.is_checked);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{list.name}</h1>
          <p className="text-sm text-muted-foreground">
            {unchecked.length} item{unchecked.length === 1 ? "" : "s"} left
          </p>
        </div>
        <div className="flex gap-2">
          {checked.length > 0 ? (
            <form action={clearCheckedItemsAction.bind(null, list.id)}>
              <Button type="submit" variant="outline">
                <Trash2 className="h-4 w-4" />
                Clear checked
              </Button>
            </form>
          ) : null}
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              <Archive className="h-4 w-4" />
              Archive
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archive {list.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This hides the list from the active lists view. Items are kept.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={archiveShoppingListAction.bind(null, list.id)}>Archive</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <AddShoppingItemForm listId={list.id} />

      {items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="This list is empty" description="Add items above to get started." />
      ) : (
        <div className="space-y-4">
          {unchecked.length > 0 ? (
            <div className="space-y-1.5">
              {unchecked.map((item) => (
                <ShoppingListItemRow
                  key={item.id}
                  id={item.id}
                  listId={list.id}
                  name={item.ingredient_name}
                  quantity={item.quantity}
                  unit={item.unit}
                  isChecked={item.is_checked}
                />
              ))}
            </div>
          ) : null}
          {checked.length > 0 ? (
            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Checked off</p>
              {checked.map((item) => (
                <ShoppingListItemRow
                  key={item.id}
                  id={item.id}
                  listId={list.id}
                  name={item.ingredient_name}
                  quantity={item.quantity}
                  unit={item.unit}
                  isChecked={item.is_checked}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
