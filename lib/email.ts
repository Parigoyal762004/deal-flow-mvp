import nodemailer from "nodemailer";
import type { Deal } from "./types";
import { escapeHtml as e } from "./security";
import { resolveSender, transportFor } from "./mailer";
import { STARTUP_SERVICES } from "./akro-services";

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

// ── Circular icon - for dark/teal backgrounds (header & footer) ───────────────
function iconHtml(size = 44): string {
  return `<img src="${ICON_URL}" alt="Akro Ventures" width="${size}" height="${size}" style="width:${size}px;height:${size}px;display:block;border-radius:50%;"/>`;
}

// ── Full wordmark - white background baked in, no wrapper needed ──────────────
function logoHtml(height = 40): string {
  return `<img src="${LOGO_URL}" alt="Akro Ventures" height="${height}" style="height:${height}px;width:auto;display:block;border-radius:4px;"/>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL - Team approval email
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
      <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">New Deal: ${e(deal.startup_name)}</p>
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
            <p style="margin:0;font-size:15px;font-weight:600;color:${TEXT_DARK};">${e(deal.founder_name)}</p>
            <p style="margin:2px 0 0;font-size:12px;color:${TEXT_MID};">${e(deal.founder_email)}</p>
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
          <p style="margin:0;font-size:11px;color:${TEXT_MID};">To: <strong>${e(deal.founder_email)}</strong>&nbsp;&nbsp;&middot;&nbsp;&nbsp;Subject: Akro Ventures / Re: ${e(deal.startup_name)}</p>
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
// PERSONALISATION HELPERS - no LLM, uses form data
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
  // Only return a signal if we found a specific number/milestone pattern.
  // Never return raw text - it could be a full pitch deck from Backrr submissions.
  return null;
}

// ─── Subject line - specific beats generic ───────────────────────────────────
export function buildSubject(deal: Deal): string {
  const firstName = deal.founder_name.split(" ")[0];
  const stage = (deal.stage ?? "").replace(/-/g, " ");
  const isGrowth = stage === "growth" || stage === "series b" || stage === "series a";

  if (isGrowth) return `A question about ${deal.startup_name}`;
  return `${firstName}, a question about ${deal.startup_name}`;
}

// ─── The nerve - one sentence that hits what's actually on their mind ─────────
function getNerveLine(deal: Deal): string {
  const stage      = (deal.stage ?? "").replace(/-/g, " ");
  const industry   = deal.industry ?? "";
  const assetHeavy = ["Manufacturing","Logistics","Real Estate","Facility Management","Agritech","Infrastructure"].includes(industry);

  if (stage === "growth")   return `Most founders we speak to at this stage are working through the same question: what the next capital move looks like, and whether they are talking to the right people before they need them.`;
  if (stage === "series b") return `Most Series B founders we speak to are thinking about the same thing: whether their narrative and cap table are ready for institutional scrutiny at the next round.`;
  if (stage === "series a") return `Most Series A founders we speak to realise the story that worked for angels is not the same story institutional investors need to hear. That gap is something we help close.`;
  if (stage === "seed" && assetHeavy) return `Most founders we meet at seed stage say the same thing later: they wish they had thought about the terms of their first round before they signed them.`;
  if (stage === "seed")     return `Most seed-stage founders we work with say the same thing: they had no idea how much the structure of the first round would shape everything that came after.`;
  if (assetHeavy)           return `Most business owners we speak to are sitting on more borrowing capacity than they realise. The problem is not the business, it is how the application is structured.`;
  return `Most founders we speak to at your stage are figuring out the same thing: how to raise without giving away too much, and how to find the right people to talk to.`;
}

// ─── Bullets - what Akro specifically does, plain and human ──────────────────
function getBullets(deal: Deal): string[] {
  const stage      = (deal.stage ?? "").replace(/-/g, " ");
  const industry   = deal.industry ?? "";
  const assetHeavy = ["Manufacturing","Logistics","Real Estate","Facility Management","Agritech","Infrastructure"].includes(industry);

  if (stage === "growth") return [
    "Working out the right structure for your next raise, whether that is a secondary, debt, or a new equity partner",
    "Getting you in front of investors who are actively writing cheques in your sector",
    "Making sure terms and structure work in your favour before any conversation starts",
    "FDI and ECB advisory if foreign capital is on the table",
  ];
  if (stage === "series b") return [
    "Preparing you fully for Series C, from narrative to data room to lead investor targeting",
    "Introductions to institutional funds and family offices that are active right now",
    "Cap table and terms review before the next lead investor does their diligence",
  ];
  if (stage === "series a") return [
    "Running your next round end to end, from first pitch to signed term sheet",
    "Financial model, valuation benchmarking, and pitch narrative for institutional investors",
    "Warm introductions to VCs, family offices, and angels who are writing cheques in your space",
  ];
  if (stage === "seed" && assetHeavy) return [
    "Structuring your raise so the first round does not close doors later",
    "Working capital and debt options alongside equity, so you have real choices",
    "Introductions to the right early-stage investors for your sector",
  ];
  if (stage === "seed") return [
    "Structuring the round so you keep the right amount of your company",
    "Getting your pitch, model, and narrative into the shape investors actually respond to",
    "Warm introductions to angels and early-stage funds in India",
  ];
  if (assetHeavy) return [
    "Unsecured working capital up to Rs 5Cr based on cashflow, no assets pledged",
    "Secured loans up to Rs 50Cr+ against property, shares, FDs, or machinery",
    "Project funding up to Rs 100Cr+ with milestone-based drawdowns",
    "Export invoice factoring, up to 90% of invoice value on Day 0",
  ];
  return [
    "Structuring the raise so you keep the right amount of your company",
    "Getting your pitch and financials into the shape that gets you in the room",
    "Connecting you with the right investors for your specific stage and sector",
  ];
}

// ─── Build plain-text draft (stored in DB and shown in approval email) ────────
export function buildPersonalisedDraft(deal: Deal): string {
  const firstName = deal.founder_name.split(" ")[0];
  const n         = deal.startup_name;
  const stage     = (deal.stage ?? "").replace(/-/g, " ");
  const isGrowth  = stage === "growth" || stage === "series b" || stage === "series a";

  // Opener: one specific line referencing them
  let opener: string;
  if (deal.notes && deal.notes.trim().length > 20) {
    const signal = extractSignal(deal.notes);
    opener = signal
      ? `We came across ${n}${isGrowth ? " while looking at growth-stage companies in the space" : ""}. The ${signal} caught our attention.`
      : `We came across ${n} and wanted to reach out.`;
  } else {
    const src: Record<string, string> = {
      "LinkedIn":      `We came across ${n} on LinkedIn.`,
      "Backrr":        `We came across ${n} on Backrr.`,
      "Referral":      `We got a warm introduction to ${n} and wanted to follow up.`,
      "Cold Outreach": `Thanks for reaching out. We had a closer look at ${n}.`,
      "Event":         `Good to connect recently. Had a closer look at ${n} since.`,
    };
    opener = src[deal.source ?? ""] ?? `We came across ${n} and wanted to reach out.`;
  }

  const nerveLine = getNerveLine(deal);
  const bullets   = getBullets(deal).map(b => `• ${b}`).join("\n");

  // Social proof: use real numbers from the website
  const proof = `We are Akro Ventures. 10 years in business, Rs 200Cr+ facilitated, 50+ founders served, 95% approval rate. We work on a success fee only, nothing upfront.`;

  return [
    `Hi ${firstName},`,
    opener,
    nerveLine,
    `Here is specifically what we do:\n\n${bullets}`,
    proof,
  ].join("\n\n");
}

// EXTERNAL - Founder email. Personal plain-text body + minimal service context footer.
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendFounderEmail(deal: Deal): Promise<void> {
  const firstName = deal.founder_name.split(" ")[0];

  // Use exactly what the team approved - never regenerate content
  const draftText = deal.draft_email ?? buildPersonalisedDraft(deal);

  // Convert plain text to HTML - bullet lines (• ...) become <li>, rest become <p>
  const paragraphsHtml = draftText
    .split(/\n\n+/)
    .filter(Boolean)
    .map(block => {
      const lines = block.split("\n");
      const bulletLines = lines.filter(l => l.startsWith("• "));
      const textLines   = lines.filter(l => !l.startsWith("• "));
      const parts: string[] = [];
      if (textLines.length) parts.push(`<p style="margin:0 0 12px;">${textLines.join("<br>")}</p>`);
      if (bulletLines.length) {
        const items = bulletLines.map(l => `<li style="margin-bottom:6px;">${l.replace(/^• /, "")}</li>`).join("\n");
        parts.push(`<ul style="margin:0 0 16px;padding-left:20px;color:#374151;">${items}</ul>`);
      }
      return parts.join("\n");
    })
    .join("\n");

  // Resolve who this sends AS: the deal's owner, from their own mailbox, CC'd
  // back to themselves. Falls back to info@ if their mailbox isn't configured.
  const sender = resolveSender(deal.owner);

  // Akro's services for startups - plainly "here's what we do", same idea as the
  // bulk campaign. Renders however many services are configured in akro-services.
  const servicesHtml = STARTUP_SERVICES
    .map(s => `<li style="margin-bottom:10px;"><strong style="color:#1a2e2e;">${s.name}.</strong> ${s.line}</li>`)
    .join("\n");
  const phoneLine = sender.phone ? `${sender.phone}<br>` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.75;">
<div style="max-width:560px;padding:32px 20px;">

${paragraphsHtml}

<p>If any of this is relevant to where you are right now, I would love to have a quick conversation.</p>

<table cellpadding="0" cellspacing="0" style="margin:20px 0;">
  <tr>
    <td>
      <a href="${CALENDLY_URL}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 22px;border-radius:4px;letter-spacing:0.01em;">
        Book a 15-min call with ${sender.displayName}
      </a>
    </td>
    <td style="padding-left:14px;font-size:13px;color:#6b7280;vertical-align:middle;">
      or just reply to this email
    </td>
  </tr>
</table>

<p style="margin-top:24px;font-size:14px;">
${e(sender.fullName)}<br>
${e(sender.title)}<br>
${phoneLine}
<a href="mailto:${sender.email}" style="color:#1a1a1a;text-decoration:none;">${sender.email}</a> &nbsp;|&nbsp; <a href="https://akroventures.com" style="color:#1a1a1a;text-decoration:none;">akroventures.com</a>
</p>

<div style="margin-top:28px;padding-top:20px;border-top:1px solid #e5e7eb;">
  <p style="margin:0 0 12px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">What we do at Akro</p>
  <ul style="margin:0;padding-left:20px;color:#374151;font-size:13px;line-height:1.6;">
    ${servicesHtml}
  </ul>
</div>

</div>
</body>
</html>`;

  const info = await transportFor(sender).sendMail({
    from: `"${sender.displayName} from Akro Ventures" <${sender.email}>`,
    to: deal.founder_email,
    cc: sender.email, // CC the sender themselves (they sent it via their own SMTP)
    subject: buildSubject(deal),
    html,
  });
  console.log(`[email] Founder email sent as ${sender.email} (fallback=${sender.isFallback}):`, info.messageId);
}
