/**
 * One-time / re-runnable import of the IndiaMART P1-Star lead CSV into `leads`.
 *
 *   npx tsx scripts/import-leads.ts "C:\\Users\\Admin\\Downloads\\Company Data Segmentation\\Leads_P1-Star_20260622.csv"
 *
 * Streams the file (never loads 41k rows into memory at once), maps the IndiaMART
 * columns, skips rows with no usable email, dedupes on email (ON CONFLICT DO
 * NOTHING), and batch-upserts. Re-running is safe — existing emails are skipped.
 */
import { createReadStream, readFileSync } from "fs";
import { createInterface } from "readline";
import { createClient } from "@supabase/supabase-js";

// ── env (read .env.local directly so the script needs no extra deps) ──────────
const env: Record<string, string> = {};
try {
  readFileSync(".env.local", "utf8").split("\n").forEach((l) => {
    const i = l.indexOf("=");
    if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, "");
  });
} catch { /* fall back to process.env */ }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supa = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// ── robust CSV line splitter (handles quotes + escaped "" + commas in fields) ──
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; }
      else q = !q;
    } else if (c === "," && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (s: string | undefined) => (s ?? "").trim();

type Row = Record<string, string>;
function mapRow(r: Row) {
  const email = clean(r["email1"]).toLowerCase();
  if (!EMAIL_RE.test(email)) return null; // skip rows with no usable primary email
  return {
    company:            clean(r["Company Name"]) || "(unknown)",
    first_name:         clean(r["First Name"]),
    last_name:          clean(r["Last name"]),
    designation:        clean(r["Designation"]),
    email,
    email2:             clean(r["email2"]).toLowerCase(),
    phone:              clean(r["mobile1"]) || clean(r["User Mobile Number"]),
    website:            clean(r["website"]),
    city:               clean(r["city"]),
    state:              clean(r["state"]),
    industry:           clean(r["glusr_usr_sellinterest"]),
    company_desc:       clean(r["glusr_usr_company_desc"]).slice(0, 2000),
    city_tier:          clean(r["City_Tier"]),
    industry_potential: clean(r["Industry_Potential"]),
    contact_readiness:  clean(r["Contact_Readiness"]),
    priority:           clean(r["Pareto_Priority"]),
  };
}

async function flush(batch: ReturnType<typeof mapRow>[]) {
  const rows = batch.filter((r): r is NonNullable<typeof r> => r !== null);
  if (!rows.length) return 0;
  // upsert on the unique email; ignore duplicates so re-runs are safe
  const { error } = await supa.from("leads").upsert(rows, { onConflict: "email", ignoreDuplicates: true });
  if (error) { console.error("  batch error:", error.message); return 0; }
  return rows.length;
}

async function main() {
  const file = process.argv[2];
  if (!file) { console.error("Usage: tsx scripts/import-leads.ts <path-to-csv>"); process.exit(1); }

  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let headers: string[] | null = null;
  let batch: ReturnType<typeof mapRow>[] = [];
  let seen = 0, kept = 0, sent = 0;
  const localSeen = new Set<string>(); // in-file dedupe before hitting the DB

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!headers) { headers = splitCsv(line).map((h) => h.trim()); continue; }
    seen++;
    const vals = splitCsv(line);
    const r: Row = {};
    headers.forEach((h, i) => (r[h] = vals[i] ?? ""));
    const mapped = mapRow(r);
    if (!mapped) continue;
    if (localSeen.has(mapped.email)) continue;
    localSeen.add(mapped.email);
    batch.push(mapped);
    kept++;
    if (batch.length >= 500) { sent += await flush(batch); batch = []; process.stdout.write("."); }
  }
  sent += await flush(batch);
  console.log(`\nDone. Rows read: ${seen} · with valid email (deduped): ${kept} · upserted: ${sent}`);
  const { count } = await supa.from("leads").select("*", { count: "exact", head: true });
  console.log(`leads table now holds: ${count}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
