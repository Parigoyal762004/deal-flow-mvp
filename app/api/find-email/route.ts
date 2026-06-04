import { NextRequest, NextResponse } from "next/server";

// POST /api/find-email
// Body: { firstName, lastName, domain }
// Calls Hunter.io Email Finder API — key stays server-side

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

  const url = new URL("https://api.hunter.io/v2/email-finder");
  url.searchParams.set("domain",     cleanDomain);
  url.searchParams.set("first_name", firstName);
  if (lastName) url.searchParams.set("last_name", lastName);
  url.searchParams.set("api_key",    apiKey);

  try {
    const res  = await fetch(url.toString());
    const data = await res.json();

    if (data?.data?.email) {
      return NextResponse.json({
        found:  true,
        email:  data.data.email,
        score:  data.data.score ?? 0,   // confidence 0-100
      });
    }

    return NextResponse.json({ found: false, email: null });
  } catch (err) {
    console.error("[find-email] Hunter API error:", err);
    return NextResponse.json({ error: "Hunter API request failed" }, { status: 500 });
  }
}
