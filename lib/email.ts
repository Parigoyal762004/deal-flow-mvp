import nodemailer from "nodemailer";
import type { Deal } from "./types";

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? "https://deal-flow-mvp.vercel.app";
const SMTP_USER    = process.env.SMTP_USER ?? "info@akroventures.com";
const SMTP_PASS    = process.env.SMTP_PASS ?? "";
const LOGO_URL     = `${APP_URL}/akro-logo-full.jpg`;  // horizontal wordmark (light bg)
const ICON_URL     = `${APP_URL}/akro-icon.jpg`;       // circular icon (dark bg)
const CALENDLY_URL = "https://calendly.com/akroventures-info/new-meeting";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const TEAL      = "#295757";
const TEAL_DARK = "#1d3d3d";
const GOLD      = "#d4af35";
const OFF_WHITE = "#f7f8f6";
const BORDER    = "#dde3e0";
const TEXT_DARK = "#1a2e2e";
const TEXT_MID  = "#4a6060";
const TEXT_SOFT = "#7a9898";

function createTransport() {
  return nodemailer.createTransport({
    host: "smtpout.secureserver.net",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// ── Shared HTML shell (dark-mode safe) ────────────────────────────────────────
function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>${title}</title>
<style>
  :root { color-scheme: light only; }
  body  { margin:0; padding:0; background:${OFF_WHITE}; font-family:'Inter',Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  table { border-collapse:collapse; }
  img   { border:0; display:block; }
  a     { color:${GOLD}; text-decoration:none; }
  .logo-wrap { background:#ffffff !important; }
  @media only screen and (max-width:600px) {
    .card  { width:100% !important; }
    .inner { padding:24px 20px !important; }
    .hdr   { padding:24px 20px 20px !important; }
    .ftr   { padding:16px 20px !important; }
    .btn   { display:block !important; width:100% !important; box-sizing:border-box !important; text-align:center !important; margin-bottom:8px !important; }
    .col50 { display:block !important; width:100% !important; padding-bottom:16px !important; }
  }
</style>
</head>
<body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:${OFF_WHITE};padding:32px 12px;">
<tr><td align="center">
${bodyHtml}
</td></tr></table>
</body>
</html>`;
}

// ── Circular icon — for dark/teal backgrounds (header & footer) ───────────────
function iconHtml(size = 44): string {
  return `<img src="${ICON_URL}" alt="Akro Ventures" width="${size}" height="${size}" style="width:${size}px;height:${size}px;display:block;border-radius:50%;"/>`;
}

// ── Full wordmark — white background baked in, no wrapper needed ──────────────
function logoHtml(height = 40): string {
  return `<img src="${LOGO_URL}" alt="Akro Ventures" height="${height}" style="height:${height}px;width:auto;display:block;border-radius:4px;"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL — Team approval email
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendApprovalEmail(deal: Deal): Promise<void> {
  const recipients = (process.env.APPROVAL_EMAIL_RECIPIENTS ?? SMTP_USER)
    .split(",").map(e => e.trim()).filter(Boolean);

  const approveUrl = `${APP_URL}/api/approve?token=${deal.approval_token}&action=approve`;
  const rejectUrl  = `${APP_URL}/api/approve?token=${deal.approval_token}&action=reject`;
  const editUrl    = `${APP_URL}/edit-email?token=${deal.approval_token}`;
  const dashUrl    = `${APP_URL}/dashboard`;

  const stageBadge = (deal.stage ?? "").replace("-", " ").toUpperCase();
  const industry   = (deal.industry ?? "").toUpperCase();

  const additionalLinksHtml = deal.additional_links?.length
    ? deal.additional_links.map(l =>
        `<a href="${l.url}" style="color:${GOLD};font-weight:500;">${l.label}</a>`
      ).join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;")
    : `<span style="color:${TEXT_SOFT};">None</span>`;

  const deckLink = deal.pitch_deck_url
    ? `<a href="${deal.pitch_deck_url}" style="color:${GOLD};font-weight:600;">View Pitch Deck &rarr;</a>`
    : `<span style="color:${TEXT_SOFT};">No deck uploaded</span>`;

  // Format AI summary with styled section headers
  const rawSummary = deal.ai_summary ?? "No analysis available.";
  const hasAiSections = rawSummary.includes("\n\nStrengths:") || rawSummary.includes("\n\nRisks:");
  const summaryHtml = rawSummary
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n\nStrengths:\n/g,
      `</p><p style="margin:14px 0 5px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">Strengths</p><p style="margin:0;font-size:13px;color:${TEXT_DARK};line-height:1.85;">`)
    .replace(/\n\nRisks:\n/g,
      `</p><p style="margin:14px 0 5px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">Risks</p><p style="margin:0;font-size:13px;color:${TEXT_DARK};line-height:1.85;">`)
    .replace(/\n\nRecommended Service: /g,
      `</p><p style="margin:14px 0 5px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">Recommended Service</p><p style="margin:0;font-size:14px;font-weight:600;color:${TEAL};">`)
    .replace(/\n/g, "<br/>");
  const sectionLabel = hasAiSections ? "Deal Intelligence" : "Deal Overview";

  const draftHtml = (deal.draft_email ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\n\n/g, `</p><p style="margin:0 0 12px;font-size:13px;color:${TEXT_DARK};line-height:1.85;">`)
    .replace(/\n/g, "<br/>");

  const body = `
<table class="card" width="620" cellpadding="0" cellspacing="0"
  style="max-width:620px;width:100%;background:#ffffff;border-radius:8px;border:1px solid ${BORDER};overflow:hidden;box-shadow:0 4px 32px rgba(41,87,87,0.10);">

  <!-- Header -->
  <tr>
    <td class="hdr" style="background:${TEAL};padding:26px 36px 22px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>${iconHtml(44)}</td>
          <td align="right" style="vertical-align:middle;">
            <span style="display:inline-block;background:${GOLD};color:${TEAL_DARK};font-size:9px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;padding:4px 12px;border-radius:20px;">Action Required</span>
          </td>
        </tr>
      </table>
      <div style="margin:16px 0 14px;height:1px;background:linear-gradient(90deg,rgba(212,175,53,0.7) 0%,transparent 70%);"></div>
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">New Deal: ${deal.startup_name}</p>
      <p style="margin:5px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">${stageBadge}${industry ? "&nbsp;&middot;&nbsp;" + industry : ""}&nbsp;&middot;&nbsp;via ${deal.source}</p>
    </td>
  </tr>

  <!-- Founder + Links -->
  <tr>
    <td class="inner" style="padding:26px 36px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td class="col50" width="50%" style="vertical-align:top;padding-bottom:18px;">
            <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">Founder</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_DARK};">${deal.founder_name}</p>
            <p style="margin:2px 0 0;font-size:12px;color:${TEXT_MID};">${deal.founder_email}</p>
          </td>
          <td class="col50" width="50%" style="vertical-align:top;padding-bottom:18px;">
            <p style="margin:0 0 5px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">Links</p>
            <p style="margin:0;font-size:12px;line-height:2.1;">
              ${deal.website_url ? `<a href="${deal.website_url}" style="color:${TEAL};font-weight:500;">Website</a>&nbsp;&nbsp;` : ""}
              ${deal.linkedin_url ? `<a href="${deal.linkedin_url}" style="color:${TEAL};font-weight:500;">LinkedIn</a>&nbsp;&nbsp;` : ""}
              ${deckLink}
            </p>
            ${deal.additional_links?.length ? `<p style="margin:4px 0 0;font-size:11px;color:${TEXT_SOFT};">${additionalLinksHtml}</p>` : ""}
          </td>
        </tr>
      </table>
      <div style="height:1px;background:${BORDER};margin-bottom:22px;"></div>
    </td>
  </tr>

  <!-- Deal Intelligence -->
  <tr>
    <td class="inner" style="padding:0 36px 22px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">${sectionLabel}</p>
      <div style="background:${OFF_WHITE};border-left:3px solid ${GOLD};border-radius:0 6px 6px 0;padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:${TEXT_DARK};line-height:1.85;">${summaryHtml}</p>
      </div>
    </td>
  </tr>

  <!-- Draft Email Preview -->
  <tr>
    <td class="inner" style="padding:0 36px 26px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD};">Draft Response to Founder</p>
      <div style="border:1px solid ${BORDER};border-radius:6px;overflow:hidden;">
        <div style="background:#f0f4f4;padding:9px 16px;border-bottom:1px solid ${BORDER};">
          <p style="margin:0;font-size:11px;color:${TEXT_MID};">To: <strong>${deal.founder_email}</strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;Subject: Akro Ventures / Re: ${deal.startup_name}</p>
        </div>
        <div style="padding:16px 18px 12px;background:#ffffff;">
          <p style="margin:0 0 12px;font-size:13px;color:${TEXT_DARK};line-height:1.85;">${draftHtml}</p>
        </div>
      </div>
      <p style="margin:10px 0 0;font-size:11px;color:${TEXT_SOFT};">Review the draft and choose an action below.</p>
    </td>
  </tr>

  <!-- CTA Buttons -->
  <tr>
    <td class="inner" style="padding:0 36px 30px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:8px;padding-bottom:8px;">
            <a href="${approveUrl}" class="btn"
              style="display:inline-block;background:${GOLD};color:${TEAL_DARK};text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:13px 24px;border-radius:6px;">
              &#10003;&nbsp; Approve &amp; Send
            </a>
          </td>
          <td style="padding-right:8px;padding-bottom:8px;">
            <a href="${editUrl}" class="btn"
              style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:13px 24px;border-radius:6px;">
              &#9998;&nbsp; Edit &amp; Send
            </a>
          </td>
          <td style="padding-bottom:8px;">
            <a href="${rejectUrl}" class="btn"
              style="display:inline-block;background:#ffffff;color:#b91c1c;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:12px 24px;border-radius:6px;border:1.5px solid #fca5a5;">
              &#10005;&nbsp; Reject
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:11px;color:${TEXT_SOFT};">Single-use links &nbsp;&middot;&nbsp; <a href="${dashUrl}" style="color:${TEAL};font-weight:500;">View Pipeline &rarr;</a></p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td class="ftr" style="background:${TEAL_DARK};padding:18px 36px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.4);line-height:1.6;">
              <strong style="color:rgba(255,255,255,0.7);">Akro Ventures</strong>&nbsp;&middot;&nbsp;Guiding Every Step Towards Growth<br/>
              AI-drafted response, awaiting team review.
            </p>
          </td>
          <td align="right" style="vertical-align:middle;">${iconHtml(32)}</td>
        </tr>
      </table>
    </td>
  </tr>

</table>
<p style="margin:16px 0 0;text-align:center;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9ab4b4;">Akro Ventures &middot; Confidential Internal Use</p>`;

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: `"Akro Ventures Deal Flow" <${SMTP_USER}>`,
    to: recipients.join(", "),
    subject: `[Review] ${deal.startup_name} · ${stageBadge}${industry ? " · " + industry : ""}`,
    html: shell(`Deal Review: ${deal.startup_name}`, body),
  });
  console.log("[email] Approval email sent:", info.messageId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERSONALISATION HELPERS — no LLM, uses form data
// ═══════════════════════════════════════════════════════════════════════════════

// ─── What Akro does — one crisp sentence matched to stage ────────────────────
function getAkroLine(deal: Deal): string {
  const stage = (deal.stage ?? "").replace(/-/g, " ");
  if (stage === "pre seed" || stage === "seed") {
    return `At Akro Ventures, we work with early-stage founders to structure their raise, sharpen the investor narrative, and make the right introductions at the right time.`;
  }
  if (stage === "series a" || stage === "series b") {
    return `At Akro Ventures, we work with founders at this stage on capital structure, investor positioning, and getting the right advisors into the room before the next round starts.`;
  }
  // growth / pre-IPO
  return `At Akro Ventures, we work with founders at your stage on the next capital move, whether that is a secondary, an institutional co-investor, structured debt, or preparing the business for a public market event.`;
}

// ─── Build email body from what we actually know about the company ────────────
// If notes exist (pipeline leads always have them), use them as the specific hook.
// Otherwise fall back to generic industry/stage insight.
function getBodyParagraph(deal: Deal): string {
  const stage = (deal.stage ?? "").replace(/-/g, " ");
  const isGrowth = stage === "growth" || stage === "series b" || stage === "series a";

  // Notes from the pipeline contain real intelligence about the company.
  // Use the first meaningful clause as a specific reference point.
  if (deal.notes && deal.notes.trim().length > 20) {
    const note = deal.notes.trim().split(";")[0].trim(); // first clause only
    if (isGrowth) {
      return `Companies at this point, ${note.toLowerCase().endsWith(".") ? note.slice(0, -1) : note}, typically face a specific set of questions around the next capital event. Getting the right structure and the right people in place before that conversation starts is where the real leverage is.`;
    }
    return `${note}. Getting the right structure and the right advisors in place at this stage shapes how the next round comes together.`;
  }

  // Fallback: stage-based insight
  const stageMap: Record<string, string> = {
    "pre seed": "At pre-seed, structuring things correctly from the start saves significant pain down the road and sets you up to raise your next round on your terms.",
    "seed":     "Seed stage is where your investor story and your raise structure need to be aligned. Getting this right shapes how your cap table looks at Series A.",
    "series a": "Series A requires a different level of rigour than earlier rounds. Having the right advisory in the room before those conversations start makes a real difference.",
    "series b": "At Series B, institutional diligence is deep and the cap table decisions you make here follow you for years. Getting this right matters.",
    "growth":   "At this stage, the questions shift from whether to raise to how to structure it, who to bring in, and when. That is exactly the kind of conversation we have.",
  };
  return stageMap[stage] ?? "Getting the right capital structure and the right advisors in place changes the trajectory of a raise. We have seen this at every stage.";
}

// ═══════════════════════════════════════════════════════════════════════════════
// ── Build the plain-text draft (stored in DB, shown in approval email) ────────
export function buildPersonalisedDraft(deal: Deal): string {
  const firstName = deal.founder_name.split(" ")[0];
  const n = deal.startup_name;

  // Opener: short, source-aware, references the company by name
  const openerMap: Record<string, string> = {
    "Backrr":        `We came across ${n} on Backrr and wanted to reach out.`,
    "LinkedIn":      `We came across ${n} on LinkedIn.`,
    "Referral":      `We got a warm introduction to ${n} and wanted to follow up directly.`,
    "Cold Outreach": `Thanks for reaching out. We had a look at ${n} and wanted to connect properly.`,
    "Event":         `Good to connect recently. We had a look at ${n} since.`,
  };
  const opener = openerMap[deal.source ?? ""] ?? `We came across ${n} and wanted to reach out directly.`;

  return [
    `Hi ${firstName},`,
    opener,
    getBodyParagraph(deal),
    getAkroLine(deal),
  ].join("\n\n");
}

// EXTERNAL — Founder email. Looks like a real person typed it. No logo, no colors, no buttons.
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendFounderEmail(deal: Deal): Promise<void> {
  const firstName = deal.founder_name.split(" ")[0];

  // Use exactly what the team approved — never regenerate content
  const draftText = deal.draft_email ?? buildPersonalisedDraft(deal);

  // Convert plain text paragraphs to minimal HTML — looks like typed in Gmail
  const paragraphsHtml = draftText
    .split(/\n\n+/)
    .filter(Boolean)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.75;">
<div style="max-width:560px;padding:32px 20px;">

${paragraphsHtml}

<p>If any of this is relevant, happy to spend 15 minutes on a call. No prep needed on your end. Here is a link to find a time that works: <a href="${CALENDLY_URL}" style="color:#1a1a1a;">${CALENDLY_URL}</a></p>

<p style="margin-top:28px;">
Rohit Jain<br>
Akro Ventures<br>
<a href="mailto:info@akroventures.com" style="color:#1a1a1a;text-decoration:none;">info@akroventures.com</a> &nbsp;|&nbsp; <a href="https://akroventures.com" style="color:#1a1a1a;text-decoration:none;">akroventures.com</a>
</p>

</div>
</body>
</html>`;

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: `"Rohit from Akro Ventures" <${SMTP_USER}>`,
    to: deal.founder_email,
    cc: "info@akroventures.com",
    subject: `${firstName}, a thought on ${deal.startup_name}`,
    html,
  });
  console.log("[email] Founder email sent:", info.messageId);
}
