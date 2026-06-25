"use client";
import { useState, useTransition } from "react";
import { runBatchAction, runTestAction } from "@/app/campaign/actions";

const TEAL = "#295757", GOLD = "#d4af35", INK = "#1a2e2e", MID = "#4a6060", OFF = "#f7f8f6", BORDER = "#dde3e0";

interface Stats { total: number; new: number; sent: number; replied: number; bounced: number; skipped: number; suppressed: number; }

function Stat({ label, value, color = INK }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: 30, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value.toLocaleString("en-IN")}</p>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MID, margin: "8px 0 0" }}>{label}</p>
    </div>
  );
}

export default function CampaignClient({ stats: initial, batchSize }: { stats: Stats; batchSize: number }) {
  const [stats, setStats] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<string>("");
  const [testEmail, setTestEmail] = useState("pari.goyal@akroventures.com");
  const [testMsg, setTestMsg] = useState("");
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();

  function send() {
    setConfirming(false);
    setResult("");
    startTransition(async () => {
      const r = await runBatchAction(batchSize);
      if (!r.ok) { setResult(`Error: ${r.error}`); return; }
      setStats(r.stats);
      setResult(`Sent ${r.res.sent} · skipped ${r.res.skipped} (no mail server) · failed ${r.res.failed}.`);
    });
  }

  function sendTest() {
    setTestMsg("");
    startTest(async () => {
      const r = await runTestAction(testEmail);
      setTestMsg(r.ok ? `Test sent to ${testEmail} - check the inbox.` : `Error: ${r.error}`);
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: OFF, padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, margin: "0 0 6px" }}>Akro Ventures · Lending Outreach</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: INK, margin: 0, letterSpacing: "-0.01em" }}>Campaign</h1>
        <p style={{ fontSize: 14, color: MID, margin: "8px 0 28px" }}>Templated lending-services outreach from pari.goyal@akroventures.com. {batchSize} per day, verified and throttled. No per-email review.</p>

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
          <p style={{ fontSize: 13, color: MID, margin: "0 0 16px" }}>Takes the next {batchSize} highest-priority leads, verifies each address, and sends. This goes out immediately, for real.</p>

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
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "22px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Send yourself a test first</p>
          <p style={{ fontSize: 13, color: MID, margin: "0 0 14px" }}>See exactly what a lead receives before you send the batch.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              style={{ flex: 1, minWidth: 240, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, outline: "none" }}
            />
            <button onClick={sendTest} disabled={testing} style={{ background: "#fff", color: TEAL, border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: testing ? "default" : "pointer" }}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
          {testMsg && <p style={{ fontSize: 13, color: testMsg.startsWith("Error") ? "#b91c1c" : "#166534", margin: "12px 0 0" }}>{testMsg}</p>}
        </div>

      </div>
    </div>
  );
}
