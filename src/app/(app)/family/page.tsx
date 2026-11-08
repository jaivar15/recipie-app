import { Users } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/layout/empty-state";
import { CreateHouseholdTrigger } from "@/components/household/household-switcher";
import { InviteMemberDialog } from "@/components/household/invite-member-dialog";
import { MemberRow } from "@/components/household/member-row";
import { PendingInvitationRow } from "@/components/household/pending-invitation-row";
import { LeaveHouseholdButton } from "@/components/household/leave-household-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default async function FamilyPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  if (!ctx.activeHousehold) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Family</h1>
        </div>
        <EmptyState
          icon={Users}
          title="No household yet"
          description="Create a household to invite family members and start sharing recipes."
          action={
            <CreateHouseholdTrigger>
              <Button>Create household</Button>
            </CreateHouseholdTrigger>
          }
        />
      </div>
    );
  }

  const householdId = ctx.activeHousehold.householdId;
  const isOwner = ctx.activeHousehold.role === "owner";
  const supabase = await createClient();

  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("household_members")
      .select("user_id, role, profiles!household_members_user_id_fkey(display_name, email, avatar_url)")
      .eq("household_id", householdId)
      .order("joined_at", { ascending: true }),
    isOwner
      ? supabase
          .from("household_invitations")
          .select("id, email, role, expires_at")
          .eq("household_id", householdId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; email: string; role: string; expires_at: string }[] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Family</h1>
          <p className="text-sm text-muted-foreground">
            Members, invitations and roles for {ctx.activeHousehold.householdName}.
          </p>
        </div>
        {isOwner ? <InviteMemberDialog householdId={householdId} /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{members?.length ?? 0} people in this household.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {members?.map((m) => (
            <MemberRow
              key={m.user_id}
              householdId={householdId}
              userId={m.user_id}
              displayName={m.profiles?.display_name ?? "Unknown"}
              email={m.profiles?.email ?? ""}
              avatarUrl={m.profiles?.avatar_url ?? null}
              role={m.role}
              isSelf={m.user_id === ctx.userId}
              canManage={isOwner}
            />
          ))}
        </CardContent>
      </Card>

      {isOwner && invitations && invitations.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Links that haven&apos;t been accepted yet.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {invitations.map((inv) => (
              <PendingInvitationRow
                key={inv.id}
                invitationId={inv.id}
                email={inv.email}
                role={inv.role}
                expiresAt={inv.expires_at}
              />
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
        <div>
          <p className="text-sm font-medium">
            {isOwner ? "Leaving requires transferring ownership first" : "Not part of this household anymore?"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOwner
              ? "Transfer ownership to another member from the menu above, then you can leave."
              : "You can leave at any time. Your personal recipes stay with you."}
          </p>
        </div>
        {!isOwner ? (
          <LeaveHouseholdButton householdId={householdId} householdName={ctx.activeHousehold.householdName} />
        ) : null}
      </div>
    </div>
  );
}
