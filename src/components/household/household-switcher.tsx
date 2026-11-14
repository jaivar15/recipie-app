"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { ChevronsUpDown, Home, Plus } from "lucide-react";
import { setActiveHouseholdAction, createHouseholdAction } from "@/app/(app)/actions";
import type { HouseholdMembership } from "@/lib/households/context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

function CreateHouseholdSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating…" : "Create household"}
    </Button>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function HouseholdSwitcher({
  households,
  activeHouseholdId,
}: {
  households: HouseholdMembership[];
  activeHouseholdId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const active = households.find((h) => h.householdId === activeHouseholdId) ?? households[0];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent" />}
          >
            <Avatar className="h-6 w-6 rounded-md">
              <AvatarImage src={active?.imageUrl ?? undefined} />
              <AvatarFallback className="rounded-md bg-primary/15 text-xs text-primary">
                {active ? initials(active.householdName) : <Home className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col text-left leading-tight">
              <span className="truncate text-sm font-medium">
                {active?.householdName ?? "No household yet"}
              </span>
              {active ? (
                <span className="truncate text-xs text-muted-foreground capitalize">
                  {active.role}
                </span>
              ) : null}
            </div>
            <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Your households
              </DropdownMenuLabel>
              {households.map((h) => (
                <DropdownMenuItem
                  key={h.householdId}
                  disabled={isPending}
                  onClick={() => startTransition(() => setActiveHouseholdAction(h.householdId))}
                  className="gap-2"
                >
                  <Avatar className="h-5 w-5 rounded-sm">
                    <AvatarImage src={h.imageUrl ?? undefined} />
                    <AvatarFallback className="rounded-sm text-[10px]">
                      {initials(h.householdName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{h.householdName}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create household
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form action={createHouseholdAction}>
            <DialogHeader>
              <DialogTitle>Create a household</DialogTitle>
              <DialogDescription>
                Give your family&apos;s shared recipe vault a name. You can invite members
                afterwards.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="household-name">Household name</Label>
              <Input
                id="household-name"
                name="name"
                placeholder="The Jain Family Kitchen"
                required
              />
            </div>
            <DialogFooter>
              <CreateHouseholdSubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}

export function CreateHouseholdTrigger({ children }: { children: React.ReactElement }) {
  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent>
        <form action={createHouseholdAction}>
          <DialogHeader>
            <DialogTitle>Create a household</DialogTitle>
            <DialogDescription>
              Give your family&apos;s shared recipe vault a name. You can invite members afterwards.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label htmlFor="household-name-2">Household name</Label>
            <Input
              id="household-name-2"
              name="name"
              placeholder="The Jain Family Kitchen"
              required
            />
          </div>
          <DialogFooter>
            <CreateHouseholdSubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
