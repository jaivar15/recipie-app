"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type MeasurementTrendPoint = {
  date: string;
  waist: number | null;
  hips: number | null;
};

const chartConfig = {
  waist: { label: "Waist", color: "var(--chart-2)" },
  hips: { label: "Hips", color: "var(--chart-5)" },
} satisfies ChartConfig;

export function MeasurementTrendChart({ data }: { data: MeasurementTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} tickFormatter={(v: number) => `${v}cm`} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="waist" type="monotone" stroke="var(--color-waist)" strokeWidth={2} dot={{ r: 2 }} connectNulls />
        <Line dataKey="hips" type="monotone" stroke="var(--color-hips)" strokeWidth={2} dot={{ r: 2 }} connectNulls />
      </LineChart>
    </ChartContainer>
  );
}
