"use server";
import { cookies } from "next/headers";
import {
  sendNextBatch, sendTestTo, getCampaignStats, getCampaignLeads,
  previewNextLeads, sendSelectedLeads, buildLeadPreviews, DAILY_BATCH,
} from "@/lib/campaign";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

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
    const res = await sendSelectedLeads(ids, operator, overrides);
    const [stats, leads] = await Promise.all([getCampaignStats(), getCampaignLeads()]);
    return { ok: true as const, res, stats, leads };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

const VALID_STATUSES = ["new", "sent", "replied", "bounced", "skipped", "suppressed"] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

export async function updateLeadStatusAction(id: string, status: LeadStatus) {
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
