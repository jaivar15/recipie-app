"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createCollectionAction } from "@/app/(app)/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HouseholdOption = { id: string; name: string };

export function CreateCollectionDialog({ households }: { households: HouseholdOption[] }) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<"personal" | "household">(
    households.length > 0 ? "household" : "personal"
  );
  const [householdId, setHouseholdId] = useState(households[0]?.id ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="h-4 w-4" />
        New collection
      </DialogTrigger>
      <DialogContent>
        <form action={createCollectionAction}>
          <input type="hidden" name="visibility" value={visibility} />
          <input type="hidden" name="householdId" value={householdId} />
          <DialogHeader>
            <DialogTitle>Create a collection</DialogTitle>
            <DialogDescription>Group recipes together, e.g. &quot;Mum&apos;s Recipes&quot; or &quot;Quick Lunches&quot;.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collection-name">Name</Label>
              <Input id="collection-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea id="collection-description" name="description" rows={2} />
            </div>
            {households.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={(v) => setVisibility(v as "personal" | "household")}>
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        {(value: string) => (value === "household" ? "Household — shared" : "Personal — only you")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal — only you</SelectItem>
                      <SelectItem value="household">Household — shared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {visibility === "household" ? (
                  <div className="space-y-2">
                    <Label>Household</Label>
                    <Select value={householdId} onValueChange={(v) => setHouseholdId(v ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {(value: string) => households.find((h) => h.id === value)?.name ?? ""}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {households.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="submit">Create collection</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
