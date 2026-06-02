"use client";

import { useState, useRef } from "react";
import { Upload, CheckCircle, Loader2, FileText, AlertTriangle, Search } from "lucide-react";

interface DealRow {
  startup_name: string;
  founder_name: string;
  founder_email: string;
  source?: string;
  industry?: string;
  stage?: string;
  website_url?: string;
  notes?: string;
  emailEstimated?: boolean; // true if this email is a guess, needs verification
}

interface RowResult {
  row: DealRow;
  status: "pending" | "submitting" | "done" | "error";
  error?: string;
}

const VALID_SOURCES = ["Backrr", "LinkedIn", "Referral", "Cold Outreach", "Event", "Other"];
const VALID_STAGES  = ["pre-seed", "seed", "series-a", "series-b", "growth"];

const COL_MAP: Record<string, keyof DealRow> = {
  startup_name: "startup_name", startup: "startup_name", company: "startup_name",
  "company name": "startup_name", name: "startup_name", company_name: "startup_name",
  founder_name: "founder_name", founder: "founder_name", "founder name": "founder_name",
  founder_email: "founder_email", email: "founder_email", "founder email": "founder_email",
  estimated_email: "founder_email", "estimated email": "founder_email",
  source: "source",
  industry: "industry", sector: "industry",
  stage: "stage", last_funding_round: "stage", "last funding round": "stage", "funding round": "stage",
  website_url: "website_url", website: "website_url", url: "website_url",
  source_url: "website_url", "source url": "website_url",
  notes: "notes", note: "notes", comments: "notes",
  akro_rationale: "notes", why_akro: "notes", "why akro": "notes",
  growth_signal: "notes", "growth signal": "notes",
};

function mapFundingStage(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.includes("series b") || s.includes("series-b")) return "series-b";
  if (s.includes("series a") || s.includes("series-a")) return "series-a";
  if (s.includes("seed"))   return "seed";
  if (s.includes("pre"))    return "pre-seed";
  if (s.includes("growth") || s.includes("series c") || s.includes("pre-ipo") || s.includes("ipo")) return "growth";
  return "seed";
}

// Detect if an email looks like a guess: firstname@companydomain.com pattern
function isEmailEstimated(email: string, founderName: string, websiteUrl?: string, fromEstimatedCol?: boolean): boolean {
  if (fromEstimatedCol) return true;
  const localPart  = email.split("@")[0].toLowerCase();
  const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const firstName  = founderName.split(" ")[0].toLowerCase();
  const lastName   = (founderName.split(" ").slice(-1)[0] ?? "").toLowerCase();

  const namePatterns = [
    firstName,
    `${firstName}.${lastName}`,
    `${firstName}${lastName}`,
    `${firstName[0]}${lastName}`,
    `${firstName}.${lastName[0]}`,
  ];
  const isNameBased = namePatterns.includes(localPart);

  let domainMatchesWebsite = false;
  if (websiteUrl) {
    const wd = websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    domainMatchesWebsite = emailDomain === wd;
  }

  return isNameBased && (domainMatchesWebsite || emailDomain.length > 0);
}

function parseCSV(text: string): DealRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const rawHeaders = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const mappedHeaders = rawHeaders.map(h => COL_MAP[h] ?? null);
  // Track if the file uses "estimated_email" column name
  const hasEstimatedCol = rawHeaders.includes("estimated_email") || rawHeaders.includes("estimated email");

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
    .filter(r => r.startup_name && r.founder_name && r.founder_email)
    .map(row => ({
      ...row,
      emailEstimated: isEmailEstimated(row.founder_email, row.founder_name, row.website_url, hasEstimatedCol),
    }));
}

function normaliseSource(raw?: string): string {
  if (!raw) return "Other";
  return VALID_SOURCES.find(s => s.toLowerCase() === raw.toLowerCase()) ?? "Other";
}

function normaliseStage(raw?: string): string {
  if (!raw) return "seed";
  const cleaned = raw.toLowerCase().replace(/\s+/g, "-");
  return VALID_STAGES.find(s => s === cleaned) ?? mapFundingStage(raw);
}

function hunterUrl(email: string, websiteUrl?: string): string {
  const domain = websiteUrl
    ? websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    : email.split("@")[1] ?? "";
  return `https://hunter.io/search/${domain}`;
}

const TEMPLATE_CSV = `startup_name,founder_name,founder_email,source,industry,stage,website_url,notes
Acme Corp,John Smith,john@acme.com,LinkedIn,SaaS,seed,https://acme.com,Strong traction
XYZ Health,Priya Sharma,priya@xyz.in,Referral,Healthtech,series-a,https://xyz.in,`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: "akro_deal_template.csv" });
  a.click();
  URL.revokeObjectURL(url);
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
    if (!file.name.endsWith(".csv")) { setError("Please upload a .csv file."); return; }
    if (file.size > 500_000) { setError("File too large. Keep it under 500KB."); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (!parsed.length) {
        setError("No valid rows found. Make sure your CSV has startup_name, founder_name, and founder_email columns.");
        return;
      }
      if (parsed.length > 100) { setError("Max 100 deals per upload."); return; }
      setRows(parsed.map(row => ({ row, status: "pending" })));
    };
    reader.readAsText(file);
  }

  // Update email inline
  function updateEmail(idx: number, email: string) {
    setRows(prev => prev.map((r, i) =>
      i === idx ? { ...r, row: { ...r.row, founder_email: email, emailEstimated: false } } : r
    ));
  }

  async function submitAll() {
    setRunning(true);
    setDone(false);
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].row.emailEstimated) continue; // skip unverified
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

  const estimatedCount = rows.filter(r => r.row.emailEstimated).length;
  const readyCount     = rows.filter(r => !r.row.emailEstimated).length;
  const doneCount      = rows.filter(r => r.status === "done").length;
  const errCount       = rows.filter(r => r.status === "error").length;
  const currentIdx     = rows.findIndex(r => r.status === "submitting");

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center gap-2 mb-1">
        <FileText className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-700">Bulk Upload via CSV</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Required columns: <code className="bg-slate-100 px-1 rounded">startup_name</code>, <code className="bg-slate-100 px-1 rounded">founder_name</code>, <code className="bg-slate-100 px-1 rounded">founder_email</code>. Optional: <code className="bg-slate-100 px-1 rounded">source</code>, <code className="bg-slate-100 px-1 rounded">industry</code>, <code className="bg-slate-100 px-1 rounded">stage</code>, <code className="bg-slate-100 px-1 rounded">notes</code>. Max 100 rows.
      </p>

      <div className="mb-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 text-xs text-amber-800 leading-relaxed">
        <strong>Pipeline output?</strong> Columns like <code className="bg-amber-100 px-1 rounded">company_name</code>, <code className="bg-amber-100 px-1 rounded">estimated_email</code>, <code className="bg-amber-100 px-1 rounded">sector</code>, <code className="bg-amber-100 px-1 rounded">last_funding_round</code>, <code className="bg-amber-100 px-1 rounded">akro_rationale</code> are automatically mapped. Estimated emails will be flagged — verify before submitting.
      </div>

      <button onClick={downloadTemplate} className="text-xs text-brand-600 hover:text-brand-700 underline underline-offset-2 mb-4 block">
        Download blank template CSV
      </button>

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
          {/* Summary banner */}
          {estimatedCount > 0 && !running && !done && (
            <div className="flex items-start gap-2 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <strong>{estimatedCount} email{estimatedCount !== 1 ? "s" : ""} look estimated</strong> and will be skipped until verified.
                Find the real address on Hunter.io and type it in directly. {readyCount > 0 && <span className="text-green-700">{readyCount} ready to submit.</span>}
              </span>
            </div>
          )}

          {running && (
            <div className="flex items-center gap-2 mb-3 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              Submitting deal {currentIdx + 1} of {readyCount}...
            </div>
          )}
          {done && (
            <div className="flex items-center gap-2 mb-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-green-700 font-medium">{doneCount} submitted</span>
              {errCount > 0 && <span className="text-red-600 ml-2">{errCount} failed</span>}
              {estimatedCount > 0 && <span className="text-amber-600 ml-2">{estimatedCount} skipped (unverified email)</span>}
            </div>
          )}

          {/* Deal table */}
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
                  <tr key={i} className={
                    r.status === "submitting" ? "bg-brand-50" :
                    r.row.emailEstimated ? "bg-amber-50/40" : ""
                  }>
                    <td className="px-4 py-2.5 font-medium text-slate-800 truncate max-w-[140px]">{r.row.startup_name}</td>
                    <td className="px-4 py-2.5 text-slate-600 truncate max-w-[120px]">{r.row.founder_name}</td>
                    <td className="px-3 py-2 max-w-[220px]">
                      {r.row.emailEstimated && r.status === "pending" ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                            <input
                              type="email"
                              defaultValue={r.row.founder_email}
                              placeholder="Paste verified email..."
                              onBlur={e => updateEmail(i, e.target.value)}
                              className="text-xs border border-amber-300 rounded px-2 py-1 w-full focus:outline-none focus:border-brand-400 bg-white"
                            />
                          </div>
                          <a
                            href={hunterUrl(r.row.founder_email, r.row.website_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 ml-4"
                          >
                            <Search className="w-3 h-3" />
                            Find it on Hunter.io
                          </a>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs truncate block">{r.row.founder_email}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{normaliseStage(r.row.stage)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.status === "pending" && r.row.emailEstimated && <span className="text-amber-500 text-xs font-medium">Verify email</span>}
                      {r.status === "pending" && !r.row.emailEstimated && <span className="text-slate-400 text-xs">Ready</span>}
                      {r.status === "submitting" && <Loader2 className="w-4 h-4 animate-spin text-brand-500 ml-auto" />}
                      {r.status === "done"       && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                      {r.status === "error"      && <span className="text-red-500 text-xs" title={r.error}>Failed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            {!running && !done && readyCount > 0 && (
              <button onClick={submitAll} className="btn-primary">
                Submit {readyCount} deal{readyCount !== 1 ? "s" : ""}
                {estimatedCount > 0 && <span className="ml-1 opacity-60 text-xs">({estimatedCount} skipped)</span>}
              </button>
            )}
            {!running && !done && readyCount === 0 && estimatedCount > 0 && (
              <p className="text-sm text-amber-700">Verify the emails above before submitting.</p>
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
