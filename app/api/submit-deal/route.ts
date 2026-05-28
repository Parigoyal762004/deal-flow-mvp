import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createServerClient } from "@/lib/supabase-server";
import { analyzePitchDeck } from "@/lib/claude";
import { sendApprovalEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

export const maxDuration = 60; // seconds — Vercel Pro allows up to 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      startup_name,
      founder_name,
      founder_email,
      website_url,
      linkedin_url,
      additional_links,
      notes,
      source,
      industry,
      stage,
      pitch_deck_url,
    } = body;

    if (!startup_name || !founder_name || !founder_email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createServerClient();
    const dealId = id ?? uuidv4();
    const approvalToken = uuidv4();

    // ── 1. Save deal to Supabase immediately ──────────────────────────────
    const { data: deal, error: dbError } = await supabase
      .from("deals")
      .insert({
        id: dealId,
        startup_name,
        founder_name,
        founder_email,
        website_url: website_url || null,
        linkedin_url: linkedin_url || null,
        additional_links: additional_links ?? [],
        notes: notes || null,
        source: source ?? "Backrr",
        industry,
        stage,
        pitch_deck_url: pitch_deck_url || null,
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

    // ── 2. Return success immediately — don't make user wait for Claude ───
    // ── 3. Process in background (Claude + email) ─────────────────────────
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
    console.log(`[process] Analysing deal ${deal.id} — ${deal.startup_name}`);
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
