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

export type ProteinFibreTrendPoint = {
  date: string;
  protein: number | null;
  fibre: number | null;
};

const chartConfig = {
  protein: { label: "Protein (g)", color: "var(--chart-2)" },
  fibre: { label: "Fibre (g)", color: "var(--chart-3)" },
} satisfies ChartConfig;

export function ProteinFibreTrendChart({ data }: { data: ProteinFibreTrendPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="protein"
          type="monotone"
          stroke="var(--color-protein)"
          strokeWidth={2}
          dot={{ r: 2 }}
          connectNulls
        />
        <Line
          dataKey="fibre"
          type="monotone"
          stroke="var(--color-fibre)"
          strokeWidth={2}
          dot={{ r: 2 }}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}
