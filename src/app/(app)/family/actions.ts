"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database";

type HouseholdRole = Database["public"]["Enums"]["household_role"];

export type FamilyActionState = { error: string | null; inviteLink?: string };

async function siteUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return `${proto}://${host}`;
}

export async function inviteMemberAction(
  _prev: FamilyActionState,
  formData: FormData
): Promise<FamilyActionState> {
  const householdId = String(formData.get("householdId") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const role = formData.get("role") as HouseholdRole;

  if (!householdId || !email || !role) {
    return { error: "Email and role are required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_invitation", { p_household_id: householdId, p_email: email, p_role: role })
    .single();

  if (error) return { error: error.message };

  const inviteLink = `${await siteUrl()}/invite/${data!.raw_token}`;
  revalidatePath("/family");
  return { error: null, inviteLink };
}

export async function revokeInvitationAction(invitationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: invitationId });
  if (error) throw new Error(error.message);
  revalidatePath("/family");
}

export async function changeMemberRoleAction(householdId: string, memberUserId: string, newRole: HouseholdRole) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_member_role", {
    p_household_id: householdId,
    p_member_user_id: memberUserId,
    p_new_role: newRole,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/family");
}

export async function removeMemberAction(householdId: string, memberUserId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_household_member", {
    p_household_id: householdId,
    p_member_user_id: memberUserId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/family");
}

export async function transferOwnershipAction(householdId: string, newOwnerUserId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_household_ownership", {
    p_household_id: householdId,
    p_new_owner_user_id: newOwnerUserId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/family");
}

export async function leaveHouseholdAction(householdId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_household", { p_household_id: householdId });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}
