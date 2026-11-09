"use client";

import { useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { deleteProgressPhotoAction } from "@/app/(app)/health/measurements/actions";
import { Button } from "@/components/ui/button";

export type ProgressPhoto = {
  id: string;
  dateLabel: string;
  signedUrl: string | null;
};

export function ProgressPhotoGrid({ photos }: { photos: ProgressPhoto[] }) {
  const [isPending, startTransition] = useTransition();

  if (photos.length === 0) {
    return <p className="text-xs text-muted-foreground">No progress photos yet — private to you, never shared.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {photos.map((p) => (
        <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
          {p.signedUrl ? (
            <Image src={p.signedUrl} alt={`Progress photo, ${p.dateLabel}`} fill className="object-cover" unoptimized />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/80 px-2 py-1 backdrop-blur-sm">
            <span className="text-[11px] text-muted-foreground">{p.dateLabel}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={isPending}
              onClick={() => startTransition(() => deleteProgressPhotoAction(p.id))}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
