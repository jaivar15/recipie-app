/**
 * Formats a scaled quantity as a sensible fraction for display in the
 * recipe serving scaler (e.g. 0.333 -> "1/3", 1.5 -> "1 1/2"). Falls back
 * to a rounded decimal when no common fraction is close enough.
 */
const COMMON_FRACTIONS: [number, string][] = [
  [1 / 8, "1/8"],
  [1 / 4, "1/4"],
  [1 / 3, "1/3"],
  [1 / 2, "1/2"],
  [2 / 3, "2/3"],
  [3 / 4, "3/4"],
];

export function formatQuantity(value: number): string {
  if (value <= 0) return "0";

  const whole = Math.floor(value);
  const remainder = value - whole;

  if (remainder < 0.02) {
    return String(whole || value.toFixed(2).replace(/\.?0+$/, ""));
  }

  for (const [fractionValue, label] of COMMON_FRACTIONS) {
    if (Math.abs(remainder - fractionValue) < 0.03) {
      return whole > 0 ? `${whole} ${label}` : label;
    }
  }

  const rounded = Math.round(value * 100) / 100;
  return String(Number.isInteger(rounded) ? rounded : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, ""));
}

export function scaleQuantity(original: number, originalServings: number, targetServings: number): number {
  if (originalServings <= 0) return original;
  return (original * targetServings) / originalServings;
}

/**
 * Formats a nutrient value for display, appending "+" when the
 * contributing ingredients only produced a lower bound rather than an
 * exact figure. Returns null (never "0") when the value is unknown.
 */
export function formatMacroValue(value: number | null, complete: boolean): string | null {
  if (value == null) return null;
  return `${Math.round(value).toLocaleString()}${complete ? "" : "+"}`;
}
