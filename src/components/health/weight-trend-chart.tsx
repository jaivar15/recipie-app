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

export type WeightTrendPoint = {
  date: string;
  weight: number | null;
  rollingAverage: number | null;
};

const chartConfig = {
  weight: { label: "Weight", color: "var(--chart-1)" },
  rollingAverage: { label: "7-day average", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function WeightTrendChart({ data, unit }: { data: WeightTrendPoint[]; unit: string }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          domain={["dataMin - 1", "dataMax + 1"]}
          tickFormatter={(v: number) => `${v}${unit}`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={1.5} dot={{ r: 2 }} connectNulls />
        <Line
          dataKey="rollingAverage"
          type="monotone"
          stroke="var(--color-rollingAverage)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}
