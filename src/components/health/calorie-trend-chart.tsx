"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type CalorieTrendPoint = {
  date: string;
  calories: number | null;
};

const chartConfig = {
  calories: { label: "Calories", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function CalorieTrendChart({
  data,
  target,
}: {
  data: CalorieTrendPoint[];
  target: number | null;
}) {
  return (
    <ChartContainer config={chartConfig} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        {target != null ? (
          <ReferenceLine
            y={target}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Target", position: "insideTopRight", fontSize: 11 }}
          />
        ) : null}
        <Bar dataKey="calories" fill="var(--color-calories)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
