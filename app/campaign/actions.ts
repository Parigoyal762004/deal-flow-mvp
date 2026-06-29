"use server";
import { cookies } from "next/headers";
import {
  sendNextBatch, sendTestTo, getCampaignStats, getCampaignLeads,
  previewNextLeads, sendSelectedLeads, buildLeadPreviews, DAILY_BATCH,
} from "@/lib/campaign";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { clampText } from "@/lib/security";

async function currentOperator(): Promise<string | null> {
  return getSessionUser(cookies().get(SESSION_COOKIE)?.value);
}

export async function runBatchAction(count?: number) {
  try {
    const operator = await currentOperator();
    const res = await sendNextBatch(count ?? DAILY_BATCH, operator);
    const [stats, leads] = await Promise.all([getCampaignStats(), getCampaignLeads()]);
    return { ok: true as const, res, stats, leads };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function getLeadsAction() {
  try {
    const leads = await getCampaignLeads();
    return { ok: true as const, leads };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function runTestAction(email: string) {
  if (!email || !email.includes("@")) return { ok: false as const, error: "Enter a valid email." };
  try {
    const operator = await currentOperator();
    await sendTestTo(email.trim(), operator);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// Returns next N leads AND their rendered subject+body so the review panel can show them.
export async function previewBatchAction(count = 10) {
  try {
    const operator = await currentOperator();
    const leads = await previewNextLeads(count);
    const previews = buildLeadPreviews(leads, operator);
    return { ok: true as const, leads, previews };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// Send selected IDs with optional per-lead subject/text overrides (from review edits).
export async function sendSelectedAction(
  ids: string[],
  overrides?: Record<string, { subject: string; text: string }>,
) {
  if (!ids.length) return { ok: false as const, error: "No leads selected." };
  try {
    const operator = await currentOperator();
    // Clamp any operator-supplied overrides so they can't send huge payloads
    const safeOverrides = overrides
      ? Object.fromEntries(
          Object.entries(overrides).map(([id, ov]) => [
            id,
            { subject: clampText(ov.subject, 200), text: clampText(ov.text, 5000) },
          ])
        )
      : undefined;
    const res = await sendSelectedLeads(ids, operator, safeOverrides);
    const [stats, leads] = await Promise.all([getCampaignStats(), getCampaignLeads()]);
    return { ok: true as const, res, stats, leads };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

// Convert a replied campaign lead into a full deal in the pipeline.
export async function convertLeadToDealAction(leadId: string) {
  const operator = await currentOperator();
  if (!operator) return { ok: false as const, error: "Unauthorized." };

  const supa = createServerClient();

  // Fetch the lead
  const { data: lead, error: fetchErr } = await supa
    .from("leads")
    .select("id, company, first_name, email, status")
    .eq("id", leadId)
    .single();

  if (fetchErr || !lead) return { ok: false as const, error: "Lead not found." };

  // Check a deal for this email doesn't already exist
  const { data: existing } = await supa
    .from("deals")
    .select("id")
    .eq("founder_email", lead.email)
    .maybeSingle();

  if (existing) return { ok: false as const, error: "A deal for this email already exists.", dealId: existing.id };

  // Create the deal
  const token = crypto.randomUUID();
  const { data: deal, error: insertErr } = await supa
    .from("deals")
    .insert({
      startup_name:     lead.company,
      founder_name:     lead.first_name ?? "",
      founder_email:    lead.email,
      source:           "Cold Outreach",
      owner:            operator,
      approval_status:  "pending",
      email_status:     "pending",
      notes:            "Replied to Akro Ventures lending campaign email.",
      approval_token:   token,
      additional_links: [],
    })
    .select("id")
    .single();

  if (insertErr || !deal) return { ok: false as const, error: insertErr?.message ?? "Failed to create deal." };

  // Mark lead as converted so it doesn't show in the replies queue again
  await supa.from("leads").update({ status: "suppressed" }).eq("id", leadId);

  return { ok: true as const, dealId: deal.id };
}

const VALID_STATUSES = ["new", "sent", "replied", "bounced", "skipped", "suppressed"] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

export async function updateLeadStatusAction(id: string, status: LeadStatus) {
  const operator = await currentOperator();
  if (!operator) return { ok: false as const, error: "Unauthorized." };
  if (!id || !VALID_STATUSES.includes(status)) return { ok: false as const, error: "Invalid." };
  try {
    const supa = createServerClient();
    const { error } = await supa.from("leads").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
