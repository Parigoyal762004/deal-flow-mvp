"use client";

import { useMemo, useState } from "react";
import { statusColor } from "@/lib/utils";
import { ownerDisplayName } from "@/lib/users";
import type { Deal } from "@/lib/types";
import { ExternalLink, FileText, BarChart3, ChevronDown, Search, Users, HelpCircle, X } from "lucide-react";

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}
function rowTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

const OWNER_CHIP: Record<string, string> = {
  pari:    "bg-teal-100 text-teal-700 ring-1 ring-teal-200",
  rohit:   "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
  eva:     "bg-violet-100 text-violet-700 ring-1 ring-violet-200",
  akshita: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
};
function ownerChip(owner: string | null): string {
  return (owner && OWNER_CHIP[owner.toLowerCase()]) || "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
}

function leftBorder(deal: Deal): string {
  if (deal.approval_status === "rejected")  return "border-l-red-400";
  if (deal.approval_status === "approved")  return "border-l-emerald-500";
  if (deal.email_status === "sent")         return "border-l-blue-400";
  if (deal.email_status === "awaiting_approval") return "border-l-amber-400";
  return "border-l-slate-200";
}

function stageBadgeColor(stage: string | null): string {
  if (!stage) return "bg-slate-100 text-slate-500";
  const map: Record<string, string> = {
    "pre-seed": "bg-purple-100 text-purple-700",
    "seed":     "bg-indigo-100 text-indigo-700",
    "series-a": "bg-blue-100 text-blue-700",
    "series-b": "bg-teal-100 text-teal-700",
    "growth":   "bg-emerald-100 text-emerald-700",
    "other":    "bg-slate-100 text-slate-500",
  };
  return map[stage] ?? "bg-slate-100 text-slate-500";
}

interface Props {
  deals: Deal[];
  ddPctByDeal: Record<string, number>;
  currentUser: string | null;
  owners: { username: string; displayName: string }[];
}

export default function DashboardClient({ deals, ddPctByDeal, currentUser, owners }: Props) {
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [showHelp, setShowHelp] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (ownerFilter === "unassigned" && d.owner) return false;
      if (ownerFilter !== "all" && ownerFilter !== "unassigned" && (d.owner ?? "").toLowerCase() !== ownerFilter) return false;
      if (!q) return true;
      return (
        d.startup_name.toLowerCase().includes(q) ||
        d.founder_name.toLowerCase().includes(q) ||
        d.founder_email.toLowerCase().includes(q) ||
        (d.industry ?? "").toLowerCase().includes(q) ||
        ownerDisplayName(d.owner).toLowerCase().includes(q)
      );
    });
  }, [deals, query, ownerFilter]);

  const stats = useMemo(() => ({
    total:    filtered.length,
    pending:  filtered.filter((d) => d.email_status === "pending" || d.email_status === "awaiting_approval").length,
    sent:     filtered.filter((d) => d.email_status === "sent").length,
    rejected: filtered.filter((d) => d.approval_status === "rejected").length,
  }), [filtered]);

  const groups = useMemo(() => {
    const out: { label: string; deals: Deal[] }[] = [];
    for (const deal of filtered) {
      const label = dayLabel(deal.created_at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.deals.push(deal);
      else out.push({ label, deals: [deal] });
    }
    return out;
  }, [filtered]);

  const myDealsActive = currentUser !== null && ownerFilter === currentUser;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Deal Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            All startup opportunities, grouped by submission date. Click any deal to see full details, DD checklist, or generate a mandate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHelp(h => !h)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand-600 transition-colors px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-brand-300"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            How it works
          </button>
          <a href="/submit" className="btn-primary text-sm">+ Submit Deal</a>
        </div>
      </div>

      {/* Help panel */}
      {showHelp && (
        <div className="mb-6 bg-brand-50 border border-brand-100 rounded-xl p-5 relative">
          <button onClick={() => setShowHelp(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
          <p className="text-sm font-semibold text-brand-800 mb-3">How the deal pipeline works</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Submit a deal", desc: "A founder fills the intake form or you upload a CSV. An AI summary and draft email are generated automatically." },
              { step: "2", title: "Approve or edit", desc: "You get an email with Approve / Edit / Reject buttons. Clicking Approve sends the personalised email to the founder." },
              { step: "3", title: "Mark meeting held", desc: "Once you've had a call, open the deal and click \"Mark Meeting Held\" — this unlocks the Due Diligence checklist." },
              { step: "4", title: "Run due diligence", desc: "Track all required documents in the DD checklist. The pipeline column shows progress at a glance." },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-lg p-3.5 border border-brand-100">
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mb-2">{s.step}</div>
                <p className="text-xs font-semibold text-slate-800 mb-1">{s.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-brand-100 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { color: "border-l-amber-400", label: "Awaiting approval — email drafted, needs your review" },
              { color: "border-l-blue-400",  label: "Sent — founder email has been delivered" },
              { color: "border-l-emerald-500", label: "Approved deal" },
              { color: "border-l-red-400",   label: "Rejected deal" },
            ].map(b => (
              <div key={b.label} className={`flex items-center gap-2 text-xs text-slate-500 border-l-4 ${b.color} pl-2`}>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Deals",  value: stats.total,    color: "text-slate-900",  bg: "bg-white" },
          { label: "In Progress",  value: stats.pending,  color: "text-amber-600",  bg: "bg-amber-50" },
          { label: "Emails Sent",  value: stats.sent,     color: "text-blue-600",   bg: "bg-blue-50" },
          { label: "Rejected",     value: stats.rejected, color: "text-red-600",    bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`card p-5 ${s.bg} border border-slate-100`}>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{s.label}</p>
            <p className={`text-3xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search startup, founder, email, owner…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200 bg-white"
          />
        </div>

        <div className="relative flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:border-brand-400 cursor-pointer"
          >
            <option value="all">All owners</option>
            {owners.map((o) => (
              <option key={o.username} value={o.username}>{o.displayName}</option>
            ))}
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        {currentUser && (
          <button
            onClick={() => setOwnerFilter(myDealsActive ? "all" : currentUser)}
            className={`text-sm px-3.5 py-2 rounded-lg border transition-colors ${
              myDealsActive
                ? "bg-brand-600 border-brand-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:border-brand-300"
            }`}
          >
            My deals
          </button>
        )}

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} of {deals.length} deals
        </span>
      </div>

      {/* Deal groups */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">
            {deals.length === 0 ? "No deals yet — submit your first one." : "No deals match your search."}
          </p>
          {deals.length === 0 && (
            <a href="/" className="btn-primary mt-4 inline-flex text-sm">Submit your first deal</a>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g, i) => (
            <details key={query.trim() ? `q-${g.label}` : g.label} open={!!query.trim() || i === 0} className="group card overflow-hidden">
              <summary className="flex items-center gap-3 cursor-pointer select-none px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden marker:content-none border-b border-slate-100 group-open:border-slate-100">
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                <span className="text-sm font-semibold text-slate-900">{g.label}</span>
                <span className="text-xs bg-slate-100 text-slate-500 font-medium px-2 py-0.5 rounded-full">
                  {g.deals.length} {g.deals.length === 1 ? "deal" : "deals"}
                </span>
              </summary>

              <div className="divide-y divide-slate-100">
                {g.deals.map((deal) => {
                  const ddPct = ddPctByDeal[deal.id];
                  const isRejected = deal.approval_status === "rejected";
                  return (
                    <a
                      key={deal.id}
                      href={`/dashboard/${deal.id}`}
                      className={`flex gap-4 px-5 py-4 border-l-4 ${leftBorder(deal)} transition-colors block ${
                        isRejected ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Owner avatar */}
                      <div className={`w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 ${ownerChip(deal.owner)}`}>
                        {ownerDisplayName(deal.owner).charAt(0)}
                      </div>

                      {/* Main info */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Company + stage + time */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`font-semibold text-slate-900 hover:text-brand-600 transition-colors truncate ${isRejected ? "line-through text-slate-400" : ""}`}>
                              {deal.startup_name}
                            </span>
                            {deal.stage && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 ${stageBadgeColor(deal.stage)}`}>
                                {deal.stage.replace("-", " ")}
                              </span>
                            )}
                            {deal.industry && (
                              <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">{deal.industry}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">{rowTime(deal.created_at)}</span>
                        </div>

                        {/* Row 2: Founder + links */}
                        <div className="flex items-center gap-1 mb-2 flex-wrap">
                          <span className="text-sm text-slate-600 truncate">
                            {deal.founder_name}
                          </span>
                          {deal.founder_email && (
                            <span className="text-xs text-slate-400 truncate hidden sm:inline">· {deal.founder_email}</span>
                          )}
                          <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                            {deal.website_url && (
                              <span onClick={(e) => { e.preventDefault(); window.open(deal.website_url!, "_blank"); }}
                                className="text-brand-600 hover:text-brand-700 cursor-pointer" title="Visit website">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </span>
                            )}
                            {deal.pitch_deck_url && (
                              <span onClick={(e) => { e.preventDefault(); window.open(deal.pitch_deck_url!, "_blank"); }}
                                className="text-brand-600 hover:text-brand-700 cursor-pointer" title="View pitch deck">
                                <FileText className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Status chips + DD */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(deal.email_status)}`}>
                            {deal.email_status.replace(/_/g, " ")}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(deal.approval_status)}`}>
                            {deal.approval_status}
                          </span>
                          {deal.source && (
                            <span className="text-xs text-slate-400">via {deal.source}</span>
                          )}

                          {/* DD progress — right side */}
                          <div className="ml-auto flex-shrink-0">
                            {deal.meeting_held ? (
                              ddPct !== undefined ? (
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden w-16">
                                    <div className={`h-full rounded-full transition-all ${
                                      ddPct === 100 ? "bg-emerald-500" : ddPct >= 60 ? "bg-brand-500" : ddPct >= 30 ? "bg-amber-400" : "bg-slate-300"
                                    }`} style={{ width: `${ddPct}%` }} />
                                  </div>
                                  <span className={`text-xs font-semibold ${
                                    ddPct === 100 ? "text-emerald-600" : ddPct >= 60 ? "text-brand-600" : "text-slate-400"
                                  }`}>DD {ddPct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-brand-500 hover:underline">Start DD →</span>
                              )
                            ) : (
                              <span className="text-xs text-slate-300 italic">No meeting yet</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
