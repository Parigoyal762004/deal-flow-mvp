"use client";

import { useMemo, useState } from "react";
import { statusColor } from "@/lib/utils";
import { ownerDisplayName } from "@/lib/users";
import type { Deal } from "@/lib/types";
import { ExternalLink, FileText, BarChart3, ChevronDown, Search, Users } from "lucide-react";

// Group label for a day, e.g. "Tue, 23 June 2026". Used as the dropdown header.
function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}
// Per-row time, e.g. "4:32 PM" (the day already lives in the group header).
function rowTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// A small, deterministic colour per owner so the avatar chips read at a glance.
const OWNER_CHIP: Record<string, string> = {
  pari: "bg-teal-100 text-teal-700",
  rohit: "bg-amber-100 text-amber-700",
  eva: "bg-violet-100 text-violet-700",
  akshita: "bg-rose-100 text-rose-700",
};
function ownerChip(owner: string | null): string {
  return (owner && OWNER_CHIP[owner.toLowerCase()]) || "bg-slate-100 text-slate-500";
}

interface Props {
  deals: Deal[];
  ddPctByDeal: Record<string, number>;
  currentUser: string | null;
  owners: { username: string; displayName: string }[];
}

export default function DashboardClient({ deals, ddPctByDeal, currentUser, owners }: Props) {
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState<string>("all"); // "all" | username | "unassigned"

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
    total: filtered.length,
    pending: filtered.filter((d) => d.email_status === "pending" || d.email_status === "awaiting_approval").length,
    sent: filtered.filter((d) => d.email_status === "sent").length,
    rejected: filtered.filter((d) => d.approval_status === "rejected").length,
  }), [filtered]);

  // Group filtered deals by day (rows already sorted newest-first by the server).
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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Deal Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">All startup opportunities, grouped by day. Search, or filter by owner.</p>
        </div>
        <a href="/" className="btn-primary text-sm">+ Submit Deal</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Deals", value: stats.total, color: "text-slate-900" },
          { label: "In Progress", value: stats.pending, color: "text-yellow-600" },
          { label: "Emails Sent", value: stats.sent, color: "text-green-600" },
          { label: "Rejected", value: stats.rejected, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">{s.label}</p>
            <p className={`text-3xl font-semibold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Controls: search + owner filter + My deals toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search startup, founder, email, owner..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
          />
        </div>

        <div className="relative flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:border-brand-400"
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
          Showing {filtered.length} of {deals.length}
        </span>
      </div>

      {/* Deals, grouped by day into collapsible sections */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{deals.length === 0 ? "No deals submitted yet." : "No deals match your search."}</p>
          {deals.length === 0 && <a href="/" className="btn-primary mt-4 inline-flex text-sm">Submit your first deal</a>}
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <details key={g.label} open={i === 0} className="group card overflow-hidden">
              <summary className="flex items-center gap-3 cursor-pointer select-none px-5 py-3.5 hover:bg-slate-50 [&::-webkit-details-marker]:hidden marker:content-none">
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" />
                <span className="text-sm font-semibold text-slate-900">{g.label}</span>
                <span className="text-xs text-slate-400">
                  {g.deals.length} {g.deals.length === 1 ? "deal" : "deals"}
                </span>
              </summary>

              <div className="overflow-x-auto border-t border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Startup", "Owner", "Founder", "Stage", "Industry", "Source", "Email Status", "Approval", "Due Diligence", "Time", "Deck"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.deals.map((deal) => (
                      <tr key={deal.id} className={`transition-colors ${deal.approval_status === "rejected" ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}`}>
                        <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                          <a href={`/dashboard/${deal.id}`} className="hover:text-brand-600 transition-colors">
                            {deal.startup_name}
                          </a>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-full text-[10px] font-semibold flex items-center justify-center ${ownerChip(deal.owner)}`}>
                              {ownerDisplayName(deal.owner).charAt(0)}
                            </span>
                            <span className="text-slate-600">{ownerDisplayName(deal.owner)}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                          <div>{deal.founder_name}</div>
                          <div className="text-xs text-slate-400">{deal.founder_email}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 capitalize whitespace-nowrap">
                          {deal.stage?.replace("-", " ")}
                        </td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{deal.industry}</td>
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{deal.source}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(deal.email_status)}`}>
                            {deal.email_status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(deal.approval_status)}`}>
                            {deal.approval_status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <a href={`/dashboard/${deal.id}/dd`} className="group block min-w-[100px]">
                            {ddPctByDeal[deal.id] !== undefined ? (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`text-xs font-semibold ${
                                    ddPctByDeal[deal.id] === 100 ? "text-emerald-600"
                                    : ddPctByDeal[deal.id] >= 60  ? "text-brand-600"
                                    : ddPctByDeal[deal.id] >= 30  ? "text-yellow-600"
                                    : "text-slate-400"
                                  }`}>{ddPctByDeal[deal.id]}%</span>
                                  <span className="text-[10px] text-slate-300 group-hover:text-brand-500 transition-colors">open →</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                                  <div className={`h-full rounded-full ${
                                    ddPctByDeal[deal.id] === 100 ? "bg-emerald-500"
                                    : ddPctByDeal[deal.id] >= 60  ? "bg-brand-500"
                                    : ddPctByDeal[deal.id] >= 30  ? "bg-yellow-400"
                                    : "bg-slate-300"
                                  }`} style={{ width: `${ddPctByDeal[deal.id]}%` }} />
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-300 group-hover:text-brand-500 transition-colors">
                                Start DD →
                              </span>
                            )}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                          {rowTime(deal.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          {deal.pitch_deck_url ? (
                            <a
                              href={deal.pitch_deck_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 text-xs font-medium"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              PDF
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
