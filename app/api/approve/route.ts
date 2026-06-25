import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendFounderEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/security";

export const maxDuration = 30;

// GET /api/approve?token=<uuid>&action=approve|reject
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token  = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token || !["approve", "reject"].includes(action ?? "")) {
    return html("Invalid Request", "The approval link is invalid or malformed.", false);
  }

  const supabase = createServerClient();

  // Look up deal by approval token
  const { data: deal, error } = await supabase
    .from("deals")
    .select("*")
    .eq("approval_token", token)
    .single();

  if (error || !deal) {
    return html("Not Found", "This approval link is invalid or has already been used.", false);
  }

  // Guard: already processed
  if (deal.approval_status !== "pending") {
    const label = deal.approval_status === "approved" ? "approved" : "rejected";
    return html(
      "Already Processed",
      `This deal was already <strong>${label}</strong>. No further action needed.`,
      deal.approval_status === "approved"
    );
  }

  const isApprove = action === "approve";

  // Update Supabase
  const { error: updateError } = await supabase
    .from("deals")
    .update({
      approval_status: isApprove ? "approved" : "rejected",
      email_status:    isApprove ? "sent" : "failed",
    })
    .eq("id", deal.id);

  if (updateError) {
    console.error("Approval update error:", updateError);
    return html("Error", "Database update failed. Please try again.", false);
  }

  // If approved - send email to founder
  if (isApprove) {
    try {
      await sendFounderEmail(deal);
      console.log(`[approve] Founder email sent for deal ${deal.id}`);
    } catch (emailErr) {
      console.error("[approve] Failed to send founder email:", emailErr);
      // Don't fail the page - email issue logged in Vercel
    }
  }

  // Escape DB-stored, originally user-submitted values before placing them into
  // the HTML response — these come from the public submit form (stored XSS sink).
  const startup = escapeHtml(deal.startup_name);
  const founder = escapeHtml(deal.founder_name);
  const title   = isApprove ? `Approved - ${startup}` : `Rejected - ${startup}`;
  const message = isApprove
    ? `The response email to <strong>${founder}</strong> at <strong>${startup}</strong> has been sent.`
    : `The draft email for <strong>${startup}</strong> was rejected. No email will be sent to the founder.`;

  return html(title, message, isApprove);
}

function html(title: string, message: string, success: boolean) {
  const color  = success ? "#16a34a" : "#dc2626";
  const bgCol  = success ? "#f0fdf4" : "#fef2f2";
  const border = success ? "#bbf7d0" : "#fecaca";
  const icon   = success ? "✓" : "✕";

  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${title}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#fff;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 4px 24px rgba(0,0,0,.06);padding:48px 40px;max-width:480px;width:100%;text-align:center}
    .icon{width:56px;height:56px;border-radius:50%;background:${bgCol};border:2px solid ${border};display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:22px;color:${color};font-weight:700}
    h1{font-size:20px;font-weight:600;color:#0f172a;margin-bottom:12px}
    p{font-size:14px;color:#64748b;line-height:1.6}
    .brand{margin-top:32px;font-size:12px;color:#94a3b8}
    a{color:#4c6ef5;text-decoration:none;font-weight:500}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p class="brand">Akro Ventures · <a href="/dashboard">View Dashboard</a></p>
  </div>
</body>
</html>`;

  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
