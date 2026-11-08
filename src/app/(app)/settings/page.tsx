import { Download } from "lucide-react";
import { getHouseholdContext } from "@/lib/households/context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/settings/profile-form";
import { HouseholdSettingsForm } from "@/components/settings/household-settings-form";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const ctx = await getHouseholdContext();
  if (!ctx) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("measurement_system")
    .eq("id", ctx.userId)
    .single();

  const isOwner = ctx.activeHousehold?.role === "owner";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Your profile, household and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {ctx.activeHousehold ? <TabsTrigger value="household">Household</TabsTrigger> : null}
          {ctx.activeHousehold ? <TabsTrigger value="export">Data export</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Personal profile</CardTitle>
              <CardDescription>Visible to members of households you share.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                displayName={ctx.displayName}
                email={ctx.email}
                measurementSystem={profile?.measurement_system ?? "metric"}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {ctx.activeHousehold ? (
          <TabsContent value="household">
            <Card>
              <CardHeader>
                <CardTitle>{ctx.activeHousehold.householdName}</CardTitle>
                <CardDescription>
                  {isOwner ? "Manage this household's name and danger zone." : "Only the owner can change these settings."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOwner ? (
                  <HouseholdSettingsForm
                    householdId={ctx.activeHousehold.householdId}
                    householdName={ctx.activeHousehold.householdName}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Ask the household owner to make changes here.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        {ctx.activeHousehold ? (
          <TabsContent value="export">
            <Card>
              <CardHeader>
                <CardTitle>Household backup</CardTitle>
                <CardDescription>
                  Download every household recipe, tag and collection as a single JSON file — useful for backups or
                  moving to another system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isOwner ? (
                  <Button render={<a href="/settings/export" />}>
                    <Download className="h-4 w-4" />
                    Download household backup
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Only the household owner can export a full backup.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
