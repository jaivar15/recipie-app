import { describe, expect, it } from "vitest";
import { formatQuantity, scaleQuantity } from "./format";

describe("formatQuantity", () => {
  it("renders whole numbers plainly", () => {
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(1)).toBe("1");
  });

  it("renders common fractions", () => {
    expect(formatQuantity(0.5)).toBe("1/2");
    expect(formatQuantity(0.25)).toBe("1/4");
    expect(formatQuantity(1.5)).toBe("1 1/2");
    expect(formatQuantity(2.33)).toBe("2 1/3");
  });

  it("falls back to a rounded decimal for uncommon fractions", () => {
    expect(formatQuantity(1.17)).toBe("1.17");
  });

  it("treats zero and negative values as 0", () => {
    expect(formatQuantity(0)).toBe("0");
    expect(formatQuantity(-1)).toBe("0");
  });
});

describe("scaleQuantity", () => {
  it("scales proportionally to the new serving count", () => {
    expect(scaleQuantity(100, 4, 8)).toBe(200);
    expect(scaleQuantity(100, 4, 2)).toBe(50);
  });

  it("returns the original value when original servings is zero or negative", () => {
    expect(scaleQuantity(100, 0, 8)).toBe(100);
  });
});
