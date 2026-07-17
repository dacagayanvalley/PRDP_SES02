import { useMemo, useState } from "react";
import { appendAudit, type AppDataset } from "../data/repositories";
import type { Subproject } from "../domain/types";

interface Props {
  dataset: AppDataset;
  actions: { save: (dataset: AppDataset, message?: string) => void };
}

type Preview = { valid: boolean; type: "json" | "csv"; message: string; dataset?: AppDataset; subprojects?: Subproject[]; errors: string[] };

export function ImportData({ dataset, actions }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [rawText, setRawText] = useState("");

  const summary = useMemo(() => preview?.dataset ? `${preview.dataset.subprojects.length} subprojects, ${preview.dataset.requirements.length} requirements` : preview?.subprojects ? `${preview.subprojects.length} subprojects` : "No preview", [preview]);

  async function handleFile(file?: File) {
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    setPreview(parseImport(text, file.name));
  }

  function previewText() {
    setPreview(parseImport(rawText, rawText.trim().startsWith("{") ? "backup.json" : "subprojects.csv"));
  }

  function commitImport() {
    if (!preview?.valid) return;
    if (preview.dataset) {
      if (!window.confirm("Import this full JSON backup and replace the current local dataset?")) return;
      actions.save(appendAudit(preview.dataset, { entityType: "Import", entityId: "dataset", action: "Imported full JSON dataset backup", actor: "Static MVP user" }), "Full JSON dataset imported");
      return;
    }
    if (preview.subprojects) {
      const existingCodes = new Set(dataset.subprojects.map((item) => item.code));
      const newRecords = preview.subprojects.filter((item) => !existingCodes.has(item.code));
      actions.save(appendAudit({ ...dataset, subprojects: [...newRecords, ...dataset.subprojects] }, { entityType: "Import", entityId: "subprojects", action: `Imported ${newRecords.length} CSV subproject(s)`, actor: "Static MVP user" }), `Imported ${newRecords.length} subproject(s); skipped ${preview.subprojects.length - newRecords.length} duplicate code(s)`);
    }
  }

  return (
    <div className="page-grid">
      <section className="panel span-2">
        <div className="section-heading"><div><h2>Import Data With Validation Preview</h2><p className="source">Use non-sensitive CSV/JSON only. Full JSON imports replace the local dataset after preview; CSV imports append new subprojects.</p></div><button disabled={!preview?.valid} onClick={commitImport}>Commit import</button></div>
        <div className="form-toolbar">
          <label>Import file<input type="file" accept=".json,.csv,text/csv,application/json" onChange={(event) => handleFile(event.target.files?.[0])} /></label>
          <button onClick={previewText}>Preview pasted text</button>
        </div>
        <textarea className="import-box" value={rawText} onChange={(event) => setRawText(event.target.value)} placeholder="Paste a SES-Track JSON backup or CSV with columns: code,title,component,type,proponent,province,municipality,stage,riskLevel" />
      </section>
      <section className="panel">
        <h2>Preview Result</h2>
        {!preview ? <p>No import preview yet.</p> : <><span className={preview.valid ? "status good" : "status bad"}>{preview.valid ? "Valid" : "Needs correction"}</span><p>{preview.message}</p><p className="source">{summary}</p>{preview.errors.map((error) => <div className="compact-card danger" key={error}>{error}</div>)}</>}
      </section>
      <section className="panel">
        <h2>CSV Template</h2>
        <pre className="code-block">code,title,component,type,proponent,province,municipality,stage,riskLevel
R02-IBUILD-DEMO-2026-0100,Demo FMR,IBUILD,Farm-to-Market Road,Demo LGU,Cagayan,Alcala,Draft,Moderate</pre>
      </section>
    </div>
  );
}

function parseImport(text: string, name: string): Preview {
  const trimmed = text.trim();
  if (!trimmed) return { valid: false, type: "csv", message: "Nothing to import.", errors: ["Paste text or select a file first."] };
  if (name.toLowerCase().endsWith(".json") || trimmed.startsWith("{")) return parseJson(trimmed);
  return parseCsv(trimmed);
}

function parseJson(text: string): Preview {
  try {
    const parsed = JSON.parse(text) as AppDataset;
    const errors = validateDataset(parsed);
    return { valid: errors.length === 0, type: "json", message: errors.length ? "JSON parsed but failed validation." : "Full JSON dataset backup is ready to import.", dataset: parsed, errors };
  } catch (error) {
    return { valid: false, type: "json", message: "JSON could not be parsed.", errors: [String(error)] };
  }
}

function parseCsv(text: string): Preview {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0] ?? "");
  const required = ["code", "title", "component", "type", "proponent", "province", "municipality"];
  const errors: string[] = required.filter((field) => !headers.includes(field)).map((field) => `Missing required CSV column: ${field}`);
  const records = lines.slice(1).map((line, index) => {
    const values = splitCsvLine(line);
    const row = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
    const missing = required.filter((field) => !row[field]);
    if (missing.length) errors.push(`Row ${index + 2}: missing ${missing.join(", ")}`);
    return {
      id: crypto.randomUUID(),
      code: row.code,
      title: row.title,
      component: (row.component || "IBUILD") as Subproject["component"],
      type: row.type,
      proponent: row.proponent,
      province: row.province,
      municipality: row.municipality,
      estimatedCostPhp: Number(row.estimatedCostPhp || 0),
      stage: (row.stage || "Draft") as Subproject["stage"],
      riskLevel: (row.riskLevel || "Moderate") as Subproject["riskLevel"],
      responsibleSes: row.responsibleSes || "Unassigned",
      sensitiveFlags: [],
      updatedAt: new Date().toISOString(),
    };
  });
  return { valid: errors.length === 0, type: "csv", message: errors.length ? "CSV parsed but failed validation." : "CSV subprojects are ready to append.", subprojects: records, errors };
}

function validateDataset(dataset: AppDataset): string[] {
  const errors: string[] = [];
  if (!Array.isArray(dataset.subprojects)) errors.push("Dataset must include subprojects array.");
  if (!Array.isArray(dataset.requirements)) errors.push("Dataset must include requirements array.");
  for (const [index, item] of (dataset.subprojects ?? []).entries()) {
    if (!item.code || !item.title) errors.push(`Subproject ${index + 1}: code and title are required.`);
  }
  return errors;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { current += '"'; i += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === "," && !quoted) { cells.push(current.trim()); current = ""; continue; }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}



