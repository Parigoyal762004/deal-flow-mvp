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

// ─── Extract the most specific data point from pipeline notes ────────────────
// Notes format: "Key signal about company; Akro rationale"
// We want the first clause and pull out the most notable number/fact.
function extractSignal(notes: string): string | null {
  const firstClause = notes.split(";")[0].trim();
  // Look for a specific number or milestone
  const patterns = [
    /[\d,]+\+?\s*cities/i,
    /[₹\$][\d.,]+\s*(?:Cr|M|B|Bn)/i,
    /[\d.]+[xX]\s*(?:revenue|growth|customer)/i,
    /[\d,]+\+?\s*(?:million|M)\+?\s*(?:users|customers|partners)/i,
    /Series\s*[A-E]/i,
    /pre.?IPO/i,
    /[\d,]+\+?\s*(?:villages|stores|outlets|locations)/i,
  ];
  for (const p of patterns) {
    const m = firstClause.match(p);
    if (m) return m[0];
  }
  return firstClause.length > 10 ? firstClause : null;
}

// ─── Subject line — specific beats generic ───────────────────────────────────
export function buildSubject(deal: Deal): string {
  const firstName = deal.founder_name.split(" ")[0];
  const stage = (deal.stage ?? "").replace(/-/g, " ");
  const isGrowth = stage === "growth" || stage === "series b" || stage === "series a";

  if (isGrowth) return `A question about ${deal.startup_name}`;
  return `${firstName}, a question about ${deal.startup_name}`;
}

// ─── Build the full personalised email draft ─────────────────────────────────
export function buildPersonalisedDraft(deal: Deal): string {
  const firstName  = deal.founder_name.split(" ")[0];
  const n          = deal.startup_name;
  const stage      = (deal.stage ?? "").replace(/-/g, " ");
  const isGrowth   = stage === "growth" || stage === "series b" || stage === "series a";
  const isEarly    = stage === "pre seed" || stage === "seed";

  // 1. OPENER — specific signal from notes if available, otherwise source-based
  let opener: string;
  if (deal.notes && deal.notes.trim().length > 20) {
    const signal = extractSignal(deal.notes);
    if (signal && isGrowth) {
      opener = `We came across ${n} while mapping growth-stage companies in the space. The ${signal} stood out.`;
    } else if (signal) {
      opener = `We came across ${n} and had a closer look. The ${signal} caught our attention.`;
    } else {
      opener = `We came across ${n} and wanted to reach out directly.`;
    }
  } else {
    const sourceMap: Record<string, string> = {
      "Backrr":        `We came across ${n} on Backrr and wanted to reach out.`,
      "LinkedIn":      `We came across ${n} on LinkedIn and had a closer look.`,
      "Referral":      `We got a warm introduction to ${n} and wanted to follow up directly.`,
      "Cold Outreach": `Thanks for reaching out. We had a look at ${n} and wanted to connect properly.`,
      "Event":         `Good to connect recently. We had a closer look at ${n} since.`,
    };
    opener = sourceMap[deal.source ?? ""] ?? `We came across ${n} and wanted to reach out directly.`;
  }

  // 2. BODY — what they are dealing with right now + timing reason
  let body: string;
  if (isGrowth) {
    body = `We have been working with a few PE-backed and growth-stage founders in India this year on exactly the kind of questions that come up at this point. Not the basics of fundraising, but the next move: the right instrument, the right institutional relationships, and how to position the business before that conversation starts. Getting this wrong at your stage is expensive.`;
  } else if (stage === "series a" || stage === "series b") {
    body = `We have been working with a handful of Series A and B founders this year on getting the capital structure right before the next round. The decisions you make here shape your cap table and your options for years. Having the right advisory in the room early makes a real difference.`;
  } else {
    body = `We have been working with early-stage founders this year on structuring their raise from the start. The founders who get this right in the first round tend to have significantly better options by the time they get to Series A.`;
  }

  // 3. SOCIAL PROOF + WHAT AKRO DOES — specific, credible, zero-upfront trust signal
  let akroLine: string;
  if (isGrowth) {
    akroLine = `At Akro Ventures, we have worked with 50+ founders and businesses across India on capital structure, investor introductions, and navigating the next raise. We work on a success fee only — nothing upfront. We get paid when you get funded.`;
  } else if (isEarly) {
    akroLine = `At Akro Ventures, we have helped 50+ early-stage founders close their rounds — from sharpening the pitch to warm introductions with the right angels, family offices, and VCs. We work on a success fee only, so we are fully aligned with your outcome.`;
  } else {
    akroLine = `At Akro Ventures, we have worked with 50+ founders and businesses on capital structure, investor positioning, and getting the right people into the room. We work on a success fee only — nothing upfront.`;
  }

  return [
    `Hi ${firstName},`,
    opener,
    body,
    akroLine,
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

<p>Would it make sense to connect for 15 minutes sometime this week?</p>

<p style="margin-top:28px;">
Rohit Jain<br>
Co-Founder, Akro Ventures<br>
+91 99406 28986<br>
<a href="mailto:rohit.jain@akroventures.com" style="color:#1a1a1a;text-decoration:none;">rohit.jain@akroventures.com</a> &nbsp;|&nbsp; <a href="https://akroventures.com" style="color:#1a1a1a;text-decoration:none;">akroventures.com</a>
</p>

</div>
</body>
</html>`;

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: `"Rohit from Akro Ventures" <${SMTP_USER}>`,
    to: deal.founder_email,
    cc: "info@akroventures.com",
    subject: buildSubject(deal),
    html,
  });
  console.log("[email] Founder email sent:", info.messageId);
}
