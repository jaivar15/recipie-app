"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/app/(app)/family/actions";
import type { Database } from "@/lib/types/database";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type HouseholdRole = Database["public"]["Enums"]["household_role"];

export function MemberRow({
  householdId,
  userId,
  displayName,
  email,
  avatarUrl,
  role,
  isSelf,
  canManage,
}: {
  householdId: string;
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: HouseholdRole;
  isSelf: boolean;
  canManage: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmAction, setConfirmAction] = useState<"remove" | "transfer" | null>(null);

  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={avatarUrl ?? undefined} />
        <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {displayName} {isSelf ? <span className="text-muted-foreground">(you)</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>
      <Badge variant={role === "owner" ? "default" : "secondary"} className="capitalize">
        {role}
      </Badge>

      {canManage && !isSelf && role !== "owner" ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending} />}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {role === "viewer" ? (
              <DropdownMenuItem
                onClick={() =>
                  startTransition(() => changeMemberRoleAction(householdId, userId, "editor"))
                }
              >
                Make editor
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  startTransition(() => changeMemberRoleAction(householdId, userId, "viewer"))
                }
              >
                Make viewer
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setConfirmAction("transfer")}>
              Transfer ownership
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmAction("remove")}>
              Remove from household
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={confirmAction === "remove"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll lose access to this household&apos;s recipes, meal plans and shopping lists. Their own
              personal recipes are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(() => removeMemberAction(householdId, userId))}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === "transfer"} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer ownership to {displayName}?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll become an editor and {displayName} will become the household owner. This cannot be
              undone except by them transferring it back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => startTransition(() => transferOwnershipAction(householdId, userId))}
            >
              Transfer ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
