"use client";

import { useState, useRef } from "react";
import type { Deal } from "@/lib/types";
import type { MandateParams, MandateType } from "@/lib/mandate-template";
import { defaultMandateParams, formatINR } from "@/lib/mandate-template";
import { MandateDocument } from "./MandateDocument";

interface Props {
  deal: Deal;
}

// ── Form field wrapper ────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-3">
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: {
  value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="form-input text-sm w-full"
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-5 mb-2 pb-1 border-b border-slate-100">
      {children}
    </p>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function MandateGenerator({ deal }: Props) {
  const [params, setParams] = useState<MandateParams>(() => defaultMandateParams(deal));
  const previewRef = useRef<HTMLDivElement>(null);

  function set<K extends keyof MandateParams>(key: K, value: MandateParams[K]) {
    setParams((p) => ({ ...p, [key]: value }));
  }

  // ── Print to PDF ───────────────────────────────────────────────────────────
  function handlePrint() {
    const inner = document.getElementById("mandate-doc-inner");
    if (!inner) return;
    const content = inner.innerHTML;
    const origin  = window.location.origin;

    const win = window.open("", "_blank", "width=900,height=800");
    if (!win) { alert("Popup blocked - please allow popups for this site."); return; }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mandate - ${params.companyName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5pt;
      color: #111;
      background: white;
    }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      body {
        background-image: url('${origin}/letterhead.jpeg');
        background-size: 100% 100%;
        background-attachment: fixed;
        background-repeat: no-repeat;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    table { border-collapse: collapse; }
    .no-print { display: none; }
  </style>
</head>
<body>
  <div style="padding:48mm 20mm 44mm 20mm;">${content}</div>
  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 400); };
  </script>
</body>
</html>`);
    win.document.close();
  }

  const amountStr = params.targetRaiseAmount > 0 ? formatINR(params.targetRaiseAmount) : "";

  return (
    <div className="flex gap-6 items-start">

      {/* ── LEFT: Form ──────────────────────────────────────────────────── */}
      <div className="w-[380px] flex-shrink-0">
        <div className="card p-5 sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Mandate Parameters
          </p>

          {/* Client Info */}
          <SectionLabel>Client Information</SectionLabel>
          <Field label="Company Name">
            <Input value={params.companyName} onChange={(v) => set("companyName", v)} />
          </Field>
          <Field label="CIN" hint="e.g. U62099PN2024PTC227887">
            <Input value={params.cin} onChange={(v) => set("cin", v)} placeholder="Leave blank if unknown" />
          </Field>
          <Field label="Date of Incorporation">
            <Input value={params.dateOfIncorp} onChange={(v) => set("dateOfIncorp", v)} placeholder="e.g. February 5, 2024" />
          </Field>
          <Field label="PAN">
            <Input value={params.pan} onChange={(v) => set("pan", v)} placeholder="AAHCI5098Q" />
          </Field>
          <Field label="TAN">
            <Input value={params.tan} onChange={(v) => set("tan", v)} placeholder="PNEI12537A" />
          </Field>
          <Field label="Registered Address">
            <textarea
              value={params.registeredAddress}
              onChange={(e) => set("registeredAddress", e.target.value)}
              rows={3}
              placeholder="Full registered address"
              className="form-input text-sm w-full resize-none"
            />
          </Field>

          {/* Mandate Terms */}
          <SectionLabel>Mandate Terms</SectionLabel>
          <Field label="Effective Date">
            <Input type="date" value={params.effectiveDate} onChange={(v) => set("effectiveDate", v)} />
          </Field>
          <Field label="Mandate Type">
            <select
              value={params.mandateType}
              onChange={(e) => set("mandateType", e.target.value as MandateType)}
              className="form-input text-sm w-full"
            >
              <option value="equity_debt">Equity & Debt - Exclusive</option>
              <option value="equity">Equity Only - Exclusive</option>
              <option value="debt">Debt Only - Exclusive</option>
            </select>
          </Field>
          <Field label={`Target Raise Amount ${amountStr ? `(${amountStr})` : ""}`}>
            <Input
              type="number"
              value={params.targetRaiseAmount || ""}
              onChange={(v) => set("targetRaiseAmount", Number(v) || 0)}
              placeholder="e.g. 20000000"
            />
          </Field>
          <Field label="Mandate Tenure (months)">
            <Input
              type="number"
              value={params.tenureMonths}
              onChange={(v) => set("tenureMonths", Math.max(1, Number(v) || 4))}
            />
          </Field>
          {(params.mandateType === "equity_debt" || params.mandateType === "equity") && (
            <Field label="Equity Instruments">
              <Input value={params.equityInstruments} onChange={(v) => set("equityInstruments", v)} />
            </Field>
          )}
          {(params.mandateType === "equity_debt" || params.mandateType === "debt") && (
            <Field label="Debt Instruments">
              <Input value={params.debtInstruments} onChange={(v) => set("debtInstruments", v)} />
            </Field>
          )}
          <Field label="Target Investors / Lenders">
            <textarea
              value={params.targetInvestors}
              onChange={(e) => set("targetInvestors", e.target.value)}
              rows={2}
              className="form-input text-sm w-full resize-none"
            />
          </Field>

          {/* Fee Structure */}
          <SectionLabel>Fee Structure</SectionLabel>
          <Field label={`Retainer Amount (${params.retainerAmount > 0 ? formatINR(params.retainerAmount) : "₹?"})`}>
            <Input
              type="number"
              value={params.retainerAmount || ""}
              onChange={(v) => set("retainerAmount", Number(v) || 0)}
              placeholder="50000"
            />
          </Field>
          {(params.mandateType === "equity_debt" || params.mandateType === "equity") && (
            <Field label="Equity Success Fee (%)">
              <Input
                type="number"
                value={params.successFeeEquityPct}
                onChange={(v) => set("successFeeEquityPct", Number(v) || 3)}
                placeholder="3"
              />
            </Field>
          )}
          {(params.mandateType === "equity_debt" || params.mandateType === "debt") && (
            <Field label="Debt Success Fee (%)">
              <Input
                type="number"
                value={params.successFeeDebtPct}
                onChange={(v) => set("successFeeDebtPct", Number(v) || 3)}
                placeholder="3"
              />
            </Field>
          )}
          <Field label="Tail Period (months)">
            <Input
              type="number"
              value={params.tailPeriodMonths}
              onChange={(v) => set("tailPeriodMonths", Number(v) || 12)}
            />
          </Field>

          {/* Performance */}
          <SectionLabel>Performance Targets</SectionLabel>
          <Field label="Minimum Introductions">
            <Input
              type="number"
              value={params.minIntroductions}
              onChange={(v) => set("minIntroductions", Number(v) || 30)}
            />
          </Field>
          <Field label="Minimum Meetings">
            <Input
              type="number"
              value={params.minMeetings}
              onChange={(v) => set("minMeetings", Number(v) || 15)}
            />
          </Field>

          {/* Print button */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handlePrint}
              className="btn-primary w-full text-sm"
            >
              📄 Download PDF
            </button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              In print dialog → More settings → enable <strong>Background graphics</strong>
              <br />for the full Akro Ventures letterhead
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Live preview ──────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Header bar */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-slate-500">Live preview - updates as you type</p>
          <button onClick={handlePrint} className="btn-secondary text-xs px-3 py-1.5">
            📄 Print / Save PDF
          </button>
        </div>

        {/* A4 sheet simulation */}
        <div
          ref={previewRef}
          style={{
            background: `url('/letterhead.jpeg') center / 100% 100% no-repeat`,
            width: "100%",
            aspectRatio: "210 / 297",
            position: "relative",
            borderRadius: 6,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Scaled content overlay - we scale it to fit the preview box */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "16.2% 8.5% 14.8% 8.5%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                transform: "scale(0.38)",
                transformOrigin: "top left",
                width: "263%",         /* 1 / 0.38 */
                fontFamily: "'Times New Roman', Times, serif",
                fontSize: "10.5pt",
                color: "#111",
                lineHeight: "1.65",
              }}
            >
              <MandateDocument params={params} />
            </div>
          </div>
        </div>

        {/* Scrollable full render below */}
        <details className="mt-4">
          <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 select-none mb-2">
            Show full document text ↓
          </summary>
          <div className="card p-6 overflow-auto max-h-[70vh]">
            <MandateDocument params={params} />
          </div>
        </details>
      </div>
    </div>
  );
}
