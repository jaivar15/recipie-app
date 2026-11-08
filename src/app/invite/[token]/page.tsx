import Link from "next/link";
import { ChefHat, MailWarning, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitationAction, declineInvitationAction } from "./actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();

  const [{ data: preview }, { data: userData }] = await Promise.all([
    supabase.rpc("get_invitation_preview", { p_token: token }).maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const user = userData.user;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-foreground">
        <ChefHat className="h-6 w-6 text-primary" />
        <span className="text-lg font-semibold tracking-tight">My Family Recipe Vault</span>
      </Link>

      <Card className="w-full max-w-sm">
        {!preview ? (
          <>
            <CardHeader className="items-center text-center">
              <MailWarning className="mb-2 h-10 w-10 text-destructive" />
              <CardTitle>Invitation not found</CardTitle>
              <CardDescription>This invitation link is invalid.</CardDescription>
            </CardHeader>
          </>
        ) : preview.status !== "pending" ? (
          <>
            <CardHeader className="items-center text-center">
              <MailWarning className="mb-2 h-10 w-10 text-muted-foreground" />
              <CardTitle>
                {preview.status === "accepted"
                  ? "Already accepted"
                  : preview.status === "expired" || new Date(preview.expires_at) < new Date()
                    ? "Invitation expired"
                    : "Invitation no longer valid"}
              </CardTitle>
              <CardDescription>
                This invitation to join {preview.household_name} has already been {preview.status}.
              </CardDescription>
            </CardHeader>
          </>
        ) : new Date(preview.expires_at) < new Date() ? (
          <CardHeader className="items-center text-center">
            <MailWarning className="mb-2 h-10 w-10 text-muted-foreground" />
            <CardTitle>Invitation expired</CardTitle>
            <CardDescription>
              Ask {preview.invited_by_name} to send you a new invitation to join {preview.household_name}.
            </CardDescription>
          </CardHeader>
        ) : (
          <>
            <CardHeader className="items-center text-center">
              <Users className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Join {preview.household_name}</CardTitle>
              <CardDescription>
                {preview.invited_by_name} invited you as{" "}
                <Badge variant="secondary" className="capitalize">
                  {preview.role}
                </Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user && user.email?.toLowerCase() !== preview.invitee_email.toLowerCase() ? (
                <Alert>
                  <AlertTitle>Different email address</AlertTitle>
                  <AlertDescription>
                    This invitation was sent to {preview.invitee_email}, but you&apos;re signed in as {user.email}.
                    Sign out and sign in with the invited address to accept.
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              {!user ? (
                <>
                  <Button render={<Link href={`/login?next=/invite/${token}`} />} className="w-full">
                    Sign in to accept
                  </Button>
                  <Button
                    render={<Link href={`/signup?next=/invite/${token}`} />}
                    variant="outline"
                    className="w-full"
                  >
                    Create an account
                  </Button>
                </>
              ) : user.email?.toLowerCase() === preview.invitee_email.toLowerCase() ? (
                <>
                  <form action={acceptInvitationAction.bind(null, token)} className="w-full">
                    <Button type="submit" className="w-full">
                      Accept and join
                    </Button>
                  </form>
                  <form action={declineInvitationAction.bind(null, token)} className="w-full">
                    <Button type="submit" variant="ghost" className="w-full">
                      Decline
                    </Button>
                  </form>
                </>
              ) : null}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
