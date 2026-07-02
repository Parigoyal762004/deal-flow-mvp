"use client";
import { useState, useTransition } from "react";
import { saveGoalAction } from "@/app/my-stats/actions";

interface Stats {
  today:       { sent: number; replied: number };
  week:        { sent: number; replied: number };
  month:       { sent: number; replied: number };
  total:       { sent: number; replied: number };
  deals:       { thisWeek: number; thisMonth: number; total: number };
  weeklyGoal:  number;
  username:    string;
  weekStartISO: string;
}

const TEAL = "#1A4A44", GOLD = "#D4A017", INK = "#28112B", MID = "#4a6060", OFF = "#f7f8f6", BORDER = "#dde3e0";

const USER_COLOR: Record<string, string> = {
  pari: "#1A4A44", rohit: "#d97706", eva: "#7c3aed", akshita: "#be185d",
};

function StatCard({ label, value, sub, color = INK }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: 30, fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value.toLocaleString("en-IN")}</p>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: MID, margin: "6px 0 0" }}>{label}</p>
      {sub && <p style={{ fontSize: 11, color: "#9ca3af", margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function PeriodBlock({ title, sent, replied, deals }: { title: string; sent: number; replied: number; deals?: number }) {
  const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;
  return (
    <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: GOLD, margin: "0 0 12px" }}>{title}</p>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const }}>
        <div>
          <p style={{ fontSize: 24, fontWeight: 700, color: TEAL, margin: 0 }}>{sent}</p>
          <p style={{ fontSize: 11, color: MID, margin: "3px 0 0" }}>Emails sent</p>
        </div>
        <div>
          <p style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: 0 }}>{replied}</p>
          <p style={{ fontSize: 11, color: MID, margin: "3px 0 0" }}>Replies</p>
        </div>
        {deals !== undefined && (
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#7c3aed", margin: 0 }}>{deals}</p>
            <p style={{ fontSize: 11, color: MID, margin: "3px 0 0" }}>Deals added</p>
          </div>
        )}
        {sent > 0 && (
          <div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#16a34a", margin: 0 }}>{replyRate}%</p>
            <p style={{ fontSize: 11, color: MID, margin: "3px 0 0" }}>Reply rate</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyStatsClient({ stats }: { stats: Stats }) {
  const [goal, setGoal]     = useState(stats.weeklyGoal);
  const [input, setInput]   = useState(stats.weeklyGoal > 0 ? String(stats.weeklyGoal) : "");
  const [saved, setSaved]   = useState(false);
  const [err, setErr]       = useState("");
  const [saving, startSave] = useTransition();

  const accentColor = USER_COLOR[stats.username] ?? TEAL;
  const weekPct     = goal > 0 ? Math.min(100, Math.round((stats.week.sent / goal) * 100)) : 0;
  const daysIntoWeek = (() => {
    const startMs = new Date(stats.weekStartISO).getTime();
    const days    = Math.floor((Date.now() - startMs) / 86400000) + 1;
    return Math.min(days, 7);
  })();
  const expectedByNow = goal > 0 ? Math.round((goal / 7) * daysIntoWeek) : 0;
  const onTrack = stats.week.sent >= expectedByNow;

  function saveGoal() {
    const n = parseInt(input, 10);
    if (isNaN(n) || n < 0) { setErr("Enter a valid number."); return; }
    setErr("");
    setSaved(false);
    startSave(async () => {
      const r = await saveGoalAction(n);
      if (r.ok) { setGoal(n); setSaved(true); }
      else setErr(r.error ?? "Failed to save.");
    });
  }

  return (
    <div style={{ minHeight: "100vh", background: OFF, padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: accentColor, color: "#fff", fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {stats.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: GOLD, margin: 0 }}>My Dashboard</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, margin: "2px 0 0" }}>
              {stats.username.charAt(0).toUpperCase() + stats.username.slice(1)}'s Stats
            </h1>
          </div>
        </div>

        {/* Weekly goal + progress */}
        <div style={{ background: "#fff", border: `1.5px solid ${goal > 0 ? (onTrack ? "#bbf7d0" : "#fca5a5") : BORDER}`, borderRadius: 12, padding: "22px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" as const }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: INK, margin: "0 0 4px" }}>Weekly Email Goal</p>
              {goal > 0 ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "0 0 10px" }}>
                    <span style={{ fontSize: 32, fontWeight: 700, color: onTrack ? "#16a34a" : "#b91c1c" }}>{stats.week.sent}</span>
                    <span style={{ fontSize: 16, color: MID }}>/ {goal} this week</span>
                    <span style={{ fontSize: 12, background: onTrack ? "#dcfce7" : "#fee2e2", color: onTrack ? "#15803d" : "#b91c1c", borderRadius: 12, padding: "2px 8px", fontWeight: 700 }}>
                      {weekPct}% · {onTrack ? "On track ✓" : `Behind — target ${expectedByNow} by now`}
                    </span>
                  </div>
                  <div style={{ height: 8, background: "#e5e7eb", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${weekPct}%`, background: onTrack ? "#16a34a" : "#ef4444", borderRadius: 99, transition: "width 0.4s" }} />
                  </div>
                  <p style={{ fontSize: 11, color: MID, margin: "6px 0 0" }}>Day {daysIntoWeek} of 7 · {goal - stats.week.sent > 0 ? `${goal - stats.week.sent} to go` : "Goal reached!"}</p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: MID, margin: 0 }}>No goal set yet. Set a weekly email target to track your progress and get reminder nudges.</p>
              )}
            </div>

            {/* Goal setter */}
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 6, minWidth: 200 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: MID, margin: 0 }}>Set weekly goal</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={input}
                  onChange={e => { setInput(e.target.value); setSaved(false); setErr(""); }}
                  placeholder="e.g. 100"
                  style={{ width: 90, border: `1.5px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", fontSize: 14, color: INK, outline: "none" }}
                />
                <button
                  onClick={saveGoal}
                  disabled={saving}
                  style={{ background: TEAL, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
              {saved && <p style={{ fontSize: 12, color: "#16a34a", margin: 0 }}>Goal saved ✓ — you'll get a daily reminder if you fall behind.</p>}
              {err   && <p style={{ fontSize: 12, color: "#b91c1c", margin: 0 }}>{err}</p>}
            </div>
          </div>
        </div>

        {/* Period breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginBottom: 24 }}>
          <PeriodBlock title="Today"      sent={stats.today.sent}  replied={stats.today.replied} />
          <PeriodBlock title="This Week"  sent={stats.week.sent}   replied={stats.week.replied}  deals={stats.deals.thisWeek} />
          <PeriodBlock title="This Month" sent={stats.month.sent}  replied={stats.month.replied} deals={stats.deals.thisMonth} />
        </div>

        {/* All-time summary */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "20px 24px", marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: GOLD, margin: "0 0 16px" }}>All Time</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16 }}>
            <StatCard label="Emails Sent"  value={stats.total.sent}    color={TEAL} />
            <StatCard label="Replies"       value={stats.total.replied} color="#2563eb" />
            <StatCard label="Reply Rate"    value={stats.total.sent > 0 ? Math.round((stats.total.replied / stats.total.sent) * 100) : 0} sub="%" color="#16a34a" />
            <StatCard label="Deals Added"   value={stats.deals.total}   color="#7c3aed" />
          </div>
        </div>

        <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" as const }}>
          Stats are based on outreach from your account only. Refresh the page to see the latest.
        </p>
      </div>
    </div>
  );
}
