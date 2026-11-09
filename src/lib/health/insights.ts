import { rollingAverage } from "@/lib/health/calculations";

export type DailyLog = { date: string; value: number | null };

/**
 * Average of the known (non-null) values in a series. Returns null when
 * nothing was logged — never silently treats missing days as 0.
 */
export function averageKnown(values: (number | null)[]): number | null {
  const known = values.filter((v): v is number => v != null);
  if (known.length === 0) return null;
  return known.reduce((sum, v) => sum + v, 0) / known.length;
}

/**
 * Builds short, neutral, descriptive statements about a period — counts
 * and averages only, never a causal claim ("X caused Y") and never framed
 * as praise or criticism. Each builder is independent: a metric with no
 * data simply produces no sentence for it, rather than a guess.
 */
export function buildNeutralInsights(input: {
  periodDays: number;
  weightLoggedDays: number;
  weightSeriesKg: number[]; // chronological, one entry-of-record per logged day
  calorieLoggedDays: number;
  avgCalories: number | null;
  calorieTarget: number | null;
  avgProtein: number | null;
  proteinTarget: number | null;
  avgFibre: number | null;
  fibreTarget: number | null;
  exerciseLoggedDays: number;
  totalExerciseMinutes: number;
}): string[] {
  const insights: string[] = [];

  insights.push(
    `You logged weight on ${input.weightLoggedDays} of the last ${input.periodDays} days.`,
  );

  if (input.weightSeriesKg.length >= 2) {
    const rolling = rollingAverage(input.weightSeriesKg, 7);
    const first = rolling[0];
    const last = rolling[rolling.length - 1];
    if (first != null && last != null) {
      const diff = Math.round((last - first) * 10) / 10;
      const direction =
        diff === 0
          ? "stayed about the same"
          : diff < 0
            ? `moved down ${Math.abs(diff)} kg`
            : `moved up ${diff} kg`;
      insights.push(`Your 7-day average weight ${direction} over this period.`);
    }
  }

  if (input.avgCalories != null) {
    const targetClause =
      input.calorieTarget != null ? ` (target: ${input.calorieTarget} kcal)` : "";
    insights.push(
      `Average logged calories: ${Math.round(input.avgCalories)} kcal/day on the ${input.calorieLoggedDays} day${input.calorieLoggedDays === 1 ? "" : "s"} you logged food${targetClause}.`,
    );
  }

  if (input.avgProtein != null) {
    const targetClause = input.proteinTarget != null ? ` (target: ${input.proteinTarget}g)` : "";
    insights.push(`Average logged protein: ${Math.round(input.avgProtein)}g/day${targetClause}.`);
  }

  if (input.avgFibre != null) {
    const targetClause = input.fibreTarget != null ? ` (target: ${input.fibreTarget}g)` : "";
    insights.push(`Average logged fibre: ${Math.round(input.avgFibre)}g/day${targetClause}.`);
  }

  if (input.exerciseLoggedDays > 0) {
    insights.push(
      `You logged activity on ${input.exerciseLoggedDays} of the last ${input.periodDays} days, totalling ${input.totalExerciseMinutes} minutes.`,
    );
  }

  return insights;
}
