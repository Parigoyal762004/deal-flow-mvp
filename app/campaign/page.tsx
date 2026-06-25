import { getCampaignStats, getCampaignLeads, DAILY_BATCH } from "@/lib/campaign";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import CampaignClient from "@/components/CampaignClient";

export const dynamic = "force-dynamic";

export default async function CampaignPage() {
  const [stats, leads, username] = await Promise.all([
    getCampaignStats(),
    getCampaignLeads(),
    getSessionUser(cookies().get(SESSION_COOKIE)?.value),
  ]);
  return <CampaignClient stats={stats} leads={leads} batchSize={DAILY_BATCH} currentUser={username ?? ""} />;
}
