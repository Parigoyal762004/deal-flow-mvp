import { NextRequest, NextResponse } from "next/server";

// POST /api/find-email
// Body: { firstName, lastName, domain }
//
// Smart two-step Hunter flow — avoids unnecessary API calls:
// - Finder confidence >= 85  → trust it, skip Verifier (save 1 credit)
// - Finder confidence 30-84  → run Verifier to confirm
// - Finder confidence < 30   → skip Verifier, flag as unverified (low confidence anyway)
// - Not found                → return not found

async function findEmail(apiKey: string, domain: string, firstName: string, lastName?: string) {
  const url = new URL("https://api.hunter.io/v2/email-finder");
  url.searchParams.set("domain",     domain);
  url.searchParams.set("first_name", firstName);
  if (lastName) url.searchParams.set("last_name", lastName);
  url.searchParams.set("api_key",    apiKey);

  const res  = await fetch(url.toString());
  const data = await res.json();

  const email = data?.data?.email ?? null;
  const score = data?.data?.score ?? 0; // Hunter confidence 0-100
  return { email, score };
}

async function verifyEmail(apiKey: string, email: string) {
  const url = new URL("https://api.hunter.io/v2/email-verifier");
  url.searchParams.set("email",   email);
  url.searchParams.set("api_key", apiKey);

  const res  = await fetch(url.toString());
  const data = await res.json();

  const status = data?.data?.status; // "valid" | "invalid" | "accept_all" | "unknown"
  const result = data?.data?.result; // "deliverable" | "undeliverable" | "risky" | "unknown"
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
    const { email, score } = await findEmail(apiKey, cleanDomain, firstName, lastName);

    if (!email) {
      return NextResponse.json({ found: false, verified: false, email: null, score: 0 });
    }

    // Step 2: Decide whether to verify based on confidence score
    // High confidence (>=85): trust Hunter, skip Verifier — saves 1 credit
    if (score >= 85) {
      console.log(`[find-email] ${email} — score: ${score} (high confidence, skipping verifier)`);
      return NextResponse.json({ found: true, verified: true, email, score, verifierUsed: false });
    }

    // Very low confidence (<30): not worth verifying, flag for manual check
    if (score < 30) {
      console.log(`[find-email] ${email} — score: ${score} (too low, skipping verifier)`);
      return NextResponse.json({ found: true, verified: false, email, score, verifierUsed: false });
    }

    // Medium confidence (30-84): run Verifier to be sure
    const { verified, status, result } = await verifyEmail(apiKey, email);
    console.log(`[find-email] ${email} — score: ${score}, status: ${status}, result: ${result}`);

    return NextResponse.json({ found: true, verified, email, score, status, result, verifierUsed: true });

  } catch (err) {
    console.error("[find-email] Hunter API error:", err);
    return NextResponse.json({ error: "Hunter API request failed" }, { status: 500 });
  }
}
