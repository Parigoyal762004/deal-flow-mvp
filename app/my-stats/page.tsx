import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";
import MyStatsClient from "@/components/MyStatsClient";

export const dynamic = "force-dynamic";

export default async function MyStatsPage() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const username = await getSessionUser(token);
  if (!username) redirect("/login");

  const supa = createServerClient();

  // Time anchors (compare against sent_at which is stored as UTC ISO strings)
  const now       = new Date();
  const todayUTC  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow       = now.getUTCDay(); // 0 = Sunday
  const daysBack  = dow === 0 ? 6 : dow - 1; // back to Monday
  const weekStart = new Date(todayUTC.getTime() - daysBack * 86400000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [leadsRes, dealsRes, goalRes] = await Promise.all([
    supa
      .from("leads")
      .select("status, sent_at")
      .eq("sent_by", username)
      .not("sent_at", "is", null),
    supa
      .from("deals")
      .select("created_at")
      .eq("owner", username),
    supa
      .from("user_goals")
      .select("weekly_email_goal")
      .eq("username", username)
      .maybeSingle(),
  ]);

  const allLeads = leadsRes.data ?? [];
  const allDeals = dealsRes.data ?? [];
  const weeklyGoal = goalRes.data?.weekly_email_goal ?? 0;

  function inPeriod(isoStr: string | null, since: Date) {
    if (!isoStr) return false;
    return new Date(isoStr) >= since;
  }

  const todayLeads  = allLeads.filter(l => inPeriod(l.sent_at, todayUTC));
  const weekLeads   = allLeads.filter(l => inPeriod(l.sent_at, weekStart));
  const monthLeads  = allLeads.filter(l => inPeriod(l.sent_at, monthStart));

  const stats = {
    today: {
      sent:    todayLeads.length,
      replied: todayLeads.filter(l => l.status === "replied").length,
    },
    week: {
      sent:    weekLeads.length,
      replied: weekLeads.filter(l => l.status === "replied").length,
    },
    month: {
      sent:    monthLeads.length,
      replied: monthLeads.filter(l => l.status === "replied").length,
    },
    total: {
      sent:    allLeads.length,
      replied: allLeads.filter(l => l.status === "replied").length,
    },
    deals: {
      thisWeek:  allDeals.filter(d => inPeriod(d.created_at, weekStart)).length,
      thisMonth: allDeals.filter(d => inPeriod(d.created_at, monthStart)).length,
      total:     allDeals.length,
    },
    weeklyGoal,
    username,
    weekStartISO: weekStart.toISOString(),
  };

  return <MyStatsClient stats={stats} />;
}
