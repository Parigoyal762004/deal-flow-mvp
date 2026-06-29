"use server";
import { cookies } from "next/headers";
import { sendNextBatch, sendTestTo, getCampaignStats, getCampaignLeads, previewNextLeads, sendSelectedLeads, DAILY_BATCH } from "@/lib/campaign";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

// The campaign sends AS whoever is signed in (their mailbox, CC'd to them).
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

export async function previewBatchAction(count = 10) {
  try {
    const leads = await previewNextLeads(count);
    return { ok: true as const, leads };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function sendSelectedAction(ids: string[]) {
  if (!ids.length) return { ok: false as const, error: "No leads selected." };
  try {
    const operator = await currentOperator();
    const res = await sendSelectedLeads(ids, operator);
    const [stats, leads] = await Promise.all([getCampaignStats(), getCampaignLeads()]);
    return { ok: true as const, res, stats, leads };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
