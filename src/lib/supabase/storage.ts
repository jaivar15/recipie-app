import "server-only";
import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export async function signRecipeImageUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("recipe-images")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export async function signRecipeImageUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const map = await signRecipeImageUrls([path]);
  return map[path] ?? null;
}
