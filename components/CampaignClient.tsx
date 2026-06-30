"use client";
import { useState, useTransition } from "react";
import {
  runBatchAction, runTestAction, getLeadsAction,
  previewBatchAction, sendSelectedAction, updateLeadStatusAction,
  convertLeadToDealAction, getLinkedInFollowupsAction, markLinkedInDoneAction,
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

  // ── LinkedIn follow-up queue ───────────────────────────────────────────────
  const [linkedInLeads, setLinkedInLeads] = useState<CampaignLeadRow[]>([]);
  const [linkedInLoaded, setLinkedInLoaded] = useState(false);
  const [loadingLinkedIn, startLoadLinkedIn] = useTransition();
  const [markingLinkedIn, setMarkingLinkedIn] = useState<string | null>(null);

  function loadLinkedIn() {
    startLoadLinkedIn(async () => {
      const r = await getLinkedInFollowupsAction();
      if (r.ok) { setLinkedInLeads(r.leads); setLinkedInLoaded(true); }
    });
  }

  async function markLinkedIn(leadId: string) {
    setMarkingLinkedIn(leadId);
    const r = await markLinkedInDoneAction(leadId);
    if (r.ok) setLinkedInLeads(prev => prev.filter(l => l.id !== leadId));
    setMarkingLinkedIn(null);
  }

  function linkedInSearchUrl(lead: CampaignLeadRow): string {
    const q = encodeURIComponent(`${lead.first_name ?? ""} ${lead.company}`.trim());
    return `https://www.linkedin.com/search/results/people/?keywords=${q}`;
  }

  function daysSince(iso: string | null): number {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  }

  // ── Convert replied lead to deal ──────────────────────────────────────────────
  const [converting, startConvert] = useTransition();
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertMsg, setConvertMsg] = useState<Record<string, string>>({});

  function convertToDeal(lead: CampaignLeadRow) {
    setConvertingId(lead.id);
    setConvertMsg(prev => ({ ...prev, [lead.id]: "" }));
    startConvert(async () => {
      const r = await convertLeadToDealAction(lead.id);
      setConvertingId(null);
      if (!r.ok) {
        // If deal already exists, still surface the link
        if ("dealId" in r && r.dealId) {
          window.location.href = `/dashboard/${r.dealId}`;
        } else {
          setConvertMsg(prev => ({ ...prev, [lead.id]: r.error ?? "Failed." }));
        }
        return;
      }
      // Remove from replied list and navigate to the new deal
      setLeads(prev => prev.filter(l => l.id !== lead.id));
      window.location.href = `/dashboard/${r.dealId}`;
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

        {/* ── Replies inbox ── only shown when there are replied leads ───────── */}
        {leads.filter(l => l.status === "replied").length > 0 && (() => {
          const replied = leads.filter(l => l.status === "replied");
          return (
            <div style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>📬</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#1e3a5f", margin: 0 }}>
                    {replied.length} {replied.length === 1 ? "Reply" : "Replies"} — act now
                  </p>
                  <p style={{ fontSize: 12, color: "#3b5a8a", margin: "2px 0 0" }}>
                    These companies replied to your outreach. Convert them to a deal to start the full pipeline.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
                {replied.map(lead => (
                  <div key={lead.id} style={{ background: "#fff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const }}>
                    {/* Avatar */}
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#dbeafe", color: "#1d4ed8", fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {lead.company.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: INK }}>{lead.company}</p>
                      <p style={{ margin: 0, fontSize: 12, color: MID }}>{lead.email}</p>
                      {lead.sent_at && (
                        <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>Sent {fmtDate(lead.sent_at)}{lead.sent_by ? ` by ${lead.sent_by}` : ""}</p>
                      )}
                    </div>

                    {/* Hint */}
                    <div style={{ fontSize: 12, color: "#3b5a8a", background: "#eff6ff", borderRadius: 6, padding: "4px 10px", flexShrink: 0 }}>
                      Check inbox → reply → convert
                    </div>

                    {/* Error */}
                    {convertMsg[lead.id] && (
                      <p style={{ fontSize: 12, color: "#b91c1c", margin: 0, width: "100%" }}>{convertMsg[lead.id]}</p>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => convertToDeal(lead)}
                        disabled={converting && convertingId === lead.id}
                        style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                        {converting && convertingId === lead.id ? "Creating…" : "Convert to Deal →"}
                      </button>
                      <button
                        onClick={() => handleStatusChange(lead.id, "suppressed")}
                        style={{ background: "none", border: "1px solid #bfdbfe", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* LinkedIn Follow-up Queue */}
        <div style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "20px 24px", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, marginBottom: linkedInLoaded ? 16 : 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔗</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#14532d", margin: 0 }}>LinkedIn Follow-up Queue</p>
                <p style={{ fontSize: 12, color: "#166534", margin: "2px 0 0" }}>
                  Leads emailed 3+ days ago with no reply — time to connect on LinkedIn.
                </p>
              </div>
            </div>
            {!linkedInLoaded ? (
              <button onClick={loadLinkedIn} disabled={loadingLinkedIn}
                style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                {loadingLinkedIn ? "Loading…" : "Check follow-ups"}
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "#166534", fontWeight: 600 }}>
                {linkedInLeads.length === 0 ? "All caught up ✓" : `${linkedInLeads.length} due`}
              </span>
            )}
          </div>

          {linkedInLoaded && linkedInLeads.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {linkedInLeads.map(lead => (
                <div key={lead.id} style={{ background: "#fff", border: "1px solid #bbf7d0", borderRadius: 9, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" as const }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {lead.company.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: INK }}>{lead.company}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: MID }}>
                      {lead.first_name ?? ""}{lead.first_name ? " · " : ""}{lead.email}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, background: "#fef9ec", color: "#92400e", border: "1px solid #fde68a", borderRadius: 12, padding: "2px 8px", fontWeight: 700, flexShrink: 0 }}>
                    {daysSince(lead.sent_at)}d since email
                  </span>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <a href={linkedInSearchUrl(lead)} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0a66c2", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" as const }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
                      Find on LinkedIn
                    </a>
                    <button onClick={() => markLinkedIn(lead.id)} disabled={markingLinkedIn === lead.id}
                      style={{ background: "#fff", color: "#16a34a", border: "1.5px solid #86efac", borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" as const }}>
                      {markingLinkedIn === lead.id ? "…" : "✓ Done"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {linkedInLoaded && linkedInLeads.length === 0 && (
            <p style={{ fontSize: 13, color: "#16a34a", margin: 0 }}>
              No leads are due for LinkedIn follow-up right now. Check back after your next email batch.
            </p>
          )}
        </div>

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

          {/* Card-based lead list — no horizontal scroll */}
          <div>
            {filteredLeads.length === 0 && (
              <p style={{ padding: "28px 24px", color: MID, textAlign: "center", fontSize: 13 }}>No leads match your filter.</p>
            )}
            {filteredLeads.map((lead) => (
              <div key={lead.id} style={{
                borderTop: `1px solid ${BORDER}`,
                padding: "12px 20px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap" as const,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                  background: TEAL + "18", color: TEAL, fontWeight: 700, fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {lead.company.charAt(0).toUpperCase()}
                </div>

                {/* Company + contact */}
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: INK, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lead.company}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: MID, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lead.first_name ? `${lead.first_name} · ` : ""}{lead.email}
                  </p>
                </div>

                {/* Sender */}
                <div style={{ flexShrink: 0 }}>
                  <SenderChip name={lead.sent_by} />
                </div>

                {/* Status chip + error */}
                <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <StatusCell lead={lead} onChanged={handleStatusChange} />
                  {lead.error && (
                    <span title={lead.error} style={{ fontSize: 14, cursor: "help" }}>⚠️</span>
                  )}
                </div>

                {/* Date */}
                <div style={{ marginLeft: "auto", fontSize: 12, color: MID, flexShrink: 0, whiteSpace: "nowrap" as const }}>
                  {fmtDate(lead.sent_at)}
                </div>
              </div>
            ))}
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
