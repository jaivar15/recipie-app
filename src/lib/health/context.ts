import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Loads the signed-in user's health profile, goals and preferences.
 * Deliberately independent of household context — this data is never
 * scoped to or filtered by a household, only by the authenticated user.
 */
export async function getHealthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: goals }, { data: preferences }] = await Promise.all([
    supabase.from("health_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("nutrition_goals").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("health_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  return { userId: user.id, profile, goals, preferences };
}

export type HealthContext = NonNullable<Awaited<ReturnType<typeof getHealthContext>>>;
