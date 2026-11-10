const COLUMNS = [
  "name",
  "food_category",
  "state",
  "brand",
  "allergens",
  "alternative_names",
  "notes",
  "nutrition_reference_amount",
  "nutrition_reference_unit",
  "energy_kj",
  "calories_kcal",
  "protein_g",
  "carbohydrate_g",
  "fat_g",
  "saturated_fat_g",
  "fibre_g",
  "sugars_g",
  "sodium_mg",
  "iron_mg",
  "calcium_mg",
  "potassium_mg",
  "magnesium_mg",
  "vitamin_b12_ug",
  "folate_ug",
] as const;
type Column = (typeof COLUMNS)[number];

const NUTRITION_COLUMNS = new Set<Column>([
  "energy_kj",
  "calories_kcal",
  "protein_g",
  "carbohydrate_g",
  "fat_g",
  "saturated_fat_g",
  "fibre_g",
  "sugars_g",
  "sodium_mg",
  "iron_mg",
  "calcium_mg",
  "potassium_mg",
  "magnesium_mg",
  "vitamin_b12_ug",
  "folate_ug",
]);

export const INGREDIENTS_CSV_TEMPLATE_HEADER = COLUMNS.join(",");

/** One raw, string-only row of parsed ingredient data, ready for ingredientFormSchema validation. */
export type ParsedIngredientRow = {
  rowNumber: number; // 1-indexed, counting the header as row 1, for error messages
  name: string;
  food_category?: string;
  state?: string;
  brand?: string;
  allergens: string[];
  alternative_names: string[];
  notes?: string;
  /** "g" or "ml" (liquids like milk, oil, stock); defaults to "g" when blank or unrecognised. */
  nutrition_reference_unit: "g" | "ml";
  /** The amount of that unit the nutrition columns are "per" — defaults to 100 when blank or invalid. */
  nutrition_reference_amount: number;
  nutrition: Record<string, string | undefined>;
};

export type ParseIngredientsCsvResult = {
  rows: ParsedIngredientRow[];
  /** Rows with no name at all — skipped rather than guessed. */
  skipped: { rowNumber: number; reason: string }[];
};

/**
 * Splits a single CSV line into fields, honouring double-quoted fields that
 * may contain commas or escaped ("") quotes. Minimal by design — this
 * covers spreadsheet-exported ingredient data, not arbitrary CSV.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function splitList(value: string): string[] {
  return value
    .split(/[;|]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Parses pasted/uploaded CSV text into ingredient rows. The header row is
 * required and determines column order — any of the known columns can be
 * omitted or reordered, unknown columns are ignored. Blank cells stay
 * blank (never coerced to 0), matching the app's never-fabricate-nutrition
 * convention everywhere else.
 */
export function parseIngredientsCsv(text: string): ParseIngredientsCsvResult {
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim().length > 0);
  const rows: ParsedIngredientRow[] = [];
  const skipped: ParseIngredientsCsvResult["skipped"] = [];

  if (lines.length === 0) return { rows, skipped };

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1;
    const fields = splitCsvLine(lines[i]);
    const byColumn: Partial<Record<Column, string>> = {};
    header.forEach((colName, idx) => {
      if ((COLUMNS as readonly string[]).includes(colName)) {
        byColumn[colName as Column] = fields[idx]?.trim() ?? "";
      }
    });

    const name = byColumn.name ?? "";
    if (!name) {
      skipped.push({ rowNumber, reason: "No name in this row" });
      continue;
    }

    const nutrition: Record<string, string | undefined> = {};
    for (const key of NUTRITION_COLUMNS) {
      const raw = byColumn[key];
      nutrition[key] = raw && raw !== "" ? raw : undefined;
    }

    rows.push({
      rowNumber,
      name,
      food_category: byColumn.food_category || undefined,
      state: byColumn.state || undefined,
      brand: byColumn.brand || undefined,
      allergens: byColumn.allergens ? splitList(byColumn.allergens) : [],
      alternative_names: byColumn.alternative_names ? splitList(byColumn.alternative_names) : [],
      notes: byColumn.notes || undefined,
      nutrition_reference_unit: byColumn.nutrition_reference_unit?.trim().toLowerCase() === "ml" ? "ml" : "g",
      nutrition_reference_amount:
        byColumn.nutrition_reference_amount && Number(byColumn.nutrition_reference_amount) > 0
          ? Number(byColumn.nutrition_reference_amount)
          : 100,
      nutrition,
    });
  }

  return { rows, skipped };
}
