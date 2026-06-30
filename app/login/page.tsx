"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

const TEAL = "#1A4A44", GOLD = "#D4A017", INK = "#28112B", MID = "#453643", BORDER = "#d6e5e2", OFF = "#E5F4E3";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const label: React.CSSProperties = {
    display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
    textTransform: "uppercase", color: MID, margin: "16px 0 6px",
  };
  const input: React.CSSProperties = {
    width: "100%", padding: "11px 13px", borderRadius: 8, border: `1.5px solid ${BORDER}`,
    fontSize: 15, color: INK, outline: "none", background: "#fff", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "calc(100vh - 56px)", display: "flex", alignItems: "center", justifyContent: "center", background: OFF, padding: 24 }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 380, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 16, padding: "36px 32px", boxShadow: "0 1px 3px rgba(26,46,46,0.06)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/akro-logo.png" alt="Akro Ventures" style={{ height: 38, width: "auto", display: "block", marginBottom: 26 }} />

        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: GOLD, margin: "0 0 6px" }}>Team access</p>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, margin: "0 0 4px", letterSpacing: "-0.01em" }}>Sign in to Deal Flow</h1>
        <p style={{ fontSize: 13, color: MID, margin: 0 }}>This area is for the Akro Ventures team.</p>

        <label style={label}>Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="pari, rohit, eva, akshita" required style={input} />

        <label style={label}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            style={{ ...input, paddingRight: 42 }}
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 0, display: "flex", alignItems: "center" }}
            tabIndex={-1}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </div>

        {error && <p style={{ fontSize: 12.5, color: "#b91c1c", margin: "12px 0 0" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 22, width: "100%", padding: "12px", borderRadius: 9, border: "none", background: loading ? "#9bb0b0" : TEAL, color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer" }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
