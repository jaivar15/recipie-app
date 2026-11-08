"use client";

import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { duplicateRecipeAction } from "@/app/(app)/recipes/actions";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RecipeVisibility = Database["public"]["Enums"]["recipe_visibility"];

export function DuplicateRecipeDialog({
  recipeId,
  households,
}: {
  recipeId: string;
  households: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<RecipeVisibility>("personal");
  const [householdId, setHouseholdId] = useState<string | undefined>(households[0]?.id);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      try {
        await duplicateRecipeAction(recipeId, visibility, visibility === "household" ? (householdId ?? null) : null);
      } catch (err) {
        if (err && typeof err === "object" && "digest" in err && typeof err.digest === "string" && err.digest.startsWith("NEXT_REDIRECT")) {
          throw err;
        }
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Copy className="h-4 w-4" />
        Duplicate
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicate recipe</DialogTitle>
          <DialogDescription>Create a copy you can edit independently.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-2">
            <Label>Copy to</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as RecipeVisibility)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => (value === "household" ? "A household" : "My personal recipes")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">My personal recipes</SelectItem>
                {households.length > 0 ? <SelectItem value="household">A household</SelectItem> : null}
              </SelectContent>
            </Select>
          </div>
          {visibility === "household" ? (
            <div className="space-y-2">
              <Label>Household</Label>
              <Select value={householdId} onValueChange={(v) => setHouseholdId(v ?? undefined)}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => households.find((h) => h.id === value)?.name ?? ""}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {households.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button onClick={handleDuplicate} disabled={isPending}>
            {isPending ? "Duplicating…" : "Duplicate recipe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
