import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

export const ACTIVE_HOUSEHOLD_COOKIE = "active_household_id";

export type HouseholdRole = Database["public"]["Enums"]["household_role"];

export type HouseholdMembership = {
  householdId: string;
  householdName: string;
  imageUrl: string | null;
  role: HouseholdRole;
};

export type HouseholdContext = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  households: HouseholdMembership[];
  activeHousehold: HouseholdMembership | null;
};

/**
 * Loads the signed-in user's profile and household memberships, and
 * resolves which household is "active" for this request (cookie override,
 * falling back to the profile's default, falling back to the first
 * membership). Returns null when there is no authenticated user.
 */
export async function getHouseholdContext(): Promise<HouseholdContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, email, default_household_id")
    .eq("id", user.id)
    .single();

  const { data: memberships } = await supabase
    .from("household_members")
    .select("role, households!inner(id, name, image_url, deleted_at)")
    .eq("user_id", user.id)
    .is("households.deleted_at", null);

  const households: HouseholdMembership[] = (memberships ?? [])
    .filter((m) => m.households !== null)
    .map((m) => ({
      householdId: m.households!.id,
      householdName: m.households!.name,
      imageUrl: m.households!.image_url,
      role: m.role,
    }));

  const cookieStore = await cookies();
  const cookieHouseholdId = cookieStore.get(ACTIVE_HOUSEHOLD_COOKIE)?.value;

  const activeHousehold =
    households.find((h) => h.householdId === cookieHouseholdId) ??
    households.find((h) => h.householdId === profile?.default_household_id) ??
    households[0] ??
    null;

  return {
    userId: user.id,
    email: profile?.email ?? user.email ?? "",
    displayName: profile?.display_name ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    households,
    activeHousehold,
  };
}

/** Throws-free guard for use in Server Components / actions. */
export async function requireHouseholdContext(): Promise<HouseholdContext> {
  const ctx = await getHouseholdContext();
  if (!ctx) throw new Error("Not authenticated");
  return ctx;
}
