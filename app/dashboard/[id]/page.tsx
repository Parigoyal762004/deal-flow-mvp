import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Deal, DDChecklistItem } from "@/lib/types";
import { DD_ITEMS } from "@/lib/dd-items";
import { formatDate, statusColor } from "@/lib/utils";
import { BarChart3, ArrowLeft, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import DealDetailActions from "@/components/DealDetailActions";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  // ── 1. Fetch the deal ───────────────────────────────────────────────
  const { data: dealData, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !dealData) notFound();
  const deal = dealData as Deal;

  // ── 2. Fetch (and lazily seed) DD checklist rows ────────────────────
  let { data: checklistRows } = await supabase
    .from("dd_checklist")
    .select("*")
    .eq("deal_id", id)
    .order("id");

  if (!checklistRows || checklistRows.length === 0) {
    // Seed all 26 items for legacy deals that pre-date this feature
    const seed = DD_ITEMS.map((item) => ({
      deal_id: id,
      item_key: item.key,
      item_label: item.label,
      applicable_to: item.applicableTo,
      status: "pending" as const,
      notes: null,
    }));

    await supabase.from("dd_checklist").upsert(seed, {
      onConflict: "deal_id,item_key",
      ignoreDuplicates: true,
    });

    const { data: seeded } = await supabase
      .from("dd_checklist")
      .select("*")
      .eq("deal_id", id)
      .order("id");

    checklistRows = seeded ?? seed.map((s, i) => ({ ...s, id: String(i), updated_at: new Date().toISOString() }));
  }

  const checklistItems = (checklistRows ?? []) as DDChecklistItem[];

  // ── Completion % for header badge ────────────────────────────────────
  const applicable = checklistItems.filter((i) => i.status !== "na");
  const receivedCount = applicable.filter((i) => i.status === "received").length;
  const ddPct = applicable.length > 0 ? Math.round((receivedCount / applicable.length) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">

      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pipeline
      </Link>

      {/* Deal header */}
      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand-600 flex-shrink-0" />
              {deal.startup_name}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {deal.founder_name}
              {deal.founder_email && <span className="text-slate-400"> · {deal.founder_email}</span>}
            </p>
          </div>

          {/* Right: status badges + actions */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2 items-center justify-end">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(deal.email_status)}`}>
                {deal.email_status.replace("_", " ")}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusColor(deal.approval_status)}`}>
                {deal.approval_status}
              </span>
              {deal.meeting_held && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  ddPct === 100
                    ? "bg-emerald-100 text-emerald-700"
                    : ddPct >= 50
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  DD {ddPct}%
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-end">
              <Link
                href={`/dashboard/${id}/mandate`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                📄 Generate Mandate
              </Link>
            </div>
            <DealDetailActions
              dealId={id}
              meetingHeld={deal.meeting_held}
              approvalStatus={deal.approval_status}
            />
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-6 text-sm text-slate-500">
          {deal.stage && (
            <span>
              <span className="text-xs uppercase tracking-wide text-slate-400 mr-1">Stage</span>
              <span className="capitalize text-slate-700">{deal.stage.replace("-", " ")}</span>
            </span>
          )}
          {deal.industry && (
            <span>
              <span className="text-xs uppercase tracking-wide text-slate-400 mr-1">Industry</span>
              <span className="text-slate-700">{deal.industry}</span>
            </span>
          )}
          <span>
            <span className="text-xs uppercase tracking-wide text-slate-400 mr-1">Source</span>
            <span className="text-slate-700">{deal.source}</span>
          </span>
          <span>
            <span className="text-xs uppercase tracking-wide text-slate-400 mr-1">Added</span>
            <span className="text-slate-700">{formatDate(deal.created_at)}</span>
          </span>
          {deal.website_url && (
            <a
              href={deal.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Website
            </a>
          )}
          {deal.pitch_deck_url && (
            <a
              href={deal.pitch_deck_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Pitch Deck
            </a>
          )}
        </div>
      </div>

      {/* AI Summary */}
      {deal.ai_summary && (
        <div className="card p-5 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">AI Summary</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{deal.ai_summary}</p>
        </div>
      )}

      {/* Notes */}
      {deal.notes && (
        <div className="card p-5 mb-6">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-2">Notes</p>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{deal.notes}</p>
        </div>
      )}

      {/* DD Checklist — gated behind meeting_held */}
      {deal.meeting_held ? (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">📋</span>
                <h2 className="text-base font-semibold text-slate-900">Due Diligence Checklist</h2>
              </div>
              <p className="text-sm text-slate-500">
                {checklistItems.filter(i => i.status === "received").length} of{" "}
                {checklistItems.filter(i => i.status !== "na").length} documents received
                {checklistItems.filter(i => i.status === "missing").length > 0 && (
                  <span className="text-red-500 ml-2">
                    · {checklistItems.filter(i => i.status === "missing").length} missing
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-bold ${
                ddPct === 100 ? "text-emerald-600" : ddPct >= 60 ? "text-brand-600" : ddPct >= 30 ? "text-yellow-600" : "text-slate-400"
              }`}>{ddPct}%</span>
              <Link
                href={`/dashboard/${id}/dd`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
              >
                Open Checklist →
              </Link>
            </div>
          </div>

          {/* Mini progress bar */}
          <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                ddPct === 100 ? "bg-emerald-500" : ddPct >= 60 ? "bg-brand-500" : ddPct >= 30 ? "bg-yellow-500" : "bg-slate-300"
              }`}
              style={{ width: `${ddPct}%` }}
            />
          </div>

          {/* Status breakdown */}
          <div className="flex gap-4 mt-3 flex-wrap">
            {[
              { label: "Received", count: checklistItems.filter(i => i.status === "received").length, color: "text-emerald-600" },
              { label: "Pending",  count: checklistItems.filter(i => i.status === "pending").length,  color: "text-yellow-600" },
              { label: "Missing",  count: checklistItems.filter(i => i.status === "missing").length,  color: "text-red-500"    },
              { label: "N/A",      count: checklistItems.filter(i => i.status === "na").length,       color: "text-slate-400"  },
            ].map(s => (
              <span key={s.label} className="text-xs text-slate-500">
                {s.label}: <span className={`font-semibold ${s.color}`}>{s.count}</span>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="card p-6 border-dashed">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Due Diligence Checklist</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                DD is available after a meeting has been held with this founder. Use the{" "}
                <span className="font-medium text-brand-600">Mark Meeting Held</span> button above to unlock it.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
