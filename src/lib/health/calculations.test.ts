import { describe, expect, it } from "vitest";
import {
  calculateAge,
  deriveCalorieTarget,
  estimateBMR,
  estimateTDEE,
  formatWeight,
  kgToLb,
  lbToKg,
  MAX_SAFE_RATE_KG_PER_WEEK,
  rollingAverage,
  summarizeWeightChange,
} from "./calculations";

/**
 * Formats a Date's LOCAL calendar date as "YYYY-MM-DD" — deliberately not
 * `.toISOString().slice(0, 10)`, which reads the UTC calendar date and
 * silently rolls back a day for part of the day in any positive-UTC-offset
 * timezone. calculateAge compares against `new Date()` (local "now"), so
 * the test's input dates must be local-dated too, or the test becomes
 * time-of-day-flaky — this bit a real test run already.
 */
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

describe("calculateAge", () => {
  it("returns null when no date of birth is given", () => {
    expect(calculateAge(null)).toBeNull();
  });

  it("computes age relative to today, accounting for whether the birthday has passed this year", () => {
    const today = new Date();
    const turnedThirtyToday = new Date(today);
    turnedThirtyToday.setFullYear(today.getFullYear() - 30);
    expect(calculateAge(toLocalDateString(turnedThirtyToday))).toBe(30);

    // Birthday is tomorrow — hasn't turned 30 yet this year.
    const turnsThirtyTomorrow = new Date(today);
    turnsThirtyTomorrow.setFullYear(today.getFullYear() - 30);
    turnsThirtyTomorrow.setDate(turnsThirtyTomorrow.getDate() + 1);
    expect(calculateAge(toLocalDateString(turnsThirtyTomorrow))).toBe(29);
  });
});

describe("estimateBMR", () => {
  it("applies the male offset", () => {
    expect(estimateBMR({ weightKg: 70, heightCm: 175, age: 30, sex: "male" })).toBe(1649);
  });

  it("applies the female offset", () => {
    expect(estimateBMR({ weightKg: 70, heightCm: 175, age: 30, sex: "female" })).toBe(1483);
  });

  it("averages the offset rather than guessing when sex is unspecified", () => {
    expect(estimateBMR({ weightKg: 70, heightCm: 175, age: 30, sex: null })).toBe(1566);
  });
});

describe("estimateTDEE", () => {
  it("multiplies BMR by the activity level factor", () => {
    expect(estimateTDEE(1650, "sedentary")).toBe(1980);
    expect(estimateTDEE(1650, "very_active")).toBe(Math.round(1650 * 1.725));
  });

  it("defaults to sedentary when no activity level is set", () => {
    expect(estimateTDEE(1650, null)).toBe(1980);
  });
});

describe("deriveCalorieTarget", () => {
  it("maintenance mode returns TDEE unchanged with no warning", () => {
    const result = deriveCalorieTarget({ tdee: 2200, goalMode: "maintenance", rateKgPerWeek: 0.5, sex: "male" });
    expect(result).toEqual({ calorieTarget: 2200, warning: null });
  });

  it("loss mode subtracts a calorie deficit sized to the requested rate", () => {
    const result = deriveCalorieTarget({ tdee: 2500, goalMode: "loss", rateKgPerWeek: 0.5, sex: "male" });
    expect(result.calorieTarget).toBe(1950);
    expect(result.warning).toBeNull();
  });

  it("gain mode adds a calorie surplus sized to the requested rate", () => {
    const result = deriveCalorieTarget({ tdee: 2000, goalMode: "gain", rateKgPerWeek: 0.3, sex: "female" });
    expect(result.calorieTarget).toBe(2330);
    expect(result.warning).toBeNull();
  });

  it("clamps a requested rate above the safety maximum and warns", () => {
    // rate well above MAX_SAFE_RATE_KG_PER_WEEK, but TDEE high enough that
    // the clamped deficit still lands above the floor — isolates the
    // rate-cap warning from the floor-raise warning.
    const result = deriveCalorieTarget({ tdee: 3000, goalMode: "loss", rateKgPerWeek: 2.0, sex: "male" });
    expect(result.calorieTarget).toBe(3000 - Math.round((MAX_SAFE_RATE_KG_PER_WEEK * 7700) / 7));
    expect(result.warning).toMatch(/capped/i);
  });

  it("never proposes a loss target below the sex-aware floor, and warns instead", () => {
    const result = deriveCalorieTarget({ tdee: 2000, goalMode: "loss", rateKgPerWeek: 1.5, sex: "male" });
    expect(result.calorieTarget).toBe(1500);
    expect(result.warning).toMatch(/1500 kcal/);
  });

  it("never proposes a target below the absolute 1000 kcal floor", () => {
    const result = deriveCalorieTarget({ tdee: 1200, goalMode: "loss", rateKgPerWeek: 0.5, sex: "female" });
    expect(result.calorieTarget).toBeGreaterThanOrEqual(1000);
  });
});

describe("weight unit conversions", () => {
  it("converts kg to lb and back", () => {
    expect(kgToLb(10)).toBeCloseTo(22.0462, 3);
    expect(lbToKg(kgToLb(82.5))).toBeCloseTo(82.5, 6);
  });

  it("formats a weight in the requested unit, rounded to one decimal", () => {
    expect(formatWeight(82.5, "kg")).toBe("82.5 kg");
    expect(formatWeight(82.5, "lb")).toBe("181.9 lb");
  });
});

describe("rollingAverage", () => {
  it("averages over the trailing window, shrinking near the start of the series", () => {
    expect(rollingAverage([10, 20, 30], 2)).toEqual([10, 15, 25]);
  });

  it("returns an empty array for an empty series", () => {
    expect(rollingAverage([], 7)).toEqual([]);
  });
});

describe("summarizeWeightChange", () => {
  it("computes the change and percent change, and classifies the trend", () => {
    const result = summarizeWeightChange(90, 88);
    expect(result.totalChangeKg).toBe(-2);
    expect(result.percentChange).toBeCloseTo((-2 / 90) * 100, 6);
    expect(result.trend).toBe("down");
  });

  it("treats a sub-0.1kg difference as flat rather than up/down", () => {
    expect(summarizeWeightChange(80, 80.05).trend).toBe("flat");
  });

  it("classifies an increase as up", () => {
    expect(summarizeWeightChange(80, 82).trend).toBe("up");
  });
});
