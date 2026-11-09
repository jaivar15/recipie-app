import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: entries } = await supabase
    .from("weight_entries")
    .select("entry_date, entry_time, weight_kg, notes")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false });

  const rows: string[][] = [["Date", "Time", "Weight (kg)", "Notes"]];
  for (const e of entries ?? []) {
    rows.push([e.entry_date, e.entry_time ?? "", String(e.weight_kg), e.notes ?? ""]);
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="weight-history.csv"`,
    },
  });
}
