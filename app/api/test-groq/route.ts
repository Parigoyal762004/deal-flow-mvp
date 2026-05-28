import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export const maxDuration = 20;
export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GROQ_API_KEY;

  const results: Record<string, string> = {
    groq_key_set: apiKey ? "yes" : "NO — env var missing",
    groq_key_prefix: apiKey ? apiKey.slice(0, 8) + "..." : "N/A",
  };

  if (apiKey) {
    try {
      const client = new Groq({ apiKey });
      const res = await client.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Reply with exactly: GROQ_OK" }],
        max_tokens: 10,
      });
      results.groq_call = res.choices[0]?.message?.content ?? "empty";
    } catch (e: unknown) {
      results.groq_call = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(results);
}
