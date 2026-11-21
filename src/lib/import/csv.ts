import {
  parseIngredientLine,
  isHeaderLine,
  stripHeaderMarker,
  type ParsedRecipe,
} from "@/lib/import/schema-org";

/**
 * Minimal RFC4180-ish CSV parser — handles quoted fields, embedded commas,
 * embedded newlines (common when a cell holds a whole ingredient/step list),
 * and doubled-quote escaping ("" -> "). Good enough for spreadsheet exports
 * (Excel/Sheets/Paprika etc.) without pulling in a dependency.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, "\n");

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

const COLUMN_ALIASES: Record<string, string[]> = {
  title: ["title", "name", "recipe", "recipe name"],
  description: ["description", "notes", "summary"],
  servings: ["servings", "serves", "yield"],
  prep_time_minutes: ["prep_time_minutes", "prep time", "prep time (min)", "prep time (minutes)"],
  cook_time_minutes: ["cook_time_minutes", "cook time", "cook time (min)", "cook time (minutes)"],
  ingredients: ["ingredients"],
  steps: ["steps", "directions", "instructions", "method"],
};

function findColumn(header: string[], key: string): number {
  const aliases = COLUMN_ALIASES[key];
  return header.findIndex((h) => aliases.includes(h.trim().toLowerCase()));
}

function firstNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/**
 * Parses a one-row-per-recipe CSV (the shape most spreadsheet/recipe-app
 * exports use: Title, Ingredients, Steps, ... with the latter two holding
 * newline-separated lists in a single cell) into one ParsedRecipe per row.
 */
export function parseRecipeCsv(csvText: string): ParsedRecipe[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw new Error("That CSV doesn't have any recipe rows");

  const header = rows[0];
  const titleCol = findColumn(header, "title");
  if (titleCol === -1) {
    throw new Error('The CSV needs a "Title" (or "Name") column');
  }
  const descCol = findColumn(header, "description");
  const servingsCol = findColumn(header, "servings");
  const prepCol = findColumn(header, "prep_time_minutes");
  const cookCol = findColumn(header, "cook_time_minutes");
  const ingredientsCol = findColumn(header, "ingredients");
  const stepsCol = findColumn(header, "steps");

  return rows.slice(1).map((row) => {
    const title = row[titleCol]?.trim();
    if (!title) throw new Error("Every row needs a title");

    const ingredientLines =
      ingredientsCol !== -1
        ? (row[ingredientsCol] ?? "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : [];
    const stepLines =
      stepsCol !== -1
        ? (row[stepsCol] ?? "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        : [];

    return {
      title,
      description: descCol !== -1 ? (row[descCol]?.trim() ?? null) || null : null,
      authorName: null,
      sourceUrl: "",
      prepTimeMinutes: prepCol !== -1 ? firstNumber(row[prepCol]) : null,
      cookTimeMinutes: cookCol !== -1 ? firstNumber(row[cookCol]) : null,
      servings: servingsCol !== -1 ? firstNumber(row[servingsCol]) : null,
      ingredients: ingredientLines.map((line) =>
        isHeaderLine(line)
          ? {
              ingredient_name: stripHeaderMarker(line),
              quantity: null,
              unit: null,
              preparation_note: null,
              is_section_header: true,
            }
          : parseIngredientLine(line),
      ),
      steps: stepLines.map((line) =>
        isHeaderLine(line)
          ? { instruction: stripHeaderMarker(line), is_section_header: true }
          : { instruction: line },
      ),
    };
  });
}
