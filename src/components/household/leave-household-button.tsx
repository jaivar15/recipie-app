"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { leaveHouseholdAction } from "@/app/(app)/family/actions";
import { Button } from "@/components/ui/button";
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

export function LeaveHouseholdButton({ householdId, householdName }: { householdId: string; householdName: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" disabled={isPending} />}>
        <LogOut className="h-4 w-4" />
        Leave household
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Leave {householdName}?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll lose access to this household&apos;s recipes, meal plans and shopping lists. Your own
            personal recipes stay with you.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => startTransition(() => leaveHouseholdAction(householdId))}>
            Leave household
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
