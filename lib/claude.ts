import Groq from "groq-sdk";
import { extractText } from "unpdf";
import { AKRO_KNOWLEDGE_BASE } from "./akro-knowledge";
import { buildPersonalisedDraft } from "./email";
import type { Deal } from "./types";

export interface ClaudeAnalysis {
  summary: string;
  draftEmail: string;
}

// ─── Metadata-only summary fallback (no AI) ───────────────────────────────────
function buildMetaSummary(deal: Deal): string {
  const stage = deal.stage ? deal.stage.replace(/-/g, " ") : "";
  const industry = deal.industry ?? "";
  const parts = [stage, industry].filter(Boolean).join(" ");
  return (
    `${deal.startup_name} is a ${parts} startup founded by ${deal.founder_name}, ` +
    `sourced via ${deal.source}.` +
    (deal.notes ? ` Notes: ${deal.notes}` : "")
  );
}

// ─── Main analysis function ───────────────────────────────────────────────────
export async function analyzePitchDeck(deal: Deal): Promise<ClaudeAnalysis> {
  // Founder email is ALWAYS template-based — fast, reliable, no AI dependency
  const draftEmail = buildPersonalisedDraft(deal);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[groq] GROQ_API_KEY not set — using metadata summary.");
    return { summary: buildMetaSummary(deal), draftEmail };
  }

  try {
    const client = new Groq({ apiKey });

    // 1. Extract text from pitch deck PDF if available
    let pdfText = "";
    if (deal.pitch_deck_url) {
      try {
        const response = await fetch(deal.pitch_deck_url);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
          pdfText = Array.isArray(text) ? text.join(" ").trim() : (text ?? "").trim();
          console.log(`[groq] Extracted ${pdfText.length} chars from PDF`);
        }
      } catch (fetchErr) {
        console.warn("[groq] Could not fetch/parse pitch deck PDF:", fetchErr);
      }
    }

    // 2. Build prompt — summary only, no draft email needed
    const pitchDeckSection = pdfText.length > 100
      ? `\n\n--- PITCH DECK CONTENT ---\n${pdfText.slice(0, 8000)}\n--- END PITCH DECK ---`
      : "\n\n(No pitch deck provided — use the metadata and notes below.)";

    const prompt = `${AKRO_KNOWLEDGE_BASE}

====================================================
YOUR TASK
====================================================
You are the senior deal analyst at Akro Ventures. A new deal has come through the pipeline.
Produce a concise internal analysis for the Akro team.

DEAL DETAILS:
Startup: ${deal.startup_name}
Founder: ${deal.founder_name}
Industry: ${deal.industry ?? "N/A"}
Stage: ${deal.stage ?? "N/A"}
Source: ${deal.source}
Website: ${deal.website_url ?? "N/A"}
Internal notes: ${deal.notes ?? "None"}${pitchDeckSection}

Respond with ONLY valid JSON — no markdown, no code fences, no extra text:
{
  "summary": "3-4 sentences: what the startup does, traction/stage, market opportunity. Be factual and specific.",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "risks": ["risk 1", "risk 2"],
  "relevant_service": "Startup Fundraising / Startup Consultation / Unsecured Loan / Secured Loan / Project Funding / FDI & ECB"
}`;

    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    console.log("[groq] Raw response length:", raw.length, "| preview:", raw.slice(0, 120));

    // Robust JSON extraction — find outermost { ... }
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error(`No JSON found in response: ${raw.slice(0, 80)}`);
    }
    const parsed = JSON.parse(raw.slice(firstBrace, lastBrace + 1));

    const summary = [
      parsed.summary ?? buildMetaSummary(deal),
      parsed.strengths?.length
        ? "\n\nStrengths:\n" + parsed.strengths.map((s: string) => `• ${s}`).join("\n")
        : "",
      parsed.risks?.length
        ? "\n\nRisks:\n" + parsed.risks.map((r: string) => `• ${r}`).join("\n")
        : "",
      parsed.relevant_service
        ? `\n\nRecommended Service: ${parsed.relevant_service}`
        : "",
    ].join("");

    return { summary, draftEmail };
  } catch (err) {
    console.error("[groq] Analysis failed:", err);
    return { summary: buildMetaSummary(deal), draftEmail: buildPersonalisedDraft(deal) };
  }
}
