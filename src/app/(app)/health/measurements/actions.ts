"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export type MeasurementValues = {
  entryDate: string;
  waistCm: number | null;
  hipsCm: number | null;
  chestCm: number | null;
  neckCm: number | null;
  upperArmCm: number | null;
  thighCm: number | null;
  notes: string;
};

export async function addMeasurementAction(values: MeasurementValues) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("body_measurements").insert({
    user_id: userId,
    entry_date: values.entryDate,
    waist_cm: values.waistCm,
    hips_cm: values.hipsCm,
    chest_cm: values.chestCm,
    neck_cm: values.neckCm,
    upper_arm_cm: values.upperArmCm,
    thigh_cm: values.thighCm,
    notes: values.notes || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/health/measurements");
}

export async function deleteMeasurementAction(id: string) {
  const { supabase } = await requireUserId();
  const { error } = await supabase.from("body_measurements").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/health/measurements");
}

export async function addProgressPhotoAction(values: { entryDate: string; storagePath: string; caption: string }) {
  const { supabase, userId } = await requireUserId();
  const { error } = await supabase.from("progress_photos").insert({
    user_id: userId,
    entry_date: values.entryDate,
    storage_path: values.storagePath,
    caption: values.caption || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/health/measurements");
}

export async function deleteProgressPhotoAction(id: string) {
  const { supabase, userId } = await requireUserId();
  const { data: photo } = await supabase
    .from("progress_photos")
    .select("storage_path")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase.from("progress_photos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (photo) {
    await supabase.storage.from("progress-photos").remove([photo.storage_path]);
  }
  revalidatePath("/health/measurements");
}
