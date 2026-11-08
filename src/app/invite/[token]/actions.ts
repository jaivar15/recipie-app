"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_HOUSEHOLD_COOKIE } from "@/lib/households/context";

export async function acceptInvitationAction(token: string) {
  const supabase = await createClient();
  const { data: householdId, error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) throw new Error(error.message);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_HOUSEHOLD_COOKIE, householdId as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect("/");
}

export async function declineInvitationAction(token: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invitation", { p_token: token });
  if (error) throw new Error(error.message);
  redirect("/");
}
