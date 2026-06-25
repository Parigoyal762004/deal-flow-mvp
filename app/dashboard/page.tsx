import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { USERS } from "@/lib/users";
import type { Deal } from "@/lib/types";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const currentUser = await getSessionUser(cookies().get(SESSION_COOKIE)?.value);

  const supabase = createServerClient();
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          Failed to load deals: {error.message}
        </div>
      </div>
    );
  }

  const rows = (deals ?? []) as Deal[];

  // ── DD completion % per deal ─────────────────────────────────────────
  const ddPctByDeal: Record<string, number> = {};
  if (rows.length > 0) {
    const { data: checklistRows } = await supabase
      .from("dd_checklist")
      .select("deal_id, status")
      .in("deal_id", rows.map((d) => d.id));

    if (checklistRows && checklistRows.length > 0) {
      for (const deal of rows) {
        const items = checklistRows.filter((r) => r.deal_id === deal.id);
        const applicable = items.filter((r) => r.status !== "na");
        const received = applicable.filter((r) => r.status === "received");
        if (applicable.length > 0) {
          ddPctByDeal[deal.id] = Math.round((received.length / applicable.length) * 100);
        }
      }
    }
  }

  return (
    <DashboardClient
      deals={rows}
      ddPctByDeal={ddPctByDeal}
      currentUser={currentUser}
      owners={USERS.map((u) => ({ username: u.username, displayName: u.displayName }))}
    />
  );
}
