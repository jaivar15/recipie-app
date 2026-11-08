import { describe, expect, it } from "vitest";
import { extractRecipeJsonLd, mapJsonLdToRecipe, parseIngredientLine } from "./schema-org";

describe("parseIngredientLine", () => {
  it("extracts a whole number quantity and a known unit", () => {
    expect(parseIngredientLine("2 cups flour")).toEqual({
      ingredient_name: "flour",
      quantity: 2,
      unit: "cup",
      preparation_note: null,
    });
  });

  it("extracts a decimal quantity", () => {
    expect(parseIngredientLine("1.5 tbsp olive oil")).toEqual({
      ingredient_name: "olive oil",
      quantity: 1.5,
      unit: "tbsp",
      preparation_note: null,
    });
  });

  it("extracts a mixed-number fraction", () => {
    const result = parseIngredientLine("1 1/2 cup sugar");
    expect(result.quantity).toBeCloseTo(1.5);
    expect(result.unit).toBe("cup");
    expect(result.ingredient_name).toBe("sugar");
  });

  it("splits a trailing preparation note after a comma", () => {
    const result = parseIngredientLine("2 cups flour, sifted");
    expect(result.ingredient_name).toBe("flour");
    expect(result.preparation_note).toBe("sifted");
  });

  it("never fabricates a quantity or unit it can't find in the text", () => {
    expect(parseIngredientLine("Salt to taste")).toEqual({
      ingredient_name: "Salt to taste",
      quantity: null,
      unit: null,
      preparation_note: null,
    });
  });

  it("keeps an unrecognised unit word as part of the name rather than guessing", () => {
    const result = parseIngredientLine("3 large eggs");
    expect(result.quantity).toBe(3);
    expect(result.unit).toBeNull();
    expect(result.ingredient_name).toBe("large eggs");
  });
});

describe("extractRecipeJsonLd", () => {
  it("finds a Recipe node in a single JSON-LD block", () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe",
      name: "Test Soup",
    })}</script></head></html>`;
    const node = extractRecipeJsonLd(html);
    expect(node?.name).toBe("Test Soup");
  });

  it("finds a Recipe node inside an @graph array", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      "@graph": [{ "@type": "WebPage" }, { "@type": "Recipe", name: "Graph Recipe" }],
    })}</script>`;
    const node = extractRecipeJsonLd(html);
    expect(node?.name).toBe("Graph Recipe");
  });

  it("returns null when no Recipe node is present", () => {
    const html = `<script type="application/ld+json">${JSON.stringify({ "@type": "Article" })}</script>`;
    expect(extractRecipeJsonLd(html)).toBeNull();
  });

  it("tolerates malformed JSON-LD blocks and keeps looking", () => {
    const html = `
      <script type="application/ld+json">not valid json</script>
      <script type="application/ld+json">${JSON.stringify({ "@type": "Recipe", name: "Still Found" })}</script>
    `;
    expect(extractRecipeJsonLd(html)?.name).toBe("Still Found");
  });
});

describe("mapJsonLdToRecipe", () => {
  it("maps core fields, durations and servings", () => {
    const parsed = mapJsonLdToRecipe(
      {
        name: "Banana Bread",
        description: "Moist and simple.",
        author: { name: "Jane Doe" },
        prepTime: "PT15M",
        cookTime: "PT1H",
        recipeYield: "8 servings",
        recipeIngredient: ["2 cups flour", "1 cup sugar"],
        recipeInstructions: ["Mix.", "Bake."],
      },
      "https://example.com/banana-bread"
    );

    expect(parsed.title).toBe("Banana Bread");
    expect(parsed.authorName).toBe("Jane Doe");
    expect(parsed.prepTimeMinutes).toBe(15);
    expect(parsed.cookTimeMinutes).toBe(60);
    expect(parsed.servings).toBe(8);
    expect(parsed.ingredients).toHaveLength(2);
    expect(parsed.steps).toEqual([{ instruction: "Mix." }, { instruction: "Bake." }]);
  });

  it("flattens HowToStep objects and HowToSection groups", () => {
    const parsed = mapJsonLdToRecipe(
      {
        name: "Layered Recipe",
        recipeInstructions: [
          { "@type": "HowToStep", text: "Step one." },
          {
            "@type": "HowToSection",
            itemListElement: [
              { "@type": "HowToStep", text: "Step two." },
              { "@type": "HowToStep", text: "Step three." },
            ],
          },
        ],
      },
      "https://example.com/layered"
    );
    expect(parsed.steps.map((s) => s.instruction)).toEqual(["Step one.", "Step two.", "Step three."]);
  });

  it("never invents a value for fields missing from the source", () => {
    const parsed = mapJsonLdToRecipe({ name: "Bare Recipe" }, "https://example.com/bare");
    expect(parsed.prepTimeMinutes).toBeNull();
    expect(parsed.cookTimeMinutes).toBeNull();
    expect(parsed.servings).toBeNull();
    expect(parsed.ingredients).toEqual([]);
    expect(parsed.steps).toEqual([]);
  });
});
