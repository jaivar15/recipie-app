import Link from "next/link";
import { Scale, Download } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { rollingAverage, kgToLb } from "@/lib/health/calculations";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddWeightEntryDialog } from "@/components/health/add-weight-entry-dialog";
import { WeightEntryRow } from "@/components/health/weight-entry-row";
import { WeightTrendChart, type WeightTrendPoint } from "@/components/health/weight-trend-chart";

export default async function WeightTrackerPage() {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  const unit = (ctx.profile?.weight_unit ?? "kg") as "kg" | "lb";
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("weight_entries")
    .select("id, entry_date, entry_time, weight_kg, notes, created_at")
    .eq("user_id", ctx.userId)
    .order("entry_date", { ascending: false })
    .order("entry_time", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  const rows = entries ?? [];

  // "Entry of record" per day: first row for that date once sorted by
  // time then created_at descending (defined once, used everywhere).
  const byDate = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    if (!byDate.has(r.entry_date)) byDate.set(r.entry_date, r);
  }
  const dailyDatesAsc = [...byDate.keys()].sort();
  const dailyWeightsKg = dailyDatesAsc.map((d) => Number(byDate.get(d)!.weight_kg));
  const rolling7 = rollingAverage(dailyWeightsKg, 7);

  const chartData: WeightTrendPoint[] = dailyDatesAsc.map((d, i) => ({
    date: new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
    weight: unit === "lb" ? Math.round(kgToLb(dailyWeightsKg[i]) * 10) / 10 : Math.round(dailyWeightsKg[i] * 10) / 10,
    rollingAverage:
      rolling7[i] != null ? Math.round((unit === "lb" ? kgToLb(rolling7[i]!) : rolling7[i]!) * 10) / 10 : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Weight Tracker</h1>
          <p className="text-sm text-muted-foreground">Private to you — never visible to your household.</p>
        </div>
        <div className="flex gap-2">
          {rows.length > 0 ? (
            <Button variant="outline" render={<a href="/health/weight/export" />}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          ) : null}
          <AddWeightEntryDialog unit={unit} />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No weigh-ins logged yet"
          description="Log your first weight to start seeing trends over time."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <p className="font-medium">Weight trend</p>
              <p className="text-sm text-muted-foreground">
                Day-to-day weight fluctuates normally — the 7-day average helps separate noise from a real trend.
              </p>
            </CardHeader>
            <CardContent>
              <WeightTrendChart data={chartData} unit={unit} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="font-medium">History</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <WeightEntryRow
                      key={r.id}
                      id={r.id}
                      dateLabel={new Date(r.entry_date).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      time={r.entry_time}
                      weightKg={Number(r.weight_kg)}
                      unit={unit}
                      notes={r.notes}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <p className="text-xs text-muted-foreground">
        <Link href="/health" className="underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
