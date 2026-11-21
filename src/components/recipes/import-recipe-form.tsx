"use client";

import { useRef, useState, useTransition } from "react";
import { Link as LinkIcon, FileJson, Loader2, Sheet, Download } from "lucide-react";
import {
  importFromUrlAction,
  importFromJsonAction,
  importFromCsvAction,
  previewCsvImportAction,
} from "@/app/(app)/recipes/import/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type HouseholdOption = { id: string; name: string };

const CSV_TEMPLATE = `Title,Description,Servings,Prep Time,Cook Time,Ingredients,Steps
"Example Recipe","A short description of the dish",4,15,30,"# Sauce
2 tbsp soy sauce
1 tbsp sugar
# Stir-fry
200 g chicken
1 cup broccoli","# Make the sauce
Mix soy sauce and sugar.
# Cook
Stir-fry chicken then add broccoli and sauce."
`;

function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "recipe-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function ImportRecipeForm({ households }: { households: HouseholdOption[] }) {
  const [url, setUrl] = useState("");
  const [json, setJson] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [unmatchedIngredients, setUnmatchedIngredients] = useState<string[] | null>(null);
  const [ingredientsToCreate, setIngredientsToCreate] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState<"personal" | "household">(
    households.length > 0 ? "household" : "personal"
  );
  const [householdId, setHouseholdId] = useState(households[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        if (e instanceof Error && e.message !== "NEXT_REDIRECT") setError(e.message);
      }
    });
  }

  const visibilityControls = households.length > 0 ? (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label>Visibility</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as "personal" | "household")}>
          <SelectTrigger className="w-full">
            <SelectValue>{(v: string) => (v === "household" ? "Household — shared" : "Personal — only you")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Personal — only you</SelectItem>
            <SelectItem value="household">Household — shared</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {visibility === "household" ? (
        <div className="space-y-2">
          <Label>Household</Label>
          <Select value={householdId} onValueChange={(v) => setHouseholdId(v ?? "")}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: string) => households.find((h) => h.id === v)?.name ?? ""}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {households.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="url">
        <TabsList>
          <TabsTrigger value="url">From a URL</TabsTrigger>
          <TabsTrigger value="csv">From a CSV</TabsTrigger>
          <TabsTrigger value="json">From JSON</TabsTrigger>
        </TabsList>
        <TabsContent value="url" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="import-url">Recipe URL</Label>
            <Input
              id="import-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/recipes/pasta"
            />
            <p className="text-xs text-muted-foreground">
              Works with sites that publish structured recipe data (schema.org/Recipe) — most major recipe sites do.
            </p>
          </div>
          {visibilityControls}
          <Button
            disabled={!url.trim() || isPending || (visibility === "household" && !householdId)}
            onClick={() => run(() => importFromUrlAction(url, visibility, visibility === "household" ? householdId : null))}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
            Import from URL
          </Button>
        </TabsContent>
        <TabsContent value="csv" className="space-y-4 pt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="import-csv">Recipe CSV</Label>
              <Button type="button" variant="ghost" size="sm" onClick={downloadCsvTemplate}>
                <Download className="h-3.5 w-3.5" />
                Download template
              </Button>
            </div>
            <Input
              id="import-csv"
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              One row per recipe, with a <code>Title</code> column and optional <code>Description</code>,
              <code>Servings</code>, <code>Prep Time</code>, <code>Cook Time</code>, <code>Ingredients</code> and
              <code>Steps</code> columns — put one ingredient/step per line within its cell. Start a line with
              <code>#</code> (e.g. <code># Sauce</code>) to make it a section header instead of a regular
              ingredient/step. Multiple rows import all of them at once.
            </p>
          </div>
          {visibilityControls}

          {unmatchedIngredients && unmatchedIngredients.length > 0 ? (
            <div className="space-y-3 rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">
                  {unmatchedIngredients.length} ingredient
                  {unmatchedIngredients.length === 1 ? "" : "s"} not in your library
                </p>
                <p className="text-xs text-muted-foreground">
                  Check any to create now (just a name — add nutrition later). Leave unchecked to
                  import as plain text and link or create them whenever you like.
                </p>
              </div>
              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                {unmatchedIngredients.map((name) => (
                  <label key={name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={ingredientsToCreate.has(name)}
                      onCheckedChange={(checked) =>
                        setIngredientsToCreate((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(name);
                          else next.delete(name);
                          return next;
                        })
                      }
                    />
                    {name}
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIngredientsToCreate(new Set(unmatchedIngredients))}
                >
                  Create all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIngredientsToCreate(new Set())}
                >
                  Leave all for later
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => {
                    setUnmatchedIngredients(null);
                    setCsvText(null);
                    setIngredientsToCreate(new Set());
                  }}
                >
                  Cancel
                </Button>
                <Button
                  disabled={isPending || (visibility === "household" && !householdId)}
                  onClick={() =>
                    run(async () => {
                      if (!csvText) return;
                      await importFromCsvAction(
                        csvText,
                        visibility,
                        visibility === "household" ? householdId : null,
                        Array.from(ingredientsToCreate),
                      );
                      setCsvFile(null);
                      setCsvText(null);
                      setUnmatchedIngredients(null);
                      setIngredientsToCreate(new Set());
                      if (csvInputRef.current) csvInputRef.current.value = "";
                    })
                  }
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sheet className="h-4 w-4" />
                  )}
                  Continue import
                </Button>
              </div>
            </div>
          ) : (
            <Button
              disabled={!csvFile || isPending || (visibility === "household" && !householdId)}
              onClick={() =>
                run(async () => {
                  if (!csvFile) return;
                  const text = await readFileAsText(csvFile);
                  const preview = await previewCsvImportAction(text);
                  if (preview.unmatchedIngredientNames.length === 0) {
                    await importFromCsvAction(
                      text,
                      visibility,
                      visibility === "household" ? householdId : null,
                      [],
                    );
                    setCsvFile(null);
                    if (csvInputRef.current) csvInputRef.current.value = "";
                  } else {
                    setCsvText(text);
                    setUnmatchedIngredients(preview.unmatchedIngredientNames);
                  }
                })
              }
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sheet className="h-4 w-4" />
              )}
              Import from CSV
            </Button>
          )}
        </TabsContent>
        <TabsContent value="json" className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="import-json">Recipe JSON</Label>
            <Textarea
              id="import-json"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={10}
              placeholder='{"title": "...", "recipe_ingredients": [...], "recipe_steps": [...]}'
              className="font-mono text-xs"
            />
          </div>
          {visibilityControls}
          <Button
            disabled={!json.trim() || isPending || (visibility === "household" && !householdId)}
            onClick={() => run(() => importFromJsonAction(json, visibility, visibility === "household" ? householdId : null))}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            Import from JSON
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
