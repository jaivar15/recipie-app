import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EXPORT_FIELDS = `
  id, title, description, source, source_url, author_name, prep_time_minutes, cook_time_minutes,
  resting_time_minutes, servings, serving_size, finished_weight_grams, difficulty, cuisine, meal_type,
  cooking_method, equipment, dietary_labels, dietary_labels_verified,
  recipe_ingredients(position, ingredient_name, quantity, unit, preparation_note, brand, is_section_header),
  recipe_steps(position, instruction, duration_minutes, temperature_celsius, equipment, tip, is_section_header)
`;

function toCsv(rows: string[][]): string {
  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "json";

  const supabase = await createClient();
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(EXPORT_FIELDS)
    .eq("id", id)
    .maybeSingle();
  if (error || !recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const slug =
    recipe.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "recipe";

  if (format === "csv") {
    const rows: string[][] = [["Type", "Position", "Detail", "Quantity", "Unit", "Notes"]];
    for (const ing of recipe.recipe_ingredients) {
      rows.push([
        ing.is_section_header ? "Section" : "Ingredient",
        String(ing.position + 1),
        ing.ingredient_name,
        ing.quantity != null ? String(ing.quantity) : "",
        ing.unit ?? "",
        [ing.preparation_note, ing.brand].filter(Boolean).join(" "),
      ]);
    }
    for (const step of recipe.recipe_steps) {
      rows.push([
        step.is_section_header ? "Section" : "Step",
        String(step.position + 1),
        step.instruction,
        "",
        "",
        step.tip ?? "",
      ]);
    }
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${slug}.csv"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(recipe, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${slug}.json"`,
    },
  });
}
