import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { sendFounderEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/security";

export const maxDuration = 30;

// ── GET /api/approve?token=<uuid>&action=approve|reject ───────────────────────
// IMPORTANT: GET must NEVER take action — email link scanners (Gmail, Outlook
// SafeLinks, GoDaddy filters, corporate AV) pre-fetch every URL in an incoming
// email. If GET triggered the send, a deal could be approved before anyone reads
// the email. GET only shows a confirmation page; POST executes the action.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token  = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token || !["approve", "reject"].includes(action ?? "")) {
    return html("Invalid Request", "The approval link is invalid or malformed.", "info", "");
  }

  const supabase = createServerClient();
  const { data: deal, error } = await supabase
    .from("deals")
    .select("id, startup_name, founder_name, approval_status")
    .eq("approval_token", token)
    .single();

  if (error || !deal) {
    return html("Not Found", "This approval link is invalid or has already been used.", "error", "");
  }

  if (deal.approval_status !== "pending") {
    const label = deal.approval_status === "approved" ? "approved" : "rejected";
    return html(
      "Already Processed",
      `This deal was already <strong>${escapeHtml(label)}</strong>. No further action needed.`,
      deal.approval_status === "approved" ? "success" : "error",
      ""
    );
  }

  const isApprove = action === "approve";
  const startup   = escapeHtml(deal.startup_name);
  const founder   = escapeHtml(deal.founder_name);
  const verb      = isApprove ? "Approve & send email" : "Reject this deal";
  const warning   = isApprove
    ? `This will send the draft email to <strong>${founder}</strong> at <strong>${startup}</strong>.`
    : `This will reject the deal for <strong>${startup}</strong>. No email will be sent.`;

  const confirmForm = `
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6;">${warning}</p>
    <form method="POST" action="/api/approve">
      <input type="hidden" name="token"  value="${escapeHtml(token)}"/>
      <input type="hidden" name="action" value="${escapeHtml(action ?? "")}"/>
      <button type="submit"
        style="display:inline-block;background:${isApprove ? "#16a34a" : "#dc2626"};color:#fff;border:none;border-radius:8px;padding:12px 28px;font-size:14px;font-weight:600;cursor:pointer;letter-spacing:0.01em;">
        ${verb}
      </button>
    </form>`;

  return html(`Confirm: ${startup}`, confirmForm, "confirm", startup);
}

// ── POST /api/approve — form submit from the confirmation page ────────────────
export async function POST(req: NextRequest) {
  let token = "", action = "";
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    token  = String(fd.get("token")  ?? "");
    action = String(fd.get("action") ?? "");
  } else {
    try { const b = await req.json(); token = b.token ?? ""; action = b.action ?? ""; } catch { /**/ }
  }

  if (!token || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: deal, error } = await supabase
    .from("deals")
    .select("*")
    .eq("approval_token", token)
    .single();

  if (error || !deal) {
    return html("Not Found", "This approval link is invalid or has already been used.", "error", "");
  }

  if (deal.approval_status !== "pending") {
    const label = deal.approval_status === "approved" ? "approved" : "rejected";
    return html("Already Processed", `This deal was already <strong>${escapeHtml(label)}</strong>.`, deal.approval_status === "approved" ? "success" : "error", "");
  }

  const isApprove = action === "approve";

  const { error: updateError } = await supabase
    .from("deals")
    .update({
      approval_status: isApprove ? "approved" : "rejected",
      email_status:    isApprove ? "sent" : "failed",
    })
    .eq("id", deal.id);

  if (updateError) {
    console.error("Approval update error:", updateError);
    return html("Error", "Database update failed. Please try again.", "error", "");
  }

  if (isApprove) {
    try {
      await sendFounderEmail(deal);
      console.log(`[approve] Founder email sent for deal ${deal.id}`);
    } catch (emailErr) {
      console.error("[approve] Failed to send founder email:", emailErr);
    }
  }

  const startup = escapeHtml(deal.startup_name);
  const founder = escapeHtml(deal.founder_name);
  const title   = isApprove ? `Approved — ${startup}` : `Rejected — ${startup}`;
  const message = isApprove
    ? `The response email to <strong>${founder}</strong> at <strong>${startup}</strong> has been sent.`
    : `The deal for <strong>${startup}</strong> was rejected. No email will be sent to the founder.`;

  return html(title, message, isApprove ? "success" : "error", "");
}

function html(title: string, message: string, type: "success" | "error" | "info" | "confirm", _startup: string) {
  const success = type === "success";
  const isConfirm = type === "confirm";
  const color  = success ? "#16a34a" : isConfirm ? "#1d4ed8" : "#dc2626";
  const bgCol  = success ? "#f0fdf4" : isConfirm ? "#eff6ff" : "#fef2f2";
  const border = success ? "#bbf7d0" : isConfirm ? "#bfdbfe" : "#fecaca";
  const icon   = success ? "✓" : isConfirm ? "?" : "✕";

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
