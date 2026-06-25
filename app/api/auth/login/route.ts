import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { verifyUser } from "@/lib/users";

// Basic in-memory rate limit per IP: 8 failed attempts / 15 min -> 429.
// (Per warm instance, not bulletproof on serverless, but it meaningfully
// slows password guessing without extra infra.)
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;
const attempts = new Map<string, { count: number; first: number }>();

function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
function tooManyAttempts(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) return false;
  return rec.count >= MAX_FAILS;
}
function recordFail(ip: string) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.first > WINDOW_MS) attempts.set(ip, { count: 1, first: now });
  else rec.count++;
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (tooManyAttempts(ip)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
  }

  let username = "";
  let password = "";
  try {
    const body = await req.json();
    // Accept `username` (new) or `email` (legacy field name) from the client.
    username = body.username ?? body.email ?? "";
    password = body.password ?? "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const user = await verifyUser(username, password);
  if (!user) {
    recordFail(ip);
    return NextResponse.json({ error: "Wrong username or password" }, { status: 401 });
  }

  attempts.delete(ip); // success clears the counter

  const token = await createSessionToken(user.username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
  return res;
}
