import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendFounderEmail } from "@/lib/email";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { rateLimit, clampText } from "@/lib/security";

export const maxDuration = 30;

// POST /api/send-edited  { token: string, emailBody: string }
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!rateLimit(`send-edited:${user}`, 20, 60 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const raw = await req.json();
    const token     = clampText(raw.token, 36);     // UUIDs are 36 chars
    const emailBody = clampText(raw.emailBody, 50_000);

    if (!token || !emailBody) {
      return NextResponse.json({ error: "Missing token or email body" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Look up deal by approval token
    const { data: deal, error } = await supabase
      .from("deals")
      .select("*")
      .eq("approval_token", token)
      .single();

    if (error || !deal) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    if (deal.approval_status !== "pending") {
      return NextResponse.json(
        { error: `This deal was already ${deal.approval_status}` },
        { status: 409 }
      );
    }

    // 1. Update the draft email in DB with the edited version
    const { error: updateError } = await supabase
      .from("deals")
      .update({
        draft_email: emailBody.trim(),
        approval_status: "approved",
        email_status: "sent",
      })
      .eq("id", deal.id);

    if (updateError) {
      console.error("[send-edited] DB update failed:", updateError);
      return NextResponse.json({ error: "Database update failed" }, { status: 500 });
    }

    // 2. Send the email with the edited body
    const dealWithEditedEmail = { ...deal, draft_email: emailBody.trim() };
    await sendFounderEmail(dealWithEditedEmail);
    console.log(`[send-edited] Edited email sent for deal ${deal.id}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[send-edited] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
