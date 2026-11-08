"use client";

import { useTransition } from "react";
import Image from "next/image";
import { Star, Trash2 } from "lucide-react";
import { deleteRecipeImageAction, setPrimaryRecipeImageAction } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RecipeImageItem = {
  id: string;
  url: string;
  storagePath: string;
  isPrimary: boolean;
  caption: string | null;
};

export function RecipeImageGallery({
  recipeId,
  images,
  canEdit,
}: {
  recipeId: string;
  images: RecipeImageItem[];
  canEdit: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  if (images.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img) => (
        <div key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border bg-muted">
          <Image src={img.url} alt={img.caption ?? ""} fill className="object-cover" unoptimized />
          {canEdit ? (
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                disabled={isPending || img.isPrimary}
                onClick={() => startTransition(() => setPrimaryRecipeImageAction(recipeId, img.id))}
                title="Set as main photo"
              >
                <Star className={cn("h-3.5 w-3.5", img.isPrimary && "fill-current")} />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                disabled={isPending}
                onClick={() => startTransition(() => deleteRecipeImageAction(img.id, img.storagePath))}
                title="Remove photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
          {img.isPrimary ? (
            <div className="absolute top-2 left-2 rounded-full bg-background/90 p-1">
              <Star className="h-3 w-3 fill-primary text-primary" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
