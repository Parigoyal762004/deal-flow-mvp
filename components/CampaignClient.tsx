"use client";
import { useState, useTransition } from "react";
import {
  runBatchAction, runTestAction, getLeadsAction,
  previewBatchAction, sendSelectedAction, updateLeadStatusAction,
} from "@/app/campaign/actions";
import type { CampaignLeadRow, CampaignStats, LeadEmailPreview } from "@/lib/campaign";

const TEAL = "#1A4A44", GOLD = "#D4A017", INK = "#28112B", MID = "#4a6060", OFF = "#f7f8f6", BORDER = "#dde3e0";

const STATUS_OPTS = ["new", "sent", "replied", "bounced", "skipped", "suppressed"] as const;
type LeadStatus = (typeof STATUS_OPTS)[number];

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  sent:       { bg: "#dcfce7", color: "#166534", label: "Sent" },
  replied:    { bg: "#dbeafe", color: "#1d4ed8", label: "Replied" },
  bounced:    { bg: "#fee2e2", color: "#991b1b", label: "Bounced" },
  skipped:    { bg: "#f3f4f6", color: "#6b7280", label: "Skipped" },
  suppressed: { bg: "#fef3c7", color: "#92400e", label: "Suppressed" },
  new:        { bg: "#fef9ec", color: "#92400e", label: "Queued" },
};

const SENDER_COLOR: Record<string, string> = {
  pari: "#1A4A44", rohit: "#d97706", eva: "#7c3aed", akshita: "#be185d",
};

function SenderChip({ name }: { name: string | null }) {
  if (!name) return <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>;
  const color = SENDER_COLOR[name.toLowerCase()] ?? "#374151";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: color, color: "#fff", fontSize: 10, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{name.charAt(0).toUpperCase()}</span>
      <span style={{ fontSize: 12, color: MID, textTransform: "capitalize" as const }}>{name}</span>
    </span>
  );
}

function Stat({ label, value, color = INK }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: 28, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value.toLocaleString("en-IN")}</p>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: MID, margin: "8px 0 0" }}>{label}</p>
    </div>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Inline editable status chip ───────────────────────────────────────────────
function StatusCell({ lead, onChanged }: {
  lead: CampaignLeadRow;
  onChanged: (id: string, status: LeadStatus) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const s = STATUS_STYLE[lead.status] ?? { bg: "#f3f4f6", color: "#374151", label: lead.status };

  async function handleChange(next: LeadStatus) {
    setSaving(true);
    setEditing(false);
    const r = await updateLeadStatusAction(lead.id, next);
    setSaving(false);
    if (r.ok) onChanged(lead.id, next);
  }

  if (editing) {
    return (
      <select autoFocus value={lead.status} onChange={e => handleChange(e.target.value as LeadStatus)} onBlur={() => setEditing(false)}
        style={{ fontSize: 12, border: `1.5px solid ${TEAL}`, borderRadius: 6, padding: "3px 6px", color: INK, background: "#fff", cursor: "pointer" }}>
        {STATUS_OPTS.map(o => (
          <option key={o} value={o}>{STATUS_STYLE[o]?.label ?? o}</option>
        ))}
      </select>
    );
  }

  return (
    <span title="Click to change status" onClick={() => !saving && setEditing(true)}
      style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: 20, cursor: "pointer", userSelect: "none" as const }}>
      {saving ? "…" : s.label}
    </span>
  );
}

// ── Per-lead review card with editable email ──────────────────────────────────
function ReviewLeadCard({ lead, preview, selected, onToggle, editMap, onEdit }: {
  lead: CampaignLeadRow;
  preview: LeadEmailPreview;
  selected: boolean;
  onToggle: () => void;
  editMap: Record<string, { subject: string; text: string }>;
  onEdit: (id: string, field: "subject" | "text", val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const edited = editMap[lead.id];
  const subject = edited?.subject ?? preview.subject;
  const text    = edited?.text    ?? preview.text;
  const isDirty = !!edited;

  return (
    <div style={{ border: `1.5px solid ${selected ? TEAL : BORDER}`, borderRadius: 10, background: selected ? "#f5faf9" : "#fff", marginBottom: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
        <input type="checkbox" checked={selected} onChange={onToggle}
          style={{ width: 16, height: 16, accentColor: TEAL, cursor: "pointer", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: INK }}>{lead.company}</p>
          <p style={{ margin: 0, fontSize: 12, color: MID }}>{lead.email}</p>
        </div>
        {isDirty && (
          <span style={{ fontSize: 11, background: "#fef9ec", color: "#92400e", border: "1px solid #fde68a", borderRadius: 12, padding: "2px 8px", fontWeight: 700 }}>edited</span>
        )}
        <button onClick={() => setOpen(o => !o)}
          style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: MID, cursor: "pointer", flexShrink: 0 }}>
          {open ? "Hide ▲" : "Preview / Edit ▼"}
        </button>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px", background: "#fafafa" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: MID, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Subject</label>
          <input value={subject} onChange={e => onEdit(lead.id, "subject", e.target.value)} maxLength={200}
            style={{ display: "block", width: "100%", marginTop: 4, marginBottom: 14, border: `1.5px solid ${BORDER}`, borderRadius: 7, padding: "9px 12px", fontSize: 13, color: INK, background: "#fff", outline: "none", boxSizing: "border-box" as const }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: MID, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>Body</label>
            <span style={{ fontSize: 11, color: text.length > 4500 ? "#b91c1c" : "#9ca3af" }}>{text.length}/5000</span>
          </div>
          <textarea value={text} onChange={e => onEdit(lead.id, "text", e.target.value)} rows={14} maxLength={5000}
            style={{ display: "block", width: "100%", marginTop: 4, border: `1.5px solid ${BORDER}`, borderRadius: 7, padding: "10px 12px", fontSize: 13, color: INK, lineHeight: 1.6, background: "#fff", outline: "none", resize: "vertical", boxSizing: "border-box" as const, fontFamily: "inherit" }} />
          {isDirty && (
            <button onClick={() => { onEdit(lead.id, "subject", "##RESET##"); }}
              style={{ marginTop: 8, background: "none", border: "none", fontSize: 12, color: "#9ca3af", cursor: "pointer", padding: 0 }}>
              ↩ Reset to template
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
interface Props {
  stats: CampaignStats;
  leads: CampaignLeadRow[];
  batchSize: number;
  currentUser: string;
}

export default function CampaignClient({ stats: initial, leads: initialLeads, batchSize, currentUser }: Props) {
  const [stats, setStats] = useState(initial);
  const [leads, setLeads] = useState(initialLeads);

  // Direct send
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState("");
  const [pending, startTransition] = useTransition();

  // Review mode
  const [reviewLeads, setReviewLeads] = useState<CampaignLeadRow[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<LeadEmailPreview[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editMap, setEditMap] = useState<Record<string, { subject: string; text: string }>>({});
  const [reviewing, startReview] = useTransition();
  const [sending, startSend] = useTransition();
  const [reviewResult, setReviewResult] = useState("");

  // Test send
  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [testing, startTest] = useTransition();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Direct send ──────────────────────────────────────────────────────────────
  function sendDirect() {
    setConfirming(false);
    setResult("");
    startTransition(async () => {
      const r = await runBatchAction(batchSize);
      if (!r.ok) { setResult(`Error: ${r.error}`); return; }
      setStats(r.stats);
      if (r.leads) setLeads(r.leads);
      setResult(`Sent ${r.res.sent} · skipped ${r.res.skipped} (no mail server) · failed ${r.res.failed}.`);
    });
  }

  // ── Review mode ──────────────────────────────────────────────────────────────
  function loadPreview() {
    setReviewLeads([]);
    setReviewPreviews([]);
    setSelectedIds(new Set());
    setEditMap({});
    setReviewResult("");
    startReview(async () => {
      const r = await previewBatchAction(10);
      if (!r.ok) { setReviewResult(`Error: ${r.error}`); return; }
      if (!r.leads.length) { setReviewResult("No new leads available to preview."); return; }
      setReviewLeads(r.leads);
      setReviewPreviews(r.previews);
      setSelectedIds(new Set(r.leads.map(l => l.id)));
    });
  }

  function handleEdit(id: string, field: "subject" | "text", val: string) {
    setEditMap(prev => {
      if (val === "##RESET##") {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const current = prev[id] ?? {
        subject: reviewPreviews.find(p => p.id === id)?.subject ?? "",
        text:    reviewPreviews.find(p => p.id === id)?.text ?? "",
      };
      return { ...prev, [id]: { ...current, [field]: val } };
    });
  }

  function sendReviewed() {
    setReviewResult("");
    startSend(async () => {
      const r = await sendSelectedAction(Array.from(selectedIds), Object.keys(editMap).length ? editMap : undefined);
      if (!r.ok) { setReviewResult(`Error: ${r.error}`); return; }
      setStats(r.stats);
      if (r.leads) setLeads(r.leads);
      setReviewLeads([]);
      setReviewPreviews([]);
      setSelectedIds(new Set());
      setEditMap({});
      setReviewResult(`Sent ${r.res.sent} · skipped ${r.res.skipped} · failed ${r.res.failed}.`);
    });
  }

  // ── Test send ─────────────────────────────────────────────────────────────────
  function sendTest() {
    setTestMsg("");
    startTest(async () => {
      const r = await runTestAction(testEmail);
      setTestMsg(r.ok ? `Test sent to ${testEmail} — check your inbox.` : `Error: ${r.error}`);
    });
  }

  // ── Status change in table ────────────────────────────────────────────────────
  function handleStatusChange(id: string, status: LeadStatus) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  }

  function refreshLeads() {
    startTransition(async () => {
      const r = await getLeadsAction();
      if (r.ok) setLeads(r.leads);
    });
  }

  const filteredLeads = leads.filter(l => {
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchQuery = !q || l.company.toLowerCase().includes(q) || (l.first_name ?? "").toLowerCase().includes(q) || l.email.toLowerCase().includes(q) || (l.sent_by ?? "").toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  return (
    <div style={{ minHeight: "100vh", background: OFF, padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, margin: "0 0 6px" }}>Akro Ventures · Lending Outreach</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: INK, margin: 0 }}>Campaign</h1>
        <p style={{ fontSize: 14, color: MID, margin: "8px 0 28px" }}>
          Lending-services outreach{currentUser ? ` · signed in as ${currentUser}` : ""}. {batchSize} per day, verified and throttled.
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: 28 }}>
          <Stat label="Remaining" value={stats.new} color={TEAL} />
          <Stat label="Sent" value={stats.sent} color={GOLD} />
          <Stat label="Replied" value={stats.replied} color="#2563eb" />
          <Stat label="Bounced" value={stats.bounced} color="#b91c1c" />
          <Stat label="Skipped" value={stats.skipped} color={MID} />
          <Stat label="Total leads" value={stats.total} />
        </div>

        {/* Two send options */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 18 }}>

          {/* Review 10 */}
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 24px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Review 10 before sending</p>
            <p style={{ fontSize: 13, color: MID, margin: "0 0 16px" }}>See the actual email for each lead, edit if needed, uncheck to skip anyone, then send.</p>

            {reviewLeads.length === 0 ? (
              <button onClick={loadPreview} disabled={reviewing || stats.new === 0}
                style={{ background: stats.new === 0 ? "#e5e7eb" : "#fff", color: stats.new === 0 ? "#9ca3af" : TEAL, border: `1.5px solid ${stats.new === 0 ? "#e5e7eb" : TEAL}`, borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: stats.new === 0 ? "default" : "pointer" }}>
                {reviewing ? "Loading…" : stats.new === 0 ? "No leads left" : "Preview next 10"}
              </button>
            ) : (
              <div>
                {reviewLeads.map(lead => (
                  <ReviewLeadCard
                    key={lead.id}
                    lead={lead}
                    preview={reviewPreviews.find(p => p.id === lead.id) ?? { id: lead.id, subject: "", text: "" }}
                    selected={selectedIds.has(lead.id)}
                    onToggle={() => setSelectedIds(prev => {
                      const next = new Set(prev);
                      next.has(lead.id) ? next.delete(lead.id) : next.add(lead.id);
                      return next;
                    })}
                    editMap={editMap}
                    onEdit={handleEdit}
                  />
                ))}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                  <button onClick={sendReviewed} disabled={sending || selectedIds.size === 0}
                    style={{ background: selectedIds.size === 0 ? "#e5e7eb" : GOLD, color: selectedIds.size === 0 ? "#9ca3af" : INK, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: selectedIds.size === 0 ? "default" : "pointer" }}>
                    {sending ? "Sending…" : `Send ${selectedIds.size} selected`}
                  </button>
                  <button onClick={() => { setReviewLeads([]); setReviewPreviews([]); setSelectedIds(new Set()); setEditMap({}); setReviewResult(""); }}
                    style={{ background: "none", border: "none", color: MID, fontSize: 12, cursor: "pointer" }}>cancel</button>
                  <span style={{ fontSize: 12, color: MID }}>{selectedIds.size}/{reviewLeads.length} · {Object.keys(editMap).length} edited</span>
                </div>
              </div>
            )}
            {reviewResult && <p style={{ fontSize: 13, color: reviewResult.startsWith("Error") ? "#b91c1c" : "#166534", margin: "12px 0 0", fontWeight: 500 }}>{reviewResult}</p>}
          </div>

          {/* Direct send 20 */}
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 24px" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Send today's {batchSize} directly</p>
            <p style={{ fontSize: 13, color: MID, margin: "0 0 16px" }}>Takes the next {batchSize} leads, verifies each address, and sends immediately.</p>

            {!confirming ? (
              <button onClick={() => setConfirming(true)} disabled={pending || stats.new === 0}
                style={{ background: stats.new === 0 ? "#e5e7eb" : TEAL, color: stats.new === 0 ? "#9ca3af" : "#fff", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: pending || stats.new === 0 ? "default" : "pointer" }}>
                {pending ? "Sending…" : stats.new === 0 ? "No leads left" : `Send ${Math.min(batchSize, stats.new)} now`}
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: INK, fontWeight: 600 }}>Send {Math.min(batchSize, stats.new)} emails now?</span>
                <button onClick={sendDirect} disabled={pending} style={{ background: GOLD, color: INK, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, send</button>
                <button onClick={() => setConfirming(false)} style={{ background: "none", border: "none", color: MID, fontSize: 13, cursor: "pointer" }}>cancel</button>
              </div>
            )}
            {result && <p style={{ fontSize: 13, color: result.startsWith("Error") ? "#b91c1c" : "#166534", margin: "14px 0 0", fontWeight: 500 }}>{result}</p>}
          </div>
        </div>

        {/* Test send */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 24px", marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Send yourself a test first</p>
          <p style={{ fontSize: 13, color: MID, margin: "0 0 14px" }}>See exactly what a lead receives. The email will come from your mailbox and CC you.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="your@email.com"
              style={{ flex: 1, minWidth: 240, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none" }} />
            <button onClick={sendTest} disabled={testing || !testEmail.includes("@")}
              style={{ background: "#fff", color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: testing ? "default" : "pointer" }}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          {testMsg && <p style={{ fontSize: 13, color: testMsg.startsWith("Error") ? "#b91c1c" : "#166534", margin: "12px 0 0" }}>{testMsg}</p>}
        </div>

        {/* Leads table */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>Lead List</p>
              <p style={{ fontSize: 12, color: MID, margin: "3px 0 0" }}>{leads.length} contacted · {stats.new.toLocaleString("en-IN")} remaining · click a status chip to change it</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search company, email or sender…"
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", minWidth: 220 }} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: INK, background: "#fff", outline: "none" }}>
                <option value="all">All statuses</option>
                {STATUS_OPTS.map(o => <option key={o} value={o}>{STATUS_STYLE[o]?.label ?? o}</option>)}
              </select>
              <button onClick={refreshLeads} disabled={pending}
                style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: MID, cursor: "pointer" }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: OFF }}>
                  {["Company", "Contact", "Email", "Sent by", "Status", "Date Sent"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: "28px", color: MID, textAlign: "center" }}>No leads match your filter.</td></tr>
                )}
                {filteredLeads.map((lead, i) => (
                  <tr key={lead.id} style={{ borderTop: `1px solid ${BORDER}`, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "11px 16px", color: INK, fontWeight: 600, whiteSpace: "nowrap" }}>{lead.company}</td>
                    <td style={{ padding: "11px 16px", color: MID, whiteSpace: "nowrap" }}>{lead.first_name ?? ""}</td>
                    <td style={{ padding: "11px 16px", color: MID, fontSize: 12 }}>{lead.email}</td>
                    <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}><SenderChip name={lead.sent_by} /></td>
                    <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                      <StatusCell lead={lead} onChanged={handleStatusChange} />
                      {lead.error && <span style={{ marginLeft: 6, fontSize: 11, color: "#b91c1c", cursor: "help" }} title={lead.error}>⚠</span>}
                    </td>
                    <td style={{ padding: "11px 16px", color: MID, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(lead.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length > 0 && (
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MID }}>
              Showing {filteredLeads.length} of {leads.length} contacted leads
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
