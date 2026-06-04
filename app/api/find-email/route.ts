import { NextRequest, NextResponse } from "next/server";

// POST /api/find-email
// Body: { firstName, lastName, domain }
// Step 1: Hunter Email Finder — find the most likely email for a name + domain
// Step 2: Hunter Email Verifier — confirm the found email is actually deliverable

async function findEmail(apiKey: string, domain: string, firstName: string, lastName?: string) {
  const url = new URL("https://api.hunter.io/v2/email-finder");
  url.searchParams.set("domain",     domain);
  url.searchParams.set("first_name", firstName);
  if (lastName) url.searchParams.set("last_name", lastName);
  url.searchParams.set("api_key",    apiKey);

  const res  = await fetch(url.toString());
  const data = await res.json();
  return data?.data?.email ?? null;
}

async function verifyEmail(apiKey: string, email: string) {
  const url = new URL("https://api.hunter.io/v2/email-verifier");
  url.searchParams.set("email",   email);
  url.searchParams.set("api_key", apiKey);

  const res  = await fetch(url.toString());
  const data = await res.json();

  const status = data?.data?.status;   // "valid" | "invalid" | "accept_all" | "unknown"
  const result = data?.data?.result;   // "deliverable" | "undeliverable" | "risky" | "unknown"

  // Accept "valid" or "accept_all" (catch-all domains that accept everything)
  const verified = status === "valid" || status === "accept_all";
  return { verified, status, result };
}

export async function POST(req: NextRequest) {
  const { firstName, lastName, domain } = await req.json();

  if (!firstName || !domain) {
    return NextResponse.json({ error: "Missing firstName or domain" }, { status: 400 });
  }

  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Hunter API key not configured" }, { status: 500 });
  }

  const cleanDomain = domain
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();

  try {
    // Step 1: Find the email
    const email = await findEmail(apiKey, cleanDomain, firstName, lastName);

    if (!email) {
      return NextResponse.json({ found: false, verified: false, email: null });
    }

    // Step 2: Verify the found email is actually deliverable
    const { verified, status, result } = await verifyEmail(apiKey, email);

    console.log(`[find-email] ${email} — status: ${status}, result: ${result}, verified: ${verified}`);

    return NextResponse.json({ found: true, verified, email, status, result });
  } catch (err) {
    console.error("[find-email] Hunter API error:", err);
    return NextResponse.json({ error: "Hunter API request failed" }, { status: 500 });
  }
}
