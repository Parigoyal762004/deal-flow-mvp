import { createServerClient } from "./supabase-server";
import { sendCampaignEmail, type CampaignLead } from "./campaign-email";

export const DAILY_BATCH = Number(process.env.CAMPAIGN_BATCH_SIZE ?? 20);

export interface CampaignStats {
  total: number;
  new: number;
  sent: number;
  replied: number;
  bounced: number;
  skipped: number;
  suppressed: number;
}

export async function getCampaignStats(): Promise<CampaignStats> {
  const supa = createServerClient();
  const statuses: (keyof CampaignStats)[] = ["new", "sent", "replied", "bounced", "skipped", "suppressed"];
  const out: CampaignStats = { total: 0, new: 0, sent: 0, replied: 0, bounced: 0, skipped: 0, suppressed: 0 };
  const { count: total } = await supa.from("leads").select("*", { count: "exact", head: true });
  out.total = total ?? 0;
  for (const s of statuses) {
    const { count } = await supa.from("leads").select("*", { count: "exact", head: true }).eq("status", s);
    out[s] = count ?? 0;
  }
  return out;
}

// ── MX check — drop dead domains before sending (bounces poison reputation) ────
const mxCache = new Map<string, boolean>();
async function domainHasMx(email: string): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (mxCache.has(domain)) return mxCache.get(domain)!;
  try {
    const dns = await import("node:dns/promises");
    const mx = await dns.resolveMx(domain);
    const ok = mx.length > 0;
    mxCache.set(domain, ok);
    return ok;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") { mxCache.set(domain, false); return false; }
    return true; // DNS itself flaky — don't punish the lead, let the send try
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface BatchResult { attempted: number; sent: number; skipped: number; failed: number; }

// Send the next N `new` leads. No per-mail review. Verifies, throttles, records.
export async function sendNextBatch(count = DAILY_BATCH): Promise<BatchResult> {
  const supa = createServerClient();
  const { data: leads, error } = await supa
    .from("leads")
    .select("id, company, first_name, email")
    .eq("status", "new")
    .order("created_at", { ascending: true })
    .limit(count);
  if (error) throw new Error(error.message);

  const res: BatchResult = { attempted: leads?.length ?? 0, sent: 0, skipped: 0, failed: 0 };

  for (const lead of leads ?? []) {
    // 1. verify the address; dead domain → skip (no send, no bounce)
    if (!(await domainHasMx(lead.email))) {
      await supa.from("leads").update({ status: "skipped", error: "no MX record" }).eq("id", lead.id);
      res.skipped++;
      continue;
    }
    // 2. send
    try {
      const cl: CampaignLead = { firstName: lead.first_name ?? "", company: lead.company, email: lead.email };
      const messageId = await sendCampaignEmail(cl);
      await supa.from("leads").update({ status: "sent", sent_at: new Date().toISOString(), message_id: messageId, error: null }).eq("id", lead.id);
      res.sent++;
    } catch (e) {
      await supa.from("leads").update({ status: "bounced", error: (e as Error).message?.slice(0, 300) }).eq("id", lead.id);
      res.failed++;
    }
    // 3. throttle — spread the batch, jittered, so it's not a burst
    await sleep(1200 + Math.random() * 1500);
  }
  return res;
}

// Send the exact template to one address (Pari's own) so she sees what goes out.
export async function sendTestTo(email: string): Promise<string> {
  return sendCampaignEmail({ firstName: "Pari", company: "Acme Exports (sample)", email });
}
