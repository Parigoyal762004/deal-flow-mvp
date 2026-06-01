"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, XCircle, Loader2, FileText, AlertTriangle } from "lucide-react";

interface DealRow {
  startup_name: string;
  founder_name: string;
  founder_email: string;
  source?: string;
  industry?: string;
  stage?: string;
  website_url?: string;
  notes?: string;
}

interface RowResult {
  row: DealRow;
  status: "pending" | "submitting" | "done" | "error";
  error?: string;
}

const VALID_SOURCES = ["Backrr", "LinkedIn", "Referral", "Cold Outreach", "Event", "Other"];
const VALID_STAGES  = ["pre-seed", "seed", "series-a", "series-b", "growth"];

// Flexible column name mapping
const COL_MAP: Record<string, keyof DealRow> = {
  startup_name: "startup_name", startup: "startup_name", company: "startup_name", "company name": "startup_name", name: "startup_name",
  founder_name: "founder_name", founder: "founder_name", "founder name": "founder_name",
  founder_email: "founder_email", email: "founder_email", "founder email": "founder_email",
  source: "source",
  industry: "industry", sector: "industry",
  stage: "stage",
  website_url: "website_url", website: "website_url", url: "website_url",
  notes: "notes", note: "notes", comments: "notes",
};

function parseCSV(text: string): DealRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const mappedHeaders = headers.map(h => COL_MAP[h] ?? null);

  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) ?? [];
      const row: Partial<DealRow> = {};
      cols.forEach((val, i) => {
        const field = mappedHeaders[i];
        if (field) row[field] = val.replace(/^"|"$/g, "").trim();
      });
      return row as DealRow;
    })
    .filter(r => r.startup_name && r.founder_name && r.founder_email);
}

function normaliseSource(raw?: string): string {
  if (!raw) return "Other";
  const match = VALID_SOURCES.find(s => s.toLowerCase() === raw.toLowerCase());
  return match ?? "Other";
}

function normaliseStage(raw?: string): string {
  if (!raw) return "pre-seed";
  const cleaned = raw.toLowerCase().replace(/\s+/g, "-");
  const match = VALID_STAGES.find(s => s === cleaned);
  return match ?? "pre-seed";
}

export default function CSVUpload() {
  const [rows, setRows]       = useState<RowResult[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setDone(false);
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    if (file.size > 500_000) {
      setError("File too large. Keep it under 500KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) {
        setError("No valid rows found. Make sure your CSV has startup_name, founder_name, and founder_email columns.");
        return;
      }
      if (parsed.length > 100) {
        setError("Max 100 deals per upload.");
        return;
      }
      setRows(parsed.map(row => ({ row, status: "pending" })));
    };
    reader.readAsText(file);
  }

  async function submitAll() {
    setRunning(true);
    setDone(false);
    for (let i = 0; i < rows.length; i++) {
      setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: "submitting" } : r));
      try {
        const { row } = rows[i];
        const res = await fetch("/api/submit-deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startup_name:  row.startup_name,
            founder_name:  row.founder_name,
            founder_email: row.founder_email,
            source:        normaliseSource(row.source),
            industry:      row.industry ?? null,
            stage:         normaliseStage(row.stage),
            website_url:   row.website_url ?? null,
            notes:         row.notes ?? null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed");
        setRows(prev => prev.map((r, idx) => idx === i ? { ...r, status: "done" } : r));
      } catch (err) {
        setRows(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: "error", error: err instanceof Error ? err.message : "Failed" } : r
        ));
      }
      // Small delay between submissions — avoids hammering the server
      if (i < rows.length - 1) await new Promise(res => setTimeout(res, 800));
    }
    setRunning(false);
    setDone(true);
  }

  function reset() {
    setRows([]);
    setDone(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const doneCount  = rows.filter(r => r.status === "done").length;
  const errCount   = rows.filter(r => r.status === "error").length;
  const currentIdx = rows.findIndex(r => r.status === "submitting");

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700">Bulk Upload via CSV</h2>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Upload a CSV with columns: <code className="bg-slate-100 px-1 rounded">startup_name</code>, <code className="bg-slate-100 px-1 rounded">founder_name</code>, <code className="bg-slate-100 px-1 rounded">founder_email</code> (required) + <code className="bg-slate-100 px-1 rounded">source</code>, <code className="bg-slate-100 px-1 rounded">industry</code>, <code className="bg-slate-100 px-1 rounded">stage</code>, <code className="bg-slate-100 px-1 rounded">notes</code> (optional). Max 100 rows.
      </p>

      {!rows.length && (
        <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-slate-200 rounded-xl px-5 py-4 hover:border-brand-300 hover:bg-brand-50 transition-colors w-fit">
          <Upload className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">Choose CSV file</span>
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </label>
      )}

      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4">
          {/* Progress summary */}
          {running && (
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              Submitting deal {currentIdx + 1} of {rows.length}...
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700 font-medium">{doneCount} submitted</span>
              {errCount > 0 && <span className="text-red-600 ml-2">{errCount} failed</span>}
              <span className="text-slate-400 ml-2">— Check your team inbox for approval emails.</span>
            </div>
          )}

          {/* Deal list */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Startup</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Founder</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, i) => (
                  <tr key={i} className={r.status === "submitting" ? "bg-brand-50" : ""}>
                    <td className="px-4 py-2.5 font-medium text-slate-800 truncate max-w-[160px]">{r.row.startup_name}</td>
                    <td className="px-4 py-2.5 text-slate-600 truncate max-w-[140px]">{r.row.founder_name}</td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-[180px]">{r.row.founder_email}</td>
                    <td className="px-4 py-2.5 text-slate-500">{normaliseStage(r.row.stage)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.status === "pending"    && <span className="text-slate-400">Waiting</span>}
                      {r.status === "submitting" && <Loader2 className="w-4 h-4 animate-spin text-brand-500 ml-auto" />}
                      {r.status === "done"       && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                      {r.status === "error"      && (
                        <span className="text-red-500 text-xs" title={r.error}>Failed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            {!running && !done && (
              <button onClick={submitAll} className="btn-primary">
                Submit {rows.length} deal{rows.length !== 1 ? "s" : ""}
              </button>
            )}
            {(done || !running) && rows.length > 0 && (
              <button onClick={reset} className="text-sm text-slate-500 hover:text-slate-700">
                Upload another file
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
