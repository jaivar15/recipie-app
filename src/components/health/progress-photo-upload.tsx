"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addProgressPhotoAction } from "@/app/(app)/health/measurements/actions";
import { Button } from "@/components/ui/button";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ProgressPhotoUpload({ userId }: { userId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();

      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${userId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

        const { error: uploadError } = await supabase.storage
          .from("progress-photos")
          .upload(path, file, { contentType: file.type });

        if (uploadError) {
          setError(uploadError.message);
          continue;
        }

        await addProgressPhotoAction({ entryDate: today(), storagePath: path, caption: "" });
      }
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
      <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
        {uploading ? "Uploading…" : "Add photo"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
