"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteRecipeAction } from "@/app/(app)/recipes/actions";
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

export function DeleteRecipeButton({ recipeId, title }: { recipeId: string; title: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" disabled={isPending} />}>
        <Trash2 className="h-4 w-4" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {title}?</AlertDialogTitle>
          <AlertDialogDescription>
            This recipe will be hidden from the library immediately. It can be restored later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(() => deleteRecipeAction(recipeId))}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
