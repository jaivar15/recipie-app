"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { registerRecipeImageAction } from "@/app/(app)/recipes/actions";
import { Button } from "@/components/ui/button";

export function ImageUpload({ recipeId, hasPrimary }: { recipeId: string; hasPrimary: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      let primarySet = hasPrimary;

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `recipes/${recipeId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

        const { error: uploadError } = await supabase.storage
          .from("recipe-images")
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          setError(uploadError.message);
          continue;
        }

        await registerRecipeImageAction(recipeId, path, !primarySet);
        primarySet = true;
      }

      startTransition(() => {});
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {uploading ? "Uploading…" : "Add photos"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
