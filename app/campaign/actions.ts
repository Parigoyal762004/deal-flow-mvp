"use server";
import { sendNextBatch, sendTestTo, getCampaignStats, DAILY_BATCH } from "@/lib/campaign";

export async function runBatchAction(count?: number) {
  try {
    const res = await sendNextBatch(count ?? DAILY_BATCH);
    const stats = await getCampaignStats();
    return { ok: true as const, res, stats };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function runTestAction(email: string) {
  if (!email || !email.includes("@")) return { ok: false as const, error: "Enter a valid email." };
  try {
    await sendTestTo(email.trim());
    return { ok: true as const };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}
