"use client";

import { useState, useTransition } from "react";
import { savePersonalNoteAction } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PersonalNoteCard({ recipeId, initialNote }: { recipeId: string; initialNote: string }) {
  const [note, setNote] = useState(initialNote);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My private notes</CardTitle>
        <CardDescription>Only visible to you — never shared with your household.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setSaved(false);
          }}
          placeholder="e.g. Use half the chilli next time"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || saved}
          onClick={() =>
            startTransition(async () => {
              await savePersonalNoteAction(recipeId, note);
              setSaved(true);
            })
          }
        >
          {isPending ? "Saving…" : saved ? "Saved" : "Save note"}
        </Button>
      </CardContent>
    </Card>
  );
}
