"use client";

import { useActionState } from "react";
import { updateProfileAction, type SettingsActionState } from "@/app/(app)/settings/actions";
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

const initialState: SettingsActionState = { error: null };

export function ProfileForm({
  displayName,
  email,
  measurementSystem,
}: {
  displayName: string;
  email: string;
  measurementSystem: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : state.success ? (
        <Alert>
          <AlertDescription>Profile updated.</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="displayName">Your name</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName} required />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="measurementSystem">Preferred measurement system</Label>
        <Select name="measurementSystem" defaultValue={measurementSystem}>
          <SelectTrigger id="measurementSystem" className="w-full">
            <SelectValue>
              {(value: string) =>
                value === "imperial" ? "Imperial (oz, cups, °F)" : "Metric (g, mL, °C) — Australian default"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="metric">Metric (g, mL, °C) — Australian default</SelectItem>
            <SelectItem value="imperial">Imperial (oz, cups, °F)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
