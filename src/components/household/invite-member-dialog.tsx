"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { inviteMemberAction, type FamilyActionState } from "@/app/(app)/family/actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const initialState: FamilyActionState = { error: null };

export function InviteMemberDialog({ householdId }: { householdId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(inviteMemberAction, initialState);
  const [copied, setCopied] = useState(false);
  // useActionState's result outlives the dialog closing (this component
  // never unmounts), so track the success link separately and clear it
  // whenever the dialog is reopened — otherwise re-opening after a
  // successful invite re-shows the previous invitation's link instead of a
  // fresh form.
  const [visibleLink, setVisibleLink] = useState<string | null>(null);

  useEffect(() => {
    if (state.inviteLink) setVisibleLink(state.inviteLink);
  }, [state]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setVisibleLink(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlus className="h-4 w-4" />
        Invite Family Member
      </DialogTrigger>
      <DialogContent>
        {visibleLink ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation created</DialogTitle>
              <DialogDescription>
                Share this link with your family member. It expires in 7 days and can only be used once.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted/50 p-2">
              <code className="flex-1 truncate text-xs">{visibleLink}</code>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(visibleLink!);
                  setCopied(true);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="householdId" value={householdId} />
            <DialogHeader>
              <DialogTitle>Invite a family member</DialogTitle>
              <DialogDescription>
                They&apos;ll get a secure link to join this household with the role you choose.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {state.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input id="invite-email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select name="role" defaultValue="viewer">
                  <SelectTrigger id="invite-role">
                    <SelectValue>
                      {(value: string) =>
                        value === "editor" ? "Editor — can add and edit recipes" : "Viewer — can view and cook along"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">Editor — can add and edit recipes</SelectItem>
                    <SelectItem value="viewer">Viewer — can view and cook along</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending invitation…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
