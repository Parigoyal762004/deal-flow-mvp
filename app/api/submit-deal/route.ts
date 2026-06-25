import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createServerClient } from "@/lib/supabase-server";
import { analyzePitchDeck } from "@/lib/claude";
import { sendApprovalEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import { DD_ITEMS } from "@/lib/dd-items";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { getUser } from "@/lib/users";
import { clientIp, rateLimit, clampText, isValidEmail, safeHttpUrl } from "@/lib/security";

export const maxDuration = 60; // seconds - Vercel Pro allows up to 300

const VALID_SOURCES = ["Backrr", "LinkedIn", "Referral", "Cold Outreach", "Event", "Other"];
const VALID_STAGES = ["pre-seed", "seed", "series-a", "series-b", "growth", "other"];

export async function POST(req: NextRequest) {
  try {
    // This endpoint is PUBLIC (founders submit here) and expensive (DB write +
    // Claude analysis + email). Throttle hard for anonymous callers; logged-in
    // team members (CSV bulk upload) get a generous ceiling.
    const sessionUser = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
    const owner = sessionUser && getUser(sessionUser) ? sessionUser : null;

    const ip = clientIp(req);
    const ok = owner
      ? rateLimit(`submit:user:${owner}`, 300, 60 * 60 * 1000)       // 300/hour, team
      : rateLimit(`submit:ip:${ip}`, 8, 60 * 1000) && rateLimit(`submit:ip:h:${ip}`, 40, 60 * 60 * 1000); // 8/min & 40/hr, anon
    if (!ok) {
      return NextResponse.json({ error: "Too many submissions. Please slow down." }, { status: 429 });
    }

    const body = await req.json();
    const { id, additional_links } = body;

    // ── Validate + normalise every field (never trust the client) ──────────
    const startup_name = clampText(body.startup_name, 200);
    const founder_name = clampText(body.founder_name, 200);
    const founder_email = clampText(body.founder_email, 320);
    const notes = clampText(body.notes, 5000) || null;
    const industry = clampText(body.industry, 200) || null;
    const source = VALID_SOURCES.includes(body.source) ? body.source : "Backrr";
    const stage = VALID_STAGES.includes(body.stage) ? body.stage : null;
    const website_url = safeHttpUrl(body.website_url);
    const linkedin_url = safeHttpUrl(body.linkedin_url);
    const pitch_deck_url = safeHttpUrl(body.pitch_deck_url);

    if (!startup_name || !founder_name || !founder_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isValidEmail(founder_email)) {
      return NextResponse.json({ error: "Invalid founder email" }, { status: 400 });
    }

    // Links: cap count and scheme-validate each (blocks javascript:/data: hrefs).
    const cleanLinks = Array.isArray(additional_links)
      ? additional_links
          .slice(0, 20)
          .map((l: { label?: unknown; url?: unknown }) => ({
            label: clampText(l?.label, 200),
            url: safeHttpUrl(l?.url),
          }))
          .filter((l) => l.url && l.label)
      : [];

    const supabase = createServerClient();
    const dealId = typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : uuidv4();
    const approvalToken = uuidv4();

    // ── 1. Save deal to Supabase immediately ──────────────────────────────
    const { data: deal, error: dbError } = await supabase
      .from("deals")
      .insert({
        id: dealId,
        startup_name,
        founder_name,
        founder_email,
        website_url,
        linkedin_url,
        additional_links: cleanLinks,
        notes,
        source,
        industry,
        stage,
        pitch_deck_url,
        owner,
        email_status: "pending",
        approval_status: "pending",
        approval_token: approvalToken,
        draft_email: null,
        ai_summary: null,
      })
      .select()
      .single();

    if (dbError || !deal) {
      console.error("Supabase insert error:", dbError);
      return NextResponse.json({ error: dbError?.message ?? "DB error" }, { status: 500 });
    }

    // ── 2. Seed DD checklist rows synchronously (fast, 26 rows) ──────────
    const checklistSeed = DD_ITEMS.map((item) => ({
      deal_id: dealId,
      item_key: item.key,
      item_label: item.label,
      applicable_to: item.applicableTo,
      status: "pending" as const,
      notes: null,
    }));
    await supabase.from("dd_checklist").insert(checklistSeed);

    // ── 3. Return success immediately - don't make user wait for Claude ───
    // ── 4. Process in background (Claude + email) ─────────────────────────
    waitUntil(processInBackground(deal));

    return NextResponse.json({ success: true, dealId }, { status: 201 });
  } catch (err) {
    console.error("submit-deal error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processInBackground(deal: Record<string, unknown>) {
  const supabase = createServerClient();

  try {
    // Step 1: Analyse pitch deck with Claude
    console.log(`[process] Analysing deal ${deal.id} - ${deal.startup_name}`);
    const { summary, draftEmail } = await analyzePitchDeck(deal as unknown as Parameters<typeof analyzePitchDeck>[0]);

    // Step 2: Save draft + summary to Supabase
    const { error: updateError } = await supabase
      .from("deals")
      .update({
        ai_summary: summary,
        draft_email: draftEmail,
        email_status: "awaiting_approval",
      })
      .eq("id", deal.id as string);

    if (updateError) {
      console.error("[process] Supabase update failed:", updateError);
      return;
    }

    // Step 3: Fetch updated deal (with approval_token etc.)
    const { data: updatedDeal } = await supabase
      .from("deals")
      .select("*")
      .eq("id", deal.id as string)
      .single();

    if (!updatedDeal) return;

    // Step 4: Send internal approval email to team
    await sendApprovalEmail(updatedDeal);
    console.log(`[process] Approval email sent for deal ${deal.id}`);
  } catch (err) {
    console.error("[process] Background processing failed:", err);
    // Mark as failed in DB
    await supabase
      .from("deals")
      .update({ email_status: "failed" })
      .eq("id", deal.id as string);
  }
}
