import { createServerClient } from "@/lib/supabase-server";
import { formatDate, statusColor } from "@/lib/utils";
import type { Deal } from "@/lib/types";
import { ExternalLink, FileText, BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data: deals, error } = await supabase
    .from("deals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

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

  const stats = {
    total: rows.length,
    pending: rows.filter((d) => d.email_status === "pending" || d.email_status === "awaiting_approval").length,
    sent: rows.filter((d) => d.email_status === "sent").length,
    rejected: rows.filter((d) => d.approval_status === "rejected").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            Deal Pipeline
          </h1>
          <p className="text-sm text-slate-500 mt-1">All submitted startup opportunities</p>
        </div>
        <a href="/" className="btn-primary text-sm">+ Submit Deal</a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

      {/* Table */}
      {rows.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No deals submitted yet.</p>
          <a href="/" className="btn-primary mt-4 inline-flex text-sm">Submit your first deal</a>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {["Startup", "Founder", "Stage", "Industry", "Source", "Email Status", "Approval", "Date", "Deck"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((deal) => (
                  <tr key={deal.id} className={`transition-colors ${deal.approval_status === "rejected" ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-50"}`}>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                      {deal.startup_name}
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
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs">
                      {formatDate(deal.created_at)}
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
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
