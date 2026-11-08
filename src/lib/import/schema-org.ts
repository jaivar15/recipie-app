import { MEASUREMENT_UNITS } from "@/lib/validations/recipe";

type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];

const UNIT_ALIASES: Record<string, MeasurementUnit> = {
  g: "g", gram: "g", grams: "g",
  kg: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", millilitre: "ml", millilitres: "ml", milliliter: "ml", milliliters: "ml",
  l: "l", litre: "l", litres: "l", liter: "l", liters: "l",
  tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
  tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
  cup: "cup", cups: "cup",
  piece: "piece", pieces: "piece",
  slice: "slice", slices: "slice",
  clove: "clove", cloves: "clove",
};

const FRACTIONS: Record<string, number> = { "1/4": 0.25, "1/3": 0.33, "1/2": 0.5, "2/3": 0.67, "3/4": 0.75 };

export type ParsedIngredient = {
  ingredient_name: string;
  quantity: number | null;
  unit: MeasurementUnit | null;
  preparation_note: string | null;
};

/** Best-effort parse of a free-text ingredient line into qty/unit/name — only
 * extracts what's textually present, never infers or fabricates values. */
export function parseIngredientLine(raw: string): ParsedIngredient {
  const text = raw.trim();
  const match = text.match(
    /^((?:\d+\s+)?(?:\d+\/\d+|\d+(?:\.\d+)?))\s*([a-zA-Z]+)?\s*(.*)$/
  );
  if (!match) return { ingredient_name: text, quantity: null, unit: null, preparation_note: null };

  const [, qtyRaw, unitRaw, rest] = match;
  let quantity: number | null = null;
  if (qtyRaw.includes("/") || / \d+\/\d+$/.test(qtyRaw)) {
    const parts = qtyRaw.split(" ");
    const whole = parts.length > 1 ? Number(parts[0]) : 0;
    const frac = FRACTIONS[parts[parts.length - 1]] ?? 0;
    quantity = whole + frac;
  } else {
    quantity = Number(qtyRaw);
  }
  if (Number.isNaN(quantity)) quantity = null;

  const unit = unitRaw ? (UNIT_ALIASES[unitRaw.toLowerCase()] ?? null) : null;
  const name = unit ? rest : [unitRaw, rest].filter(Boolean).join(" ");
  const [ingredient_name, ...noteParts] = name.split(",");

  return {
    ingredient_name: ingredient_name.trim() || text,
    quantity,
    unit,
    preparation_note: noteParts.join(",").trim() || null,
  };
}

function parseIsoDuration(iso: string | undefined): number | null {
  if (!iso) return null;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return null;
  const hours = Number(m[1] ?? 0);
  const minutes = Number(m[2] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

function flattenInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  if (typeof instructions === "string") {
    return instructions.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean);
  }
  if (Array.isArray(instructions)) {
    return instructions.flatMap((item) => {
      if (typeof item === "string") return [item];
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (obj["@type"] === "HowToSection" && Array.isArray(obj.itemListElement)) {
          return flattenInstructions(obj.itemListElement);
        }
        if (typeof obj.text === "string") return [obj.text];
        if (typeof obj.name === "string") return [obj.name];
      }
      return [];
    });
  }
  return [];
}

function parseYield(y: unknown): number | null {
  const raw = Array.isArray(y) ? y[0] : y;
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const match = String(raw).match(/\d+/);
  return match ? Number(match[0]) : null;
}

export type ParsedRecipe = {
  title: string;
  description: string | null;
  authorName: string | null;
  sourceUrl: string;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  servings: number | null;
  ingredients: ParsedIngredient[];
  steps: { instruction: string }[];
};

/** Extracts the first schema.org Recipe node from a page's JSON-LD blocks. */
export function extractRecipeJsonLd(html: string): Record<string, unknown> | null {
  const blocks = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      for (const node of candidates as Record<string, unknown>[]) {
        const type = node["@type"];
        const types = Array.isArray(type) ? type : [type];
        if (types.includes("Recipe")) return node;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export function mapJsonLdToRecipe(node: Record<string, unknown>, sourceUrl: string): ParsedRecipe {
  const author = node.author as { name?: string } | { name?: string }[] | string | undefined;
  const authorName = Array.isArray(author) ? (author[0]?.name ?? null) : typeof author === "object" ? (author?.name ?? null) : (author ?? null);

  const ingredientLines = (node.recipeIngredient ?? node.ingredients ?? []) as string[];

  return {
    title: typeof node.name === "string" ? node.name : "Imported recipe",
    description: typeof node.description === "string" ? node.description : null,
    authorName,
    sourceUrl,
    prepTimeMinutes: parseIsoDuration(node.prepTime as string | undefined),
    cookTimeMinutes: parseIsoDuration(node.cookTime as string | undefined),
    servings: parseYield(node.recipeYield),
    ingredients: ingredientLines.map(parseIngredientLine),
    steps: flattenInstructions(node.recipeInstructions).map((instruction) => ({ instruction })),
  };
}
