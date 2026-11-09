import { describe, expect, it } from "vitest";
import { averageKnown, buildNeutralInsights } from "./insights";

describe("averageKnown", () => {
  it("averages only the non-null values", () => {
    expect(averageKnown([10, null, 20])).toBe(15);
  });

  it("returns null when nothing is known — never pretends 0", () => {
    expect(averageKnown([null, null])).toBeNull();
    expect(averageKnown([])).toBeNull();
  });
});

describe("buildNeutralInsights", () => {
  const baseInput = {
    periodDays: 30,
    weightLoggedDays: 10,
    weightSeriesKg: [90, 89.5, 89, 88.5, 88],
    calorieLoggedDays: 20,
    avgCalories: 2100,
    calorieTarget: 2200,
    avgProtein: 140,
    proteinTarget: 150,
    avgFibre: 22,
    fibreTarget: 25,
    exerciseLoggedDays: 8,
    totalExerciseMinutes: 240,
  };

  it("reports counts and averages for every metric with data", () => {
    const insights = buildNeutralInsights(baseInput);
    expect(insights.some((line) => line.includes("10 of the last 30 days"))).toBe(true);
    expect(insights.some((line) => line.includes("2100 kcal/day"))).toBe(true);
    expect(insights.some((line) => line.includes("140g/day"))).toBe(true);
    expect(insights.some((line) => line.includes("22g/day"))).toBe(true);
    expect(insights.some((line) => line.includes("240 minutes"))).toBe(true);
  });

  it("never uses causal language — only descriptive counts and averages", () => {
    const insights = buildNeutralInsights(baseInput);
    const causalWords = /\b(because|caused?|due to|leads? to|results? in|so you|means you)\b/i;
    for (const line of insights) {
      expect(line).not.toMatch(causalWords);
    }
  });

  it("omits a metric's sentence entirely when there's no data for it, rather than guessing", () => {
    const insights = buildNeutralInsights({
      ...baseInput,
      avgCalories: null,
      avgProtein: null,
      avgFibre: null,
      exerciseLoggedDays: 0,
      totalExerciseMinutes: 0,
    });
    expect(insights.some((line) => line.includes("kcal/day"))).toBe(false);
    expect(insights.some((line) => line.includes("protein"))).toBe(false);
    expect(insights.some((line) => line.includes("activity"))).toBe(false);
  });

  it("includes the target in parentheses only when one is set", () => {
    const withoutTargets = buildNeutralInsights({
      ...baseInput,
      calorieTarget: null,
      proteinTarget: null,
      fibreTarget: null,
    });
    expect(withoutTargets.some((line) => line.includes("target:"))).toBe(false);
  });
});
