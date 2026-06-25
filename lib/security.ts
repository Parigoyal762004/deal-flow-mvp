// Shared security helpers used across API routes.
//
// Threat model this addresses:
//  - Stored XSS: escapeHtml() for any attacker-controlled value rendered into HTML.
//  - Open-redirect / javascript: URL XSS: safeHttpUrl() allow-lists http(s) only.
//  - Cost/DoS/spam abuse: rateLimit() throttles expensive public endpoints.
//  - CSRF on mutating authed routes: isSameOrigin() rejects cross-site form posts.
//
// NOTE: rateLimit is in-memory and therefore per-serverless-instance (best-effort
// on Vercel). It meaningfully slows abuse without extra infra; for hard global
// limits, back it with Upstash/Redis later.

import type { NextRequest } from "next/server";

// ── HTML escaping ─────────────────────────────────────────────────────────
const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
export function escapeHtml(input: unknown): string {
  return String(input ?? "").replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

// ── URL allow-listing ─────────────────────────────────────────────────────
// Returns a normalised http(s) URL string, or null if missing/unsafe.
// Blocks javascript:, data:, vbscript:, file:, etc.
export function safeHttpUrl(raw: unknown, maxLen = 2000): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.length > maxLen) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// ── Email shape check (defence in depth; DB still stores as text) ──────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(raw: unknown, maxLen = 320): boolean {
  return typeof raw === "string" && raw.length <= maxLen && EMAIL_RE.test(raw.trim());
}

// Trim + length-cap a free-text field. Returns "" for non-strings.
export function clampText(raw: unknown, maxLen: number): string {
  if (typeof raw !== "string") return "";
  const s = raw.trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

// ── Client IP (Vercel sets x-forwarded-for; left-most is the client) ───────
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

// ── In-memory sliding-window rate limiter ──────────────────────────────────
type Bucket = { count: number; first: number };
const buckets = new Map<string, Bucket>();

// Returns true if the request is ALLOWED, false if it should be blocked (429).
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  // Probabilistic sweep (~1% of calls) so the Map can't grow unbounded.
  if (Math.random() < 0.01) sweepRateLimits();
  const b = buckets.get(key);
  if (!b || now - b.first > windowMs) {
    buckets.set(key, { count: 1, first: now });
    return true;
  }
  b.count++;
  return b.count <= max;
}

// Opportunistic cleanup so the Map can't grow unbounded on a warm instance.
export function sweepRateLimits(maxAgeMs = 60 * 60 * 1000): void {
  const now = Date.now();
  for (const [k, b] of buckets) if (now - b.first > maxAgeMs) buckets.delete(k);
}

// ── CSRF: reject cross-site requests to mutating authed endpoints ──────────
// Compares the request Origin (or Referer) host to the Host header. Same-site
// cookies already block most CSRF; this is belt-and-braces.
export function isSameOrigin(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const origin = req.headers.get("origin") || req.headers.get("referer");
  if (!origin) return true; // non-browser / same-origin server calls have none
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
