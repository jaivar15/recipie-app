import { describe, expect, it } from "vitest";
import { parseIngredientsCsv } from "./ingredients-csv";

describe("parseIngredientsCsv", () => {
  it("parses a basic multi-row CSV", () => {
    const csv = "name,calories_kcal,protein_g\nChicken breast,165,31\nBrown rice,112,2.6";
    const { rows, skipped } = parseIngredientsCsv(csv);
    expect(skipped).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe("Chicken breast");
    expect(rows[0].nutrition.calories_kcal).toBe("165");
    expect(rows[1].name).toBe("Brown rice");
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'name,notes\n"Tomato, canned","Use for sauces, not salads"';
    const { rows } = parseIngredientsCsv(csv);
    expect(rows[0].name).toBe("Tomato, canned");
    expect(rows[0].notes).toBe("Use for sauces, not salads");
  });

  it("leaves blank nutrition cells undefined rather than guessing", () => {
    const csv = "name,calories_kcal,protein_g\nMystery item,,";
    const { rows } = parseIngredientsCsv(csv);
    expect(rows[0].nutrition.calories_kcal).toBeUndefined();
    expect(rows[0].nutrition.protein_g).toBeUndefined();
  });

  it("skips rows with no name, recording why, rather than guessing one", () => {
    const csv = "name,calories_kcal\n,200\nValid item,150";
    const { rows, skipped } = parseIngredientsCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Valid item");
    expect(skipped).toHaveLength(1);
    expect(skipped[0].rowNumber).toBe(2);
  });

  it("splits allergens and alternative_names on ; or |", () => {
    const csv = "name,allergens,alternative_names\nPeanut butter,Peanuts;Tree nuts,PB|Peanut spread";
    const { rows } = parseIngredientsCsv(csv);
    expect(rows[0].allergens).toEqual(["Peanuts", "Tree nuts"]);
    expect(rows[0].alternative_names).toEqual(["PB", "Peanut spread"]);
  });

  it("ignores unknown columns and tolerates reordered columns", () => {
    const csv = "protein_g,name,made_up_column\n10,Tofu,xyz";
    const { rows } = parseIngredientsCsv(csv);
    expect(rows[0].name).toBe("Tofu");
    expect(rows[0].nutrition.protein_g).toBe("10");
  });

  it("returns nothing for an empty or header-only input", () => {
    expect(parseIngredientsCsv("").rows).toEqual([]);
    expect(parseIngredientsCsv("name,calories_kcal").rows).toEqual([]);
  });

  it("tracks row numbers counting the header as row 1", () => {
    const csv = "name\nFirst\nSecond";
    const { rows } = parseIngredientsCsv(csv);
    expect(rows[0].rowNumber).toBe(2);
    expect(rows[1].rowNumber).toBe(3);
  });
});
