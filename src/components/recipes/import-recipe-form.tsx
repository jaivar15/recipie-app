"use client";

import { useRef, useState, useTransition } from "react";
import { Link as LinkIcon, FileJson, Loader2, Sheet } from "lucide-react";
import {
  importFromUrlAction,
  importFromJsonAction,
  importFromCsvAction,
} from "@/app/(app)/recipes/import/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
            <Label htmlFor="import-csv">Recipe CSV</Label>
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
          <Button
            disabled={!csvFile || isPending || (visibility === "household" && !householdId)}
            onClick={() =>
              run(async () => {
                if (!csvFile) return;
                const csvText = await readFileAsText(csvFile);
                await importFromCsvAction(csvText, visibility, visibility === "household" ? householdId : null);
                setCsvFile(null);
                if (csvInputRef.current) csvInputRef.current.value = "";
              })
            }
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sheet className="h-4 w-4" />}
            Import from CSV
          </Button>
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
