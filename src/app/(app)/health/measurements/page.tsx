import Link from "next/link";
import { Ruler } from "lucide-react";
import { getHealthContext } from "@/lib/health/context";
import { createClient } from "@/lib/supabase/server";
import { signProgressPhotoUrls } from "@/lib/supabase/storage";
import { EmptyState } from "@/components/layout/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddMeasurementDialog } from "@/components/health/add-measurement-dialog";
import { MeasurementRow } from "@/components/health/measurement-row";
import { MeasurementTrendChart, type MeasurementTrendPoint } from "@/components/health/measurement-trend-chart";
import { ProgressPhotoUpload } from "@/components/health/progress-photo-upload";
import { ProgressPhotoGrid } from "@/components/health/progress-photo-grid";

export default async function BodyMeasurementsPage() {
  const ctx = await getHealthContext();
  if (!ctx) return null;

  const supabase = await createClient();

  const [{ data: measurementRows }, { data: photoRows }] = await Promise.all([
    supabase
      .from("body_measurements")
      .select("id, entry_date, waist_cm, hips_cm, chest_cm, neck_cm, upper_arm_cm, thigh_cm, notes")
      .eq("user_id", ctx.userId)
      .order("entry_date", { ascending: false }),
    supabase
      .from("progress_photos")
      .select("id, entry_date, storage_path, caption")
      .eq("user_id", ctx.userId)
      .order("entry_date", { ascending: false }),
  ]);

  const rows = measurementRows ?? [];
  const photos = photoRows ?? [];
  const urlMap = await signProgressPhotoUrls(photos.map((p) => p.storage_path));

  const chartData: MeasurementTrendPoint[] = [...rows]
    .reverse()
    .map((r) => ({
      date: new Date(r.entry_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
      waist: r.waist_cm != null ? Number(r.waist_cm) : null,
      hips: r.hips_cm != null ? Number(r.hips_cm) : null,
    }));
  const hasChartData = chartData.some((p) => p.waist != null || p.hips != null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Body Measurements</h1>
          <p className="text-sm text-muted-foreground">Waist, hips, chest and more, tracked privately over time.</p>
        </div>
        <AddMeasurementDialog />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No measurements logged yet"
          description="Log your first measurement to start seeing trends over time."
        />
      ) : (
        <>
          {hasChartData ? (
            <Card>
              <CardHeader>
                <p className="font-medium">Waist &amp; hips trend</p>
              </CardHeader>
              <CardContent>
                <MeasurementTrendChart data={chartData} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <p className="font-medium">History</p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Waist</TableHead>
                    <TableHead>Hips</TableHead>
                    <TableHead>Chest</TableHead>
                    <TableHead>Neck</TableHead>
                    <TableHead>Arm</TableHead>
                    <TableHead>Thigh</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <MeasurementRow
                      key={r.id}
                      id={r.id}
                      dateLabel={new Date(r.entry_date).toLocaleDateString("en-AU", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      waistCm={r.waist_cm != null ? Number(r.waist_cm) : null}
                      hipsCm={r.hips_cm != null ? Number(r.hips_cm) : null}
                      chestCm={r.chest_cm != null ? Number(r.chest_cm) : null}
                      neckCm={r.neck_cm != null ? Number(r.neck_cm) : null}
                      upperArmCm={r.upper_arm_cm != null ? Number(r.upper_arm_cm) : null}
                      thighCm={r.thigh_cm != null ? Number(r.thigh_cm) : null}
                      notes={r.notes}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <p className="font-medium">Progress photos</p>
            <p className="text-sm text-muted-foreground">Private to you — never visible to your household.</p>
          </div>
          <ProgressPhotoUpload userId={ctx.userId} />
        </CardHeader>
        <CardContent>
          <ProgressPhotoGrid
            photos={photos.map((p) => ({
              id: p.id,
              dateLabel: new Date(p.entry_date).toLocaleDateString("en-AU", { day: "numeric", month: "short" }),
              signedUrl: urlMap[p.storage_path] ?? null,
            }))}
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Link href="/health" className="underline">
          Back to overview
        </Link>
      </p>
    </div>
  );
}
