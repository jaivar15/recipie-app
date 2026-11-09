"use client";

import { useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { saveHealthProfileAction } from "@/app/(app)/health/actions";
import { DIETARY_LABELS } from "@/lib/validations/recipe";
import { ALLERGENS } from "@/lib/validations/ingredient";
import { ACTIVITY_LEVEL_LABELS } from "@/lib/health/calculations";
import type { Database } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Sex = Database["public"]["Enums"]["biological_sex"];
type ActivityLevel = Database["public"]["Enums"]["activity_level"];

type Profile = Database["public"]["Tables"]["health_profiles"]["Row"] | null;

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const ACTIVITY_OPTIONS = Object.entries(ACTIVITY_LEVEL_LABELS) as [ActivityLevel, string][];

export function HealthProfileSheet({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() ?? "");
  const [currentWeightKg, setCurrentWeightKg] = useState(profile?.current_weight_kg?.toString() ?? "");
  const [startingWeightKg, setStartingWeightKg] = useState(
    profile?.starting_weight_kg?.toString() ?? profile?.current_weight_kg?.toString() ?? ""
  );
  const [targetWeightKg, setTargetWeightKg] = useState(profile?.target_weight_kg?.toString() ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? "");
  const [sex, setSex] = useState<Sex | "">(profile?.sex ?? "");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | "">(profile?.activity_level ?? "");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">((profile?.weight_unit as "kg" | "lb") ?? "kg");
  const [energyUnit, setEnergyUnit] = useState<"kcal" | "kj">((profile?.energy_unit as "kcal" | "kj") ?? "kcal");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(profile?.dietary_preferences ?? []);
  const [allergies, setAllergies] = useState<string[]>(profile?.allergies ?? []);
  const [weighInReminder, setWeighInReminder] = useState(profile?.weigh_in_reminder_enabled ?? false);
  const [reminderTime, setReminderTime] = useState(profile?.weigh_in_reminder_time ?? "08:00");
  const [isPending, startTransition] = useTransition();

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={profile ? "outline" : "default"} />}>
        <Settings2 className="h-4 w-4" />
        {profile ? "Edit profile" : "Set up your health profile"}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your health profile</SheetTitle>
          <SheetDescription>
            Private to you — never visible to household owners or other members. No diagnosis or medical history is
            collected here.
          </SheetDescription>
        </SheetHeader>
        <form
          className="space-y-5 px-4 pb-4"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await saveHealthProfileAction({
                heightCm: heightCm ? Number(heightCm) : null,
                startingWeightKg: startingWeightKg ? Number(startingWeightKg) : null,
                currentWeightKg: currentWeightKg ? Number(currentWeightKg) : null,
                targetWeightKg: targetWeightKg ? Number(targetWeightKg) : null,
                dateOfBirth: dateOfBirth || null,
                sex: sex || null,
                activityLevel: activityLevel || null,
                dietaryPreferences,
                allergies,
                weightUnit,
                energyUnit,
                exercisePreferences: profile?.exercise_preferences ?? [],
                weighInReminderEnabled: weighInReminder,
                weighInReminderTime: weighInReminder ? reminderTime : null,
              });
              setOpen(false);
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input id="height" type="number" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="starting-weight">Starting weight (kg)</Label>
              <Input
                id="starting-weight"
                type="number"
                step="0.1"
                min="0"
                value={startingWeightKg}
                onChange={(e) => setStartingWeightKg(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current-weight">Current weight (kg)</Label>
              <Input
                id="current-weight"
                type="number"
                step="0.1"
                min="0"
                value={currentWeightKg}
                onChange={(e) => setCurrentWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-weight">Target weight (kg) — optional</Label>
            <Input
              id="target-weight"
              type="number"
              step="0.1"
              min="0"
              value={targetWeightKg}
              onChange={(e) => setTargetWeightKg(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Sex — optional, only used for the calorie estimate</Label>
            <Select value={sex} onValueChange={(v) => setSex((v as Sex) ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Prefer not to say">
                  {(value: string) => SEX_OPTIONS.find((o) => o.value === value)?.label ?? "Prefer not to say"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SEX_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Activity level</Label>
            <Select value={activityLevel} onValueChange={(v) => setActivityLevel((v as ActivityLevel) ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select...">
                  {(value: string) => ACTIVITY_OPTIONS.find(([v]) => v === value)?.[1] ?? "Select..."}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Weight unit</Label>
              <Select value={weightUnit} onValueChange={(v) => setWeightUnit((v as "kg" | "lb") ?? "kg")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => (v === "lb" ? "Pounds (lb)" : "Kilograms (kg)")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Energy unit</Label>
              <Select value={energyUnit} onValueChange={(v) => setEnergyUnit((v as "kcal" | "kj") ?? "kcal")}>
                <SelectTrigger className="w-full">
                  <SelectValue>{(v: string) => (v === "kj" ? "Kilojoules (kJ)" : "Calories (kcal)")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kcal">Calories (kcal)</SelectItem>
                  <SelectItem value="kj">Kilojoules (kJ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dietary preferences</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {DIETARY_LABELS.map((label) => (
                <label key={label} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={dietaryPreferences.includes(label)}
                    onCheckedChange={() => toggle(dietaryPreferences, setDietaryPreferences, label)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Allergies / intolerances</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {ALLERGENS.map((label) => (
                <label key={label} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={allergies.includes(label)} onCheckedChange={() => toggle(allergies, setAllergies, label)} />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={weighInReminder} onCheckedChange={(v) => setWeighInReminder(!!v)} />
              Daily weigh-in reminder
            </label>
            {weighInReminder ? (
              <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} className="w-32" />
            ) : null}
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" disabled={isPending}>
              Save profile
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
