"use client";

import { useState, useRef, useCallback } from "react";
import type { DDChecklistItem, DDStatus } from "@/lib/types";

interface Props {
  items: DDChecklistItem[];
  dealId: string;
}

const STATUS_OPTIONS: {
  value: DDStatus;
  label: string;
  icon: string;
  activeClass: string;
}[] = [
  { value: "received", label: "Received", icon: "✓",  activeClass: "bg-emerald-100 text-emerald-700 border-emerald-300 font-semibold" },
  { value: "pending",  label: "Pending",  icon: "○",  activeClass: "bg-yellow-100 text-yellow-700 border-yellow-300 font-semibold"   },
  { value: "missing",  label: "Missing",  icon: "!",  activeClass: "bg-red-100 text-red-600 border-red-300 font-semibold"            },
  { value: "na",       label: "N/A",      icon: "-",  activeClass: "bg-slate-100 text-slate-500 border-slate-300 font-semibold"      },
];

const TAG_CLASS: Record<string, string> = {
  both:   "bg-brand-50 text-brand-600 border border-brand-200",
  debt:   "bg-orange-50 text-orange-600 border border-orange-200",
  equity: "bg-emerald-50 text-emerald-600 border border-emerald-200",
};

const TAG_LABEL: Record<string, string> = {
  both:   "BOTH",
  debt:   "DEBT",
  equity: "EQUITY",
};

export function DDChecklist({ items: initialItems, dealId }: Props) {
  const [items, setItems] = useState<DDChecklistItem[]>(initialItems);
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Computed stats ────────────────────────────────────────────────────
  const applicable = items.filter((i) => i.status !== "na");
  const received   = applicable.filter((i) => i.status === "received");
  const pct        = applicable.length > 0 ? Math.round((received.length / applicable.length) * 100) : 0;

  const pctColor =
    pct === 100 ? "bg-emerald-500" :
    pct >= 60   ? "bg-brand-500"   :
    pct >= 30   ? "bg-yellow-500"  :
                  "bg-slate-300";

  // ── API helpers ───────────────────────────────────────────────────────
  const persistUpdate = useCallback(
    async (itemKey: string, updates: { status?: DDStatus; notes?: string }) => {
      await fetch("/api/dd-checklist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal_id: dealId, item_key: itemKey, ...updates }),
      });
    },
    [dealId]
  );

  function handleStatusChange(itemKey: string, status: DDStatus) {
    setItems((prev) =>
      prev.map((i) => (i.item_key === itemKey ? { ...i, status } : i))
    );
    persistUpdate(itemKey, { status });
  }

  function handleNotesChange(itemKey: string, notes: string) {
    // Optimistic local update immediately
    setItems((prev) =>
      prev.map((i) => (i.item_key === itemKey ? { ...i, notes: notes || null } : i))
    );
    // Debounce the API call by 700 ms
    if (debounceTimers.current[itemKey]) clearTimeout(debounceTimers.current[itemKey]);
    debounceTimers.current[itemKey] = setTimeout(() => {
      persistUpdate(itemKey, { notes });
    }, 700);
  }

  // ── Grouping ──────────────────────────────────────────────────────────
  const commonItems = items.filter((i) => i.applicable_to === "both");
  const debtItems   = items.filter((i) => i.applicable_to === "debt");
  const equityItems = items.filter((i) => i.applicable_to === "equity");

  // ── Render helpers ────────────────────────────────────────────────────
  function sectionStats(sectionItems: DDChecklistItem[]) {
    const app = sectionItems.filter((i) => i.status !== "na");
    const rec = app.filter((i) => i.status === "received");
    return { app: app.length, rec: rec.length };
  }

  function ItemRow({ item, idx }: { item: DDChecklistItem; idx: number }) {
    return (
      <div className={`flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 ${item.status === "na" ? "opacity-50" : ""}`}>
        {/* Index */}
        <span className="text-xs text-slate-300 font-mono w-5 pt-0.5 flex-shrink-0 text-right">
          {idx + 1}
        </span>

        {/* Label + tag + notes */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm text-slate-800 ${item.status === "received" ? "line-through text-slate-400" : ""}`}>
              {item.item_label}
            </span>
            <span className={`inline-flex text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${TAG_CLASS[item.applicable_to]}`}>
              {TAG_LABEL[item.applicable_to]}
            </span>
          </div>
          <input
            type="text"
            value={item.notes ?? ""}
            onChange={(e) => handleNotesChange(item.item_key, e.target.value)}
            placeholder="Add note…"
            className="mt-1 w-full text-xs text-slate-500 placeholder:text-slate-300 bg-transparent focus:bg-slate-50 rounded px-1 py-0.5 outline-none transition-colors"
          />
        </div>

        {/* Status buttons */}
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap justify-end">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(item.item_key, opt.value)}
              title={opt.label}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all cursor-pointer ${
                item.status === opt.value
                  ? opt.activeClass
                  : "bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600"
              }`}
            >
              <span className="font-mono text-[11px]">{opt.icon}</span>
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function Section({
    title,
    sectionItems,
    startIdx,
  }: {
    title: string;
    sectionItems: DDChecklistItem[];
    startIdx: number;
  }) {
    const { app, rec } = sectionStats(sectionItems);
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
          <span className="text-xs text-slate-400 font-mono">
            {rec}/{app} received
          </span>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden px-3">
          {sectionItems.map((item, i) => (
            <ItemRow key={item.item_key} item={item} idx={startIdx + i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Completion bar */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-0.5">
              DD Completion
            </p>
            <p className="text-sm text-slate-600">
              <span className="text-2xl font-semibold text-slate-900">{pct}%</span>
              <span className="ml-2 text-slate-400">
                {received.length} of {applicable.length} applicable documents received
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">
              {items.filter((i) => i.status === "missing").length} missing
            </p>
            <p className="text-xs text-slate-400">
              {items.filter((i) => i.status === "na").length} N/A
            </p>
          </div>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pctColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          {STATUS_OPTIONS.map((opt) => {
            const count = items.filter((i) => i.status === opt.value).length;
            return (
              <div key={opt.value} className="flex items-center gap-1">
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-mono border ${opt.activeClass}`}>
                  {opt.icon}
                </span>
                <span className="text-xs text-slate-500">{opt.label} <span className="font-semibold text-slate-700">{count}</span></span>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to use hint */}
      <p className="text-xs text-slate-400 mb-5">
        Click a status button to update each document. Notes auto-save after typing.
      </p>

      {/* Sections */}
      <Section title="Common Documents" sectionItems={commonItems} startIdx={0} />
      <Section title="Debt-Specific Documents" sectionItems={debtItems} startIdx={commonItems.length} />
      <Section title="Equity-Specific Documents" sectionItems={equityItems} startIdx={commonItems.length + debtItems.length} />
    </div>
  );
}
