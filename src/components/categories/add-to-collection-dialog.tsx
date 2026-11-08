"use client";

import { useState, useTransition } from "react";
import { FolderPlus } from "lucide-react";
import { addRecipeToCollectionAction, removeRecipeFromCollectionAction } from "@/app/(app)/categories/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AddToCollectionDialog({
  recipeId,
  collections,
}: {
  recipeId: string;
  collections: { id: string; name: string; inCollection: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FolderPlus className="h-4 w-4" />
        Collections
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to collection</DialogTitle>
          <DialogDescription>Choose which collections include this recipe.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {collections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collections yet — create one from the Categories page.
            </p>
          ) : (
            collections.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={c.inCollection}
                  disabled={isPending}
                  onCheckedChange={(checked) =>
                    startTransition(() =>
                      checked
                        ? addRecipeToCollectionAction(c.id, recipeId)
                        : removeRecipeFromCollectionAction(c.id, recipeId)
                    )
                  }
                />
                {c.name}
              </label>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
