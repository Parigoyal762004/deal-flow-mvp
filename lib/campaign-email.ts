import { resolveSender, transportFor, type Sender } from "./mailer";

// ── Bulk lending-services campaign - templated, NOT personalised by AI ─────────
// Sent AS whoever is signed in when they run the batch, from their own mailbox
// and CC'd back to themselves (resolved via lib/mailer). No per-mail review: the
// TEMPLATE is approved once, then merge-sent. Plain human language, no em dashes,
// no unsubscribe block (per Pari's instruction).

const CALENDLY_URL = "https://calendly.com/akroventures-info/30-min-stand-up-call";

export interface CampaignLead {
  firstName: string;
  company: string;
  email: string;
}

// The five services - locked copy. Cold email = skimmable: a bold label, then a
// plain sentence. No dashes.
const SERVICES: { name: string; line: string }[] = [
  { name: "Unsecured Business Loans", line: "Working capital without pledging assets, underwritten on your cashflow (GST returns, bank statements, revenue) rather than just a credit score." },
  { name: "Secured Loans",            line: "Larger financing at better rates, against property, listed shares, fixed deposits, or machinery." },
  { name: "Project Funding",          line: "Dedicated capital for large projects, with milestone-based drawdowns and hybrid debt-equity structures." },
  { name: "FDI & ECB Advisory",       line: "Lower-cost cross-border capital, with the RBI and FEMA structuring, filings, and compliance handled for you." },
  { name: "Export Invoice Factoring", line: "Up to 90% of your export invoice value on Day 0, collateral-free, while your buyer pays later." },
];

const greet = (fn: string) => fn.trim() || "there";

export function buildCampaignSubject(lead: CampaignLead): string {
  const fn = lead.firstName.trim();
  return fn ? `${fn}, the right capital for ${lead.company}` : `The right capital for ${lead.company}`;
}

// Plain-text part (every HTML email should ship a text alternative).
export function buildCampaignText(lead: CampaignLead, sender: Sender): string {
  const services = SERVICES.map((s) => `• ${s.name}. ${s.line}`).join("\n");
  return [
    `Hi ${greet(lead.firstName)},`,
    `I'm ${sender.displayName} from Akro Ventures. We help established businesses like ${lead.company} access the right capital, quickly and on terms that actually work for you.`,
    `A few of the ways we do that:`,
    services,
    `We've facilitated Rs 200Cr+ for 50+ businesses, work on a success-fee basis with nothing upfront, and have a 95% approval rate.`,
    `If any of this is relevant to where ${lead.company} is right now, I'd love a quick conversation. You can grab a 30 minute slot here: ${CALENDLY_URL}, or just reply to this email.`,
    `${sender.fullName}\n${sender.title}\n${sender.email} | akroventures.com`,
  ].join("\n\n");
}

function buildCampaignHtml(lead: CampaignLead, sender: Sender): string {
  const servicesHtml = SERVICES.map(
    (s) =>
      `<li style="margin-bottom:10px;"><strong style="color:#1a2e2e;">${s.name}.</strong> ${s.line}</li>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;">
<div style="max-width:560px;padding:32px 20px;">

  <p style="margin:0 0 14px;">Hi ${greet(lead.firstName)},</p>

  <p style="margin:0 0 14px;">I'm ${sender.displayName} from <strong>Akro Ventures</strong>. We help established businesses like <strong>${lead.company}</strong> access the right capital, quickly and on terms that actually work for you.</p>

  <p style="margin:0 0 8px;">A few of the ways we do that:</p>
  <ul style="margin:0 0 16px;padding-left:20px;color:#374151;">
    ${servicesHtml}
  </ul>

  <p style="margin:0 0 18px;">We've facilitated <strong>₹200Cr+</strong> for <strong>50+ businesses</strong>, work on a <strong>success-fee basis</strong> with nothing upfront, and have a 95% approval rate.</p>

  <p style="margin:0 0 16px;">If any of this is relevant to where ${lead.company} is right now, I'd love a quick conversation.</p>

  <table cellpadding="0" cellspacing="0" style="margin:6px 0 22px;">
    <tr>
      <td>
        <a href="${CALENDLY_URL}" style="display:inline-block;background:#295757;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:11px 22px;border-radius:4px;">
          Book a 30-min call
        </a>
      </td>
      <td style="padding-left:14px;font-size:13px;color:#6b7280;vertical-align:middle;">or just reply to this email</td>
    </tr>
  </table>

  <p style="margin:0;font-size:14px;">
    ${sender.fullName}<br>
    ${sender.title}<br>
    <a href="mailto:${sender.email}" style="color:#1a1a1a;text-decoration:none;">${sender.email}</a> &nbsp;|&nbsp; <a href="https://akroventures.com" style="color:#1a1a1a;text-decoration:none;">akroventures.com</a>
  </p>

</div>
</body>
</html>`;
}

function textToHtml(text: string): string {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;color:#1a1a1a;line-height:1.7;max-width:560px;padding:32px 20px;">${
    text.split(/\n\n+/).map(p => `<p style="margin:0 0 14px;">${p.replace(/\n/g, "<br>")}</p>`).join("")
  }</body></html>`;
}

export async function sendCampaignEmail(
  lead: CampaignLead,
  senderUsername: string | null,
  override?: { subject?: string; text?: string },
): Promise<string> {
  const sender = resolveSender(senderUsername);
  const subject = override?.subject ?? buildCampaignSubject(lead);
  const text    = override?.text    ?? buildCampaignText(lead, sender);
  const html    = override?.text    ? textToHtml(override.text) : buildCampaignHtml(lead, sender);
  const info = await transportFor(sender).sendMail({
    from: `"${sender.fullName} · Akro Ventures" <${sender.email}>`,
    to: lead.email,
    cc: sender.email,
    subject,
    text,
    html,
  });
  return info.messageId;
}
