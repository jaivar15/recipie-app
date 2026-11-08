"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleFavouriteAction } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavouriteButton({ recipeId, isFavourite }: { recipeId: string; isFavourite: boolean }) {
  const [, startTransition] = useTransition();
  const [optimisticFavourite, setOptimisticFavourite] = useOptimistic(isFavourite);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() =>
        startTransition(async () => {
          setOptimisticFavourite(!optimisticFavourite);
          await toggleFavouriteAction(recipeId, optimisticFavourite);
        })
      }
      title={optimisticFavourite ? "Remove from favourites" : "Add to favourites"}
    >
      <Heart className={cn("h-4 w-4", optimisticFavourite && "fill-destructive text-destructive")} />
    </Button>
  );
}
