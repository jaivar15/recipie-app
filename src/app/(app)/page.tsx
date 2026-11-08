import Link from "next/link";
import { BookOpen, CalendarDays, ShoppingCart, UserPlus, Users } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { createClient } from "@/lib/supabase/server";
import { CreateHouseholdTrigger } from "@/components/household/household-switcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ACTION_LABELS: Record<string, string> = {
  household_created: "created this household",
  member_invited: "invited a family member",
  invitation_revoked: "revoked an invitation",
  member_joined: "joined the household",
  member_role_changed: "changed a member's role",
  member_removed: "removed a member",
  member_left: "left the household",
  ownership_transferred: "transferred ownership",
  household_deleted: "deleted the household",
  household_restored: "restored the household",
};

export default async function DashboardPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  if (!ctx.activeHousehold) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-xl font-semibold">Welcome to My Family Recipe Vault</h1>
        <p className="text-sm text-muted-foreground">
          Create a household to start sharing recipes, meal plans and shopping lists with your family — or stick to
          your personal recipe library for now.
        </p>
        <CreateHouseholdTrigger>
          <Button size="lg">Create your household</Button>
        </CreateHouseholdTrigger>
      </div>
    );
  }

  const supabase = await createClient();
  const householdId = ctx.activeHousehold.householdId;

  const [{ count: memberCount }, { data: activity }] = await Promise.all([
    supabase
      .from("household_members")
      .select("*", { count: "exact", head: true })
      .eq("household_id", householdId),
    supabase
      .from("household_activity_logs")
      .select("id, action, created_at, actor_id, profiles(display_name, avatar_url)")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{ctx.activeHousehold.householdName}</h1>
        <p className="text-sm text-muted-foreground">Welcome back, {ctx.displayName.split(" ")[0]}.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Household recipes" value="0" icon={BookOpen} />
        <StatCard title="Family members" value={String(memberCount ?? 1)} icon={Users} />
        <StatCard title="This week's meals" value="0" icon={CalendarDays} />
        <StatCard title="Active shopping lists" value="0" icon={ShoppingCart} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent household activity</CardTitle>
            <CardDescription>What your family has been up to.</CardDescription>
          </CardHeader>
          <CardContent>
            {activity && activity.length > 0 ? (
              <ul className="space-y-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 text-sm">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={entry.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {(entry.profiles?.display_name ?? "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      <span className="font-medium">{entry.profiles?.display_name ?? "Someone"}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </span>
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No activity yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button render={<Link href="/recipes/new" />} variant="outline" className="justify-start">
              <BookOpen className="h-4 w-4" />
              Add Recipe
            </Button>
            <Button render={<Link href="/meal-planner" />} variant="outline" className="justify-start">
              <CalendarDays className="h-4 w-4" />
              Plan Meal
            </Button>
            <Button render={<Link href="/shopping-lists" />} variant="outline" className="justify-start">
              <ShoppingCart className="h-4 w-4" />
              Create Shopping List
            </Button>
            {ctx.activeHousehold.role === "owner" ? (
              <Button render={<Link href="/family" />} variant="outline" className="justify-start">
                <UserPlus className="h-4 w-4" />
                Invite Family Member
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}
