"use client";

import { useRef, useState, useTransition } from "react";
import { Upload, Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { bulkImportIngredientsAction, type BulkImportResult } from "@/app/(app)/ingredients/import/actions";
import { INGREDIENTS_CSV_TEMPLATE_HEADER } from "@/lib/import/ingredients-csv";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type HouseholdOption = { id: string; name: string };

const TEMPLATE_EXAMPLE = `${INGREDIENTS_CSV_TEMPLATE_HEADER}
Chicken breast,Meat & poultry,raw,,,,,165,31,0,3.6,1,0,0,74,,,,,
Brown rice,Grains & cereals,cooked,,,,,112,2.6,24,0.9,0.2,1.8,0.4,5,,,,,`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_EXAMPLE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ingredients-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportIngredientsForm({ households }: { households: HouseholdOption[] }) {
  const [csv, setCsv] = useState("");
  const [visibility, setVisibility] = useState<"personal" | "household">(
    households.length > 0 ? "household" : "personal"
  );
  const [householdId, setHouseholdId] = useState(households[0]?.id ?? "");
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  function handleSubmit() {
    setError(null);
    setResult(null);
    if (!csv.trim()) return;
    startTransition(async () => {
      try {
        const res = await bulkImportIngredientsAction(
          csv,
          visibility,
          visibility === "household" ? householdId : null
        );
        setResult(res);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      {households.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "personal" | "household")}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(v: string) => (v === "household" ? "Household — shared" : "Personal — only you")}
                </SelectValue>
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
                  <SelectValue>{(v: string) => households.find((h) => h.id === v)?.name ?? "Choose"}</SelectValue>
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
      ) : null}

      <div className="flex items-center justify-between">
        <Label htmlFor="csv-input">CSV data</Label>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-3.5 w-3.5" />
            Download template
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" />
            Upload file
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </div>
      <Textarea
        id="csv-input"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        placeholder={"name,food_category,calories_kcal,protein_g,...\nChicken breast,Meat & poultry,165,31"}
        rows={12}
        className="font-mono text-xs"
      />
      <p className="text-xs text-muted-foreground">
        First row must be a header. Columns: name (required), food_category, state (raw/cooked), brand,
        allergens, alternative_names, notes, and the usual nutrition fields per 100g — any can be left blank.
        Separate multiple allergens or alternative names with <code>;</code>.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Import failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? <ImportResultSummary result={result} /> : null}

      <Button type="button" onClick={handleSubmit} disabled={isPending || !csv.trim()}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isPending ? "Importing…" : "Import ingredients"}
      </Button>
    </div>
  );
}

function ImportResultSummary({ result }: { result: BulkImportResult }) {
  const { created, failed, skipped } = result;
  return (
    <div className="space-y-2">
      {created.length > 0 ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>
            {created.length} ingredient{created.length === 1 ? "" : "s"} imported
          </AlertTitle>
        </Alert>
      ) : null}
      {failed.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {failed.length} row{failed.length === 1 ? "" : "s"} failed
          </AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {failed.map((f) => (
                <li key={f.rowNumber}>
                  Row {f.rowNumber} ({f.name || "unnamed"}): {f.error}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
      {skipped.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {skipped.length} row{skipped.length === 1 ? "" : "s"} skipped
          </AlertTitle>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-0.5">
              {skipped.map((s) => (
                <li key={s.rowNumber}>
                  Row {s.rowNumber}: {s.reason}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
