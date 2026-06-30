import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import type { Deal, DDChecklistItem } from "@/lib/types";
import { DD_ITEMS } from "@/lib/dd-items";
import { DDChecklist } from "@/components/DDChecklist";

export const dynamic = "force-dynamic";

export default async function DDPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: dealData, error } = await supabase
    .from("deals")
    .select("id, startup_name, founder_name, stage, industry, meeting_held")
    .eq("id", id)
    .single();

  if (error || !dealData) notFound();
  const deal = dealData as Pick<Deal, "id" | "startup_name" | "founder_name" | "stage" | "industry" | "meeting_held">;

  // Gate: DD only available after a meeting has been held
  if (!deal.meeting_held) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Link href={`/dashboard/${id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to deal
        </Link>
        <div className="card p-10 text-center">
          <ClipboardCheck className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-700 mb-2">No meeting held yet</h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Due diligence is only available for companies you&apos;ve met with. Go back to the deal page and click{" "}
            <strong className="text-brand-600">Mark Meeting Held</strong> to unlock the checklist.
          </p>
          <Link
            href={`/dashboard/${id}`}
            className="inline-flex items-center gap-1.5 mt-6 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            ← Back to deal
          </Link>
        </div>
      </div>
    );
  }

  // Fetch or seed the checklist
  let { data: checklistRows } = await supabase
    .from("dd_checklist")
    .select("*")
    .eq("deal_id", id)
    .order("id");

  if (!checklistRows || checklistRows.length === 0) {
    const seed = DD_ITEMS.map((item) => ({
      deal_id: id,
      item_key: item.key,
      item_label: item.label,
      applicable_to: item.applicableTo,
      status: "pending" as const,
      notes: null,
    }));
    await supabase.from("dd_checklist").upsert(seed, { onConflict: "deal_id,item_key", ignoreDuplicates: true });
    const { data: seeded } = await supabase.from("dd_checklist").select("*").eq("deal_id", id).order("id");
    checklistRows = seeded ?? seed.map((s, i) => ({ ...s, id: String(i), updated_at: new Date().toISOString() }));
  }

  const items = (checklistRows ?? []) as DDChecklistItem[];
  const applicable = items.filter((i) => i.status !== "na");
  const received   = applicable.filter((i) => i.status === "received").length;
  const pct        = applicable.length > 0 ? Math.round((received / applicable.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Back */}
      <Link href={`/dashboard/${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to deal
      </Link>

      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-brand-600" />
              <h1 className="text-xl font-semibold text-slate-900">Due Diligence</h1>
            </div>
            <p className="text-sm text-slate-500">{deal.startup_name}</p>
            {deal.founder_name && (
              <p className="text-xs text-slate-400 mt-0.5">{deal.founder_name}{deal.stage ? ` · ${deal.stage.replace("-", " ")}` : ""}{deal.industry ? ` · ${deal.industry}` : ""}</p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${pct === 100 ? "text-emerald-600" : pct >= 60 ? "text-brand-600" : pct >= 30 ? "text-yellow-600" : "text-slate-400"}`}>
              {pct}%
            </p>
            <p className="text-xs text-slate-400">{received} of {applicable.length} received</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              pct === 100 ? "bg-emerald-500" : pct >= 60 ? "bg-brand-500" : pct >= 30 ? "bg-yellow-500" : "bg-slate-300"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <DDChecklist items={items} dealId={id} />
    </div>
  );
}
