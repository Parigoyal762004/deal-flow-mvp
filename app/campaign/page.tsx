import { getCampaignStats, DAILY_BATCH } from "@/lib/campaign";
import CampaignClient from "@/components/CampaignClient";

export const dynamic = "force-dynamic";

export default async function CampaignPage() {
  const stats = await getCampaignStats();
  return <CampaignClient stats={stats} batchSize={DAILY_BATCH} />;
}
