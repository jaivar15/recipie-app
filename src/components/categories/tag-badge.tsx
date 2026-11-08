"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteTagAction } from "@/app/(app)/categories/actions";
import { Badge } from "@/components/ui/badge";

export function TagBadge({ id, name, canDelete }: { id: string; name: string; canDelete: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Badge variant="secondary" className="gap-1 py-1 pr-1">
      {name}
      {canDelete ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteTagAction(id))}
          className="rounded-full p-0.5 hover:bg-muted-foreground/20"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </Badge>
  );
}
