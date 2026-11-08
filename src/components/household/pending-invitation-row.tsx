"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { revokeInvitationAction } from "@/app/(app)/family/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PendingInvitationRow({
  invitationId,
  email,
  role,
  expiresAt,
}: {
  invitationId: string;
  email: string;
  role: string;
  expiresAt: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{email}</p>
        <p className="text-xs text-muted-foreground">
          Expires {new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
        </p>
      </div>
      <Badge variant="outline" className="capitalize">
        {role}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        disabled={isPending}
        onClick={() => startTransition(() => revokeInvitationAction(invitationId))}
        title="Revoke invitation"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
