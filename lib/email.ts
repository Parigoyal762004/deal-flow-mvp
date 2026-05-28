import nodemailer from "nodemailer";
import type { Deal } from "./types";
import { AKRO_LOGO_B64 } from "./logo-b64";

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

function getOpener(deal: Deal): string {
  const n = deal.startup_name;
  switch (deal.source) {
    case "Backrr":        return `We came across ${n} on Backrr and wanted to reach out.`;
    case "LinkedIn":      return `We noticed ${n} on LinkedIn and thought it was worth a conversation.`;
    case "Referral":      return `We got a warm introduction to ${n} and were glad to hear about what you're building.`;
    case "Cold Outreach": return `Thanks for reaching out — we've had a look at ${n} and wanted to connect properly.`;
    case "Event":         return `It was great connecting recently. We've had a look at ${n} since.`;
    default:              return `We came across ${n} and wanted to reach out directly.`;
  }
}

function getInsight(deal: Deal): string {
  const industry = deal.industry ?? "";
  const stage = (deal.stage ?? "").replace(/-/g, " ");

  const industryMap: Record<string, string> = {
    "Fintech":      "Getting capital structure right in fintech matters more than most founders realise — the wrong terms early on can close doors with the right investors later.",
    "Healthtech":   "Health innovation is hard to fund because most investors don't understand the regulatory layer. That's exactly where having the right advisory makes a difference.",
    "SaaS":         "SaaS at your stage is about more than ARR — investors want to see a clean story around retention, expansion, and your path to profitability.",
    "Consumer":     "Consumer brands need patient capital and sharp market positioning. Getting both aligned at the right time is what separates the ones that scale from the ones that stall.",
    "Edtech":       "Edtech is seeing renewed investor interest, but the narrative has to be tight. We work with founders to make sure the right people hear the right story.",
    "AI/ML":        "AI startups are getting funded, but investors are cutting through the noise fast. Defensibility, real revenue, and a credible team story are what move the needle.",
    "E-commerce":   "At your stage, e-commerce is about unit economics and the right growth capital. We help founders structure that raise so the terms actually work long-term.",
    "Agritech":     "Agritech in India is growing fast and attracting serious capital. Getting in front of the right investors early — with the right framing — matters enormously.",
    "Logistics":    "Logistics businesses need capital-efficient structures to scale. We've helped founders navigate this and come out with better terms than they expected.",
    "Cleantech":    "Cleantech fundraising has its own language and its own investor base. We help founders bridge that gap and access the right pools of capital.",
    "Proptech":     "Proptech is complex to fund. Matching the right instrument to your business model — debt, equity, or structured — is something we help founders get right.",
    "Cybersecurity":"Cybersecurity is one of the most active sectors for institutional capital right now. Positioning your raise correctly can make a significant difference.",
    "Web3/Crypto":  "Web3 fundraising requires a very specific investor set. We work with founders to identify and approach the right capital for their model.",
  };

  if (industryMap[industry]) return industryMap[industry];

  const stageMap: Record<string, string> = {
    "pre seed": "At pre-seed, structuring things correctly from the start saves significant pain down the road — and sets you up to raise your next round on your terms.",
    "seed":     "Seed stage is where your investor story and your raise structure need to be aligned. Getting this right shapes how your cap table and your options look at Series A.",
    "series a": "Series A requires a different level of rigour than earlier rounds. We work with founders to make sure they're walking into those conversations fully prepared.",
    "series b": "At Series B, the bar is high and diligence is deep. We help founders prepare for that process and make sure the right advisors are in the room.",
    "growth":   "Growth-stage capital has its own playbook. We help founders identify the right instruments and the right capital partners for where they are.",
  };

  return stageMap[stage] ?? "Getting the right capital structure and the right advisors in place can change the trajectory of a raise significantly. We've seen this with founders at every stage.";
}

function getWhatWeDo(deal: Deal): string {
  const stage = (deal.stage ?? "").replace(/-/g, " ");
  if (stage === "pre seed" || stage === "seed") {
    return `At Akro Ventures, we work with early-stage founders to structure their raise, sharpen the investor narrative, and make targeted introductions to the right capital partners — so you're not just raising, you're raising right.`;
  }
  if (stage === "series a" || stage === "series b") {
    return `At Akro Ventures, we advise growth-stage companies on capital structure, investor positioning, and navigating complex fundraising processes — from preparing the data room to closing the round.`;
  }
  return `At Akro Ventures, we help founders at every stage structure their capital raise, sharpen their story, and connect with the right investors and advisors for their specific situation.`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTERNAL — Founder response email (clean, personal, not promotional)
// ═══════════════════════════════════════════════════════════════════════════════
export async function sendFounderEmail(deal: Deal): Promise<void> {
  const firstName = deal.founder_name.split(" ")[0];

  // Build personalised body from form data — no LLM needed
  const opener    = getOpener(deal);
  const insight   = getInsight(deal);
  const whatWeDo  = getWhatWeDo(deal);

  // If internal notes exist and are meaningful, surface one line
  const notesLine = deal.notes && deal.notes.trim().length > 10
    ? `<p style="margin:0 0 22px;font-size:15px;color:${TEXT_DARK};line-height:1.85;">${deal.notes.trim().split(/[.!?]/)[0].trim()}.</p>`
    : "";

  const body = `
<table width="560" cellpadding="0" cellspacing="0"
  style="max-width:560px;width:100%;background:#ffffff;border-radius:6px;border:1px solid ${BORDER};overflow:hidden;">

  <!-- Logo header — explicit white background, dark-mode safe -->
  <tr>
    <td style="background:#ffffff;padding:20px 28px 16px;border-bottom:3px solid ${GOLD};">
      <img src="${AKRO_LOGO_B64}" alt="Akro Ventures" height="38"
        style="height:38px;width:auto;display:block;" />
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:30px 28px 8px;">
      <p style="margin:0 0 22px;font-size:15px;color:${TEXT_DARK};line-height:1.85;">Hi ${firstName},</p>
      <p style="margin:0 0 22px;font-size:15px;color:${TEXT_DARK};line-height:1.85;">${opener}</p>
      <p style="margin:0 0 22px;font-size:15px;color:${TEXT_DARK};line-height:1.85;">${insight}</p>
      ${notesLine}
      <p style="margin:0 0 0;font-size:15px;color:${TEXT_DARK};line-height:1.85;">${whatWeDo}</p>
    </td>
  </tr>

  <!-- CTA — simple, not a marketing banner -->
  <tr>
    <td style="padding:28px 28px 28px;">
      <p style="margin:0 0 14px;font-size:14px;color:${TEXT_MID};line-height:1.6;">
        If you'd like to explore this, we're happy to start with a quick 15-minute call. No preparation needed.
      </p>
      <a href="${CALENDLY_URL}"
        style="display:inline-block;background:${TEAL};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:12px 24px;border-radius:5px;letter-spacing:0.02em;">
        Book a 15-min call &rarr;
      </a>
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="padding:0 28px;"><div style="height:1px;background:${BORDER};"></div></td>
  </tr>

  <!-- Signature -->
  <tr>
    <td style="padding:22px 28px 28px;">
      <p style="margin:0 0 2px;font-size:14px;color:${TEXT_DARK};line-height:1.6;">Warm regards,</p>
      <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:${TEXT_DARK};">Team Akro Ventures</p>
      <p style="margin:0;font-size:12px;color:${TEXT_SOFT};line-height:1.8;">
        <a href="mailto:info@akroventures.com" style="color:${TEAL};text-decoration:none;">info@akroventures.com</a>
        &nbsp;&middot;&nbsp;
        <a href="https://akroventures.com" style="color:${TEAL};text-decoration:none;">akroventures.com</a>
      </p>
    </td>
  </tr>

</table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta name="color-scheme" content="light only"/>
<meta name="supported-color-schemes" content="light"/>
<style>
  :root { color-scheme: light only; }
  body  { margin:0; padding:0; background:#f0f2f0; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; }
  table { border-collapse:collapse; }
  img   { border:0; }
  a     { color:${TEAL}; }
  @media only screen and (max-width:600px) {
    .wrapper { padding: 16px 8px !important; }
    table[width="560"] { width: 100% !important; }
  }
</style>
</head>
<body>
<table class="wrapper" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f0;padding:32px 16px;">
<tr><td align="center">${body}</td></tr>
</table>
</body>
</html>`;

  const transporter = createTransport();
  const info = await transporter.sendMail({
    from: `"Akro Ventures" <${SMTP_USER}>`,
    to: deal.founder_email,
    // cc: ["info@akroventures.com","akshita.chahande@akroventures.com","rohit.jain@akroventures.com"].join(", "),
    subject: `Akro Ventures / Re: ${deal.startup_name}`,
    html,
  });
  console.log("[email] Founder email sent:", info.messageId);
}
