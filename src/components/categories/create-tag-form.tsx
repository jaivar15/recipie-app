"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createTagAction } from "@/app/(app)/categories/actions";
import type { Database } from "@/lib/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type RecipeVisibility = Database["public"]["Enums"]["recipe_visibility"];

export function CreateTagForm({ visibility, householdId }: { visibility: RecipeVisibility; householdId: string | null }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        startTransition(async () => {
          await createTagAction(name, visibility, householdId);
          setName("");
        });
      }}
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New tag name"
        className="h-8 w-40"
      />
      <Button type="submit" size="sm" variant="outline" disabled={isPending || !name.trim()}>
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </form>
  );
}
