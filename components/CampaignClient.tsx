"use client";
import { useState, useTransition } from "react";
import { runBatchAction, runTestAction, getLeadsAction } from "@/app/campaign/actions";
import type { CampaignLeadRow, CampaignStats } from "@/lib/campaign";

const TEAL = "#295757", GOLD = "#d4af35", INK = "#1a2e2e", MID = "#4a6060", OFF = "#f7f8f6", BORDER = "#dde3e0";

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  sent:       { bg: "#dcfce7", color: "#166534", label: "Sent" },
  replied:    { bg: "#dbeafe", color: "#1d4ed8", label: "Replied" },
  bounced:    { bg: "#fee2e2", color: "#991b1b", label: "Bounced" },
  skipped:    { bg: "#f3f4f6", color: "#6b7280", label: "Skipped" },
  suppressed: { bg: "#f3f4f6", color: "#6b7280", label: "Suppressed" },
  new:        { bg: "#fef9ec", color: "#92400e", label: "Queued" },
};

function StatusChip({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { bg: "#f3f4f6", color: "#374151", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 20 }}>
      {s.label}
    </span>
  );
}

function Stat({ label, value, color = INK }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: 30, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value.toLocaleString("en-IN")}</p>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MID, margin: "8px 0 0" }}>{label}</p>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  stats: CampaignStats;
  leads: CampaignLeadRow[];
  batchSize: number;
  currentUser: string;
}

export default function CampaignClient({ stats: initial, leads: initialLeads, batchSize, currentUser }: Props) {
  const [stats, setStats] = useState(initial);
  const [leads, setLeads] = useState(initialLeads);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string>("");
  const [testEmail, setTestEmail] = useState("");
  const [testMsg, setTestMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function send() {
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

  function sendTest() {
    setTestMsg("");
    startTest(async () => {
      const r = await runTestAction(testEmail);
      setTestMsg(r.ok ? `Test sent to ${testEmail} — check the inbox.` : `Error: ${r.error}`);
    });
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
    const matchQuery = !q || l.company.toLowerCase().includes(q) || (l.first_name ?? "").toLowerCase().includes(q) || l.email.toLowerCase().includes(q);
    return matchStatus && matchQuery;
  });

  const sentCount = leads.filter(l => ["sent", "replied", "bounced", "skipped"].includes(l.status)).length;

  return (
    <div style={{ minHeight: "100vh", background: OFF, padding: "40px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, margin: "0 0 6px" }}>Akro Ventures · Lending Outreach</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.01em" }}>Campaign</h1>
        <p style={{ fontSize: 14, color: MID, margin: "8px 0 28px" }}>
          Templated lending-services outreach{currentUser ? ` · signed in as ${currentUser}` : ""}. {batchSize} per day, verified and throttled.
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

        {/* Send today's batch */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 24px", marginBottom: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Send today&apos;s {batchSize}</p>
          <p style={{ fontSize: 13, color: MID, margin: "0 0 16px" }}>Takes the next {batchSize} highest-priority leads, verifies each address, and sends from your mailbox with a CC to yourself.</p>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              disabled={pending || stats.new === 0}
              style={{ background: stats.new === 0 ? "#cbd5d5" : TEAL, color: "#fff", border: "none", borderRadius: 8, padding: "11px 22px", fontSize: 14, fontWeight: 600, cursor: pending || stats.new === 0 ? "default" : "pointer" }}
            >
              {pending ? "Sending…" : stats.new === 0 ? "No leads left" : `Send ${Math.min(batchSize, stats.new)} now`}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: INK, fontWeight: 600 }}>Send {Math.min(batchSize, stats.new)} real emails now?</span>
              <button onClick={send} disabled={pending} style={{ background: GOLD, color: INK, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Yes, send</button>
              <button onClick={() => setConfirming(false)} style={{ background: "none", border: "none", color: MID, fontSize: 13, cursor: "pointer" }}>cancel</button>
            </div>
          )}
          {result && <p style={{ fontSize: 13, color: result.startsWith("Error") ? "#b91c1c" : "#166534", margin: "14px 0 0", fontWeight: 500 }}>{result}</p>}
        </div>

        {/* Test send */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 24px", marginBottom: 32 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Send yourself a test first</p>
          <p style={{ fontSize: 13, color: MID, margin: "0 0 14px" }}>See exactly what a lead receives before you send the batch. The email will come from your mailbox and CC you.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              style={{ flex: 1, minWidth: 240, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none" }}
            />
            <button onClick={sendTest} disabled={testing || !testEmail.includes("@")} style={{ background: "#fff", color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: testing ? "default" : "pointer" }}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          {testMsg && <p style={{ fontSize: 13, color: testMsg.startsWith("Error") ? "#b91c1c" : "#166534", margin: "12px 0 0" }}>{testMsg}</p>}
        </div>

        {/* Leads table */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          {/* Table header */}
          <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>Lead List</p>
              <p style={{ fontSize: 12, color: MID, margin: "3px 0 0" }}>{sentCount} contacted · {stats.new} remaining</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search company or email…"
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, outline: "none", minWidth: 200 }}
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, color: INK, background: "#fff", outline: "none" }}
              >
                <option value="all">All statuses</option>
                <option value="new">Queued</option>
                <option value="sent">Sent</option>
                <option value="replied">Replied</option>
                <option value="bounced">Bounced</option>
                <option value="skipped">Skipped</option>
              </select>
              <button onClick={refreshLeads} disabled={pending} style={{ background: "none", border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 12, color: MID, cursor: "pointer" }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: OFF }}>
                  <th style={{ textAlign: "left", padding: "10px 20px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>Company</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>Contact</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>Email</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MID, whiteSpace: "nowrap" }}>Date Sent</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "28px 20px", color: MID, textAlign: "center", fontSize: 13 }}>No leads match your filter.</td></tr>
                )}
                {filteredLeads.map((lead, i) => (
                  <tr key={lead.id} style={{ borderTop: `1px solid ${BORDER}`, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "11px 20px", color: INK, fontWeight: 600, whiteSpace: "nowrap" }}>{lead.company}</td>
                    <td style={{ padding: "11px 16px", color: MID, whiteSpace: "nowrap" }}>{lead.first_name ?? ""}</td>
                    <td style={{ padding: "11px 16px", color: MID, fontSize: 12 }}>{lead.email}</td>
                    <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                      <StatusChip status={lead.status} />
                      {lead.error && <span style={{ marginLeft: 6, fontSize: 11, color: "#b91c1c" }} title={lead.error}>⚠</span>}
                    </td>
                    <td style={{ padding: "11px 16px", color: MID, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(lead.sent_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length > 0 && (
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${BORDER}`, fontSize: 12, color: MID }}>
              Showing {filteredLeads.length} of {leads.length} leads
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
