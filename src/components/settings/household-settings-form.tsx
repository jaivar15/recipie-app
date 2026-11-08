"use client";

import { useActionState, useTransition } from "react";
import { updateHouseholdNameAction, archiveHouseholdAction, type SettingsActionState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const initialState: SettingsActionState = { error: null };

export function HouseholdSettingsForm({
  householdId,
  householdName,
}: {
  householdId: string;
  householdName: string;
}) {
  const [state, formAction, pending] = useActionState(updateHouseholdNameAction, initialState);
  const [isDeleting, startDelete] = useTransition();

  return (
    <div className="space-y-6">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="householdId" value={householdId} />
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : state.success ? (
          <Alert>
            <AlertDescription>Household updated.</AlertDescription>
          </Alert>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="household-name">Household name</Label>
          <Input id="household-name" name="name" defaultValue={householdName} required />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </form>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Deleting a household removes it for every member after a 30-day recovery window.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" disabled={isDeleting} />}>
              Delete household
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {householdName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This household and its shared recipes, meal plans and shopping lists will be hidden from all
                  members immediately, then permanently deleted after 30 days. You can restore it from Settings
                  within that window.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => startDelete(() => archiveHouseholdAction(householdId))}>
                  Delete household
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
