"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { generateShoppingListFromPlanAction } from "@/app/(app)/meal-planner/actions";
import { Button } from "@/components/ui/button";

export function GenerateShoppingListButton({ mealPlanId, weekLabel }: { mealPlanId: string; weekLabel: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const listId = await generateShoppingListFromPlanAction(mealPlanId, weekLabel);
          router.push(`/shopping-lists/${listId}`);
        })
      }
    >
      <ShoppingCart className="h-4 w-4" />
      Generate shopping list
    </Button>
  );
}
