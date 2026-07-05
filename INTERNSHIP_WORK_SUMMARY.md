# Akro Ventures — Deal Flow CRM
## Internship Work Summary

**Intern:** Pari Goyal  
**Organisation:** Akro Ventures  
**Period:** June – July 2025  
**Project:** Internal CRM and outreach system  
**Live URL:** https://crm.akroventures.com  
**Stack:** Next.js 14 (App Router), TypeScript, Supabase (PostgreSQL), Vercel, GoDaddy SMTP  
**Repository:** https://github.com/Parigoyal762004/deal-flow-mvp

---

## Origin & Why This Was Built

Akro Ventures is an investment advisory firm that helps startups and businesses raise capital — across equity fundraising, debt, project funding, FDI advisory, and invoice factoring. When I joined as an intern, the team was managing their entire deal pipeline manually: founders emailed in, details were tracked in spreadsheets, approval emails were composed by hand, and there was no system for following up, tracking due diligence, or attributing deals to specific team members.

The immediate question was: why not just use an existing CRM like HubSpot, Pipedrive, or Zoho?

The answer is that none of them fit Akro's specific workflow:
- Akro's deal intake needs to be a **public-facing form** that founders submit directly — not a manually logged entry
- The approval flow is unusual: an AI reads the pitch deck, generates a draft email to the founder, and then the team gets to approve/edit/reject that specific draft before it goes out
- Emails need to go **from the individual team member's mailbox**, not from a generic company address — because founders need a named person to reply to
- Akro runs a parallel **lending campaign** (bulk cold outreach to SME prospects) that needs MX verification, throttling, and a separate inbox-style reply tracker
- Due diligence is split across **debt** and **equity** tracks with different document requirements — no generic CRM handles that

So the CRM was built entirely from scratch, designed exactly around how Akro actually works.

The project started as a proof-of-concept called `deal-flow-mvp`. Over the internship it grew into a production system live at `crm.akroventures.com`, handling real deals submitted by real founders, and used daily by the four-person Akro team.

---

## System Architecture

```
Browser (Next.js — React Server Components)
        ↕ HTTPS
Vercel Edge + Node.js serverless functions
        ↕
Supabase (PostgreSQL) — deals, leads, dd_checklist, user_goals tables
        ↕ SMTP (GoDaddy secureserver.net:465)
Per-user mailboxes (pari.goyal@ / rohit.jain@ / eva.kriplani@ / akshita.chahande@)
        ↕
Anthropic Claude API — pitch deck analysis, draft generation
Hunter.io API — email finder + verifier
```

---

## What Was Built

### 1. Deal Intake — Public Submission Form

Founders submit their startup at `/submit`. Fields captured:
- Startup name, founder name, email
- Website, LinkedIn profile, pitch deck URL
- Funding stage (Pre-Seed / Seed / Series A / Series B / Growth / Other)
- Industry, source, notes, additional links (up to 20 extra URLs)

All inputs are validated and sanitised server-side before touching the database:
- URLs are allow-listed to `http/https` only — blocks `javascript:`, `data:`, and `vbscript:` injection
- Text fields are clamped to safe maximum lengths
- Email format is validated with regex and length check
- `stage` and `source` fields are validated against a fixed enum list

The form responds instantly. Background processing (Claude analysis + approval email) runs asynchronously via `waitUntil()` so founders are never blocked waiting for AI.

---

### 2. AI-Powered Deal Analysis (Claude / Anthropic)

On every new submission, the pitch deck URL is sent to Claude (Anthropic's API) for analysis.

Claude generates:
- A structured **deal summary** (what the company does, traction signals, business model)
- An **assessment** (strengths, risks, recommended Akro service — fundraising vs. debt vs. project funding)
- A **personalised first-contact email draft** addressed to the founder

The generated draft is stored in Supabase alongside the deal record and shown to the team in the approval email. The team can approve it as-is, edit it, or reject the deal outright — all from their email inbox.

---

### 3. Internal Approval Workflow

When a deal is submitted and analysed, the team receives a formatted HTML email containing:
- Founder and startup details
- Claude's deal summary and risk notes
- The full draft email to the founder, previewed inline
- Three action buttons: **Approve & Send**, **Edit & Send**, **Reject**

Security detail: the approval endpoint was originally a GET request (one URL click = action taken). This was a vulnerability — corporate email scanners (Gmail, Outlook SafeLinks, GoDaddy filters) automatically pre-fetch every URL in an incoming email for spam/phishing detection, which meant deals were being **auto-approved before any human read the email**. This was discovered and fixed: GET now only renders a confirmation page; the actual approve/reject/send only fires on a subsequent POST, requiring a real button click.

Approval tokens are single-use UUIDs stored in the database — an already-processed deal cannot be re-triggered by replaying the same URL.

---

### 4. Personalised Founder Emails — Simplified & Reliable

**Original approach:** The system attempted to personalise the draft email dynamically — detecting funding stage, extracting a "signal" from the notes (revenue, city count, user base), varying the subject line and bullet points by industry. This produced inconsistent output and was difficult to maintain.

**Revised approach (July 2025):** The founder email was simplified to a clean, consistent format:
- Opening line: `Hi [FirstName], I wanted to reach out about [StartupName].`
- Lists all 7 Akro services with a one-line description each
- Closes with the success-fee model line and Calendly booking button
- Subject: `[FirstName], the right capital for [StartupName]`

This removed approximately 135 lines of conditional logic and produced emails that are shorter, clearer, and more on-brand. The 7 services covered:
1. Startup Fundraising
2. Startup Consultation
3. Unsecured Business Loans
4. Secured Loans
5. Project Funding
6. FDI & ECB Advisory
7. Export Invoice Factoring

---

### 5. Multi-User Authentication System

Converted from a single shared login to a 4-user team CRM.

**Users:** Pari Goyal · Rohit Jain · Eva Kriplani · Akshita Chahande

**How it works:**
- Custom session system built with **HMAC-SHA256** signed tokens using the Web Crypto API — no external JWT library required, runs in both Node.js and Vercel Edge
- Passwords stored as **salted SHA-256 hashes** only — no plaintext anywhere in the codebase
- Constant-time string comparison on password hashes to prevent timing attacks
- 30-day session cookies (`httpOnly`, `secure`, `sameSite: lax`)
- Auth fails closed in production if `AUTH_SECRET` is missing or shorter than 32 characters

**Middleware protection:**
- Every route except `/login`, `/submit`, `/api/submit-deal`, `/api/approve` requires a valid session
- Unauthenticated API calls return `401 Unauthorized`; unauthenticated page visits redirect to `/login`
- Visiting the root domain redirects logged-in users to `/dashboard`, others to `/login`
- Login rate-limited: 8 failed attempts per 15 minutes per IP address before lockout

---

### 6. Dashboard — Deal Pipeline View

The main CRM view. Shows all deals the signed-in user is permitted to see, grouped by submission date.

**Features:**
- **Collapsible date groups** — deals grouped by submission date, expandable/collapsible; the most recent group is open by default
- **Live search** — searches across startup name, founder name, email, industry, and owner in real time; matching groups expand automatically when a query is active
- **Owner filter dropdown** — filter the pipeline by team member (Pari / Rohit / Eva / Akshita / Unassigned)
- **"My Deals" toggle** — one click to see only your own deals
- **Colour-coded owner chips** — teal for Pari, amber for Rohit, violet for Eva, rose for Akshita
- **Left-border status indicators** — amber = awaiting approval, blue = email sent, green = approved, red = rejected
- **Stats row** — Total Deals / In Progress / Emails Sent / Rejected counts update live with filters
- **DD progress** — each deal card shows percentage completion of its due diligence checklist

**Admin vs. user view (July 2025):**

Pari and Rohit are designated admins. Eva and Akshita are standard users.

- **Admins** see all deals across all team members, with the full owner filter and "My Deals" button
- **Standard users** see only their own deals — the filter is hidden and the Supabase query itself is scoped server-side so there is no way to access other users' deal data, even via the API

This was implemented by adding an `isAdmin()` check in `lib/users.ts` and applying a `.eq("owner", username)` filter in the Supabase query before the data ever reaches the client.

---

### 7. Deal Detail Page

Each deal has a full detail page at `/dashboard/[id]` showing:
- All submitted fields (startup name, founder, stage, industry, source, website links)
- Current status (pending / awaiting approval / sent / approved / rejected)
- AI-generated summary and risk assessment
- Draft email that was sent or is pending
- Meeting status
- Links to DD checklist and Mandate Generator
- Actions: Mark Meeting Held, Reassign Owner

---

### 8. Due Diligence (DD) Checklist

A 26-item due diligence checklist is automatically created for every new deal when it is submitted. The checklist is accessible from the deal detail page once a meeting has been held.

**The 26 items are split into three tracks:**

**Common — required for both debt and equity deals (11 items):**
- Incorporation Certificate (COI), MOA, AOA, Business Commencement Certificate
- Company Type, GST Certificate, GST Returns (2 years, all states)
- Audited/Provisional Balance Sheet (2–3 years)
- Bank Statements (all banks + personal statements of directors/partners, 2 years)
- KYC — Aadhaar + PAN of all Promoters/Partners/Directors
- KYC — Passport of all Promoters/Partners/Directors

**Debt-specific (6 items):**
- Trade License + Electricity Bill (last 3 months)
- Property Ownership Documents
- Valuation Report (Government or Bank approved valuer)
- CIBIL of all Promoters/Partners/Directors
- CMR of the Company
- Any existing Debt/Loan Agreements

**Equity-specific (9 items):**
- Pitch Deck, Financial Model/Projections (3–5 years), Cap Table
- MIS Report/Monthly Revenue Data (last 12 months)
- Use of Funds Breakdown, Team Overview/Org Chart
- Existing Investor Agreements/Term Sheets/SAFEs
- P&L Statement (2–3 years), Last 12 months Bank Statements

**How the checklist works in the system:**
- Each item has a status: `pending` / `received` / `na` (not applicable)
- Team members mark items as they collect documents
- The dashboard shows a percentage completion bar per deal, computed from `received / applicable` items (excluding `na` items)
- For legacy deals created before this feature was built, the checklist is **lazily seeded** on first open — the system detects zero rows and creates all 26 entries automatically via upsert

---

### 9. Mandate Generator

Auto-generates a formal mandate document from the deal data. Accessible from the deal detail page. The mandate includes deal terms, company summary, and Akro's engagement scope.

---

### 10. Dynamic Per-User Email Sending

**The problem:** All emails were going from `info@akroventures.com` regardless of which team member owned the deal or ran the campaign. Founders had no named person to reply to.

**What was built:**
- Deal/founder emails send **from the deal owner's mailbox** — triggered when the owner clicks Approve
- Campaign emails send **from whoever is signed in** when they run the batch
- Every outbound email is **CC'd back to the sender** so they have a copy in their own inbox
- SMTP passwords stored as **encrypted environment variables in Vercel** — never in the codebase
- Falls back gracefully to `info@` if a mailbox password is not yet configured
- Relay: GoDaddy `smtpout.secureserver.net:465` (SSL) — the only relay confirmed working after testing multiple options

**Why passwords go directly into Vercel via API:**
Special characters in passwords (`@`, `#`, `!`) were being mangled by shell interpreters and `.env` parsers. Setting them via Vercel's REST API as raw JSON bypasses all shell interpretation entirely.

---

### 11. Lending Campaign — Bulk Outreach System

An outbound email campaign system for Akro's lending services.

**How it works:**
- Leads imported via CSV (company name, contact name, email)
- Sends templated outreach emails to up to 20 leads per batch
- **MX record verification** before each send — dead/invalid domains are skipped rather than attempted (failed sends damage sender reputation and reduce inbox placement)
- **Throttled sending** — 1.2–2.7 second randomised delay between emails to avoid triggering spam filters
- Emails go from the signed-in team member's mailbox, CC'd to them

**Reply tracking (ghost reply fix — July 2025):**

A persistent bug was causing dismissed replies to reappear in the inbox after every page refresh. Root cause: the UI was using an **optimistic update pattern** — it removed the reply from the screen immediately, then wrote to the database. If the database write failed silently (which it was, due to an unchecked error), the next page load re-fetched the original data and the reply reappeared.

Fix: switched to a **pessimistic update pattern** — the database write happens first, the UI only updates after confirmed success, and any write failure now surfaces an explicit error message next to the dismiss button. The `router.refresh()` call was also removed as it was competing with local state.

**Campaign Dashboard:**
- Stats: Remaining / Sent / Replied / Bounced / Skipped / Total
- Full leads table with search and status filter
- Status chips for each lead: Queued / Sent / Replied / Bounced / Skipped / Suppressed

---

### 12. Per-User Stats & Weekly Goal System (July 2025)

Each team member has a personal stats dashboard at `/my-stats`.

**What it shows:**
- Emails sent and replies received: Today / This Week / This Month / All Time
- Reply rate per period
- Deals added: This Week / This Month / All Time
- Weekly goal progress — a progress bar showing current week's sends vs. the target, with a colour-coded on-track/behind status

**Goal setting:**
- Each user can set a weekly email target from the My Stats page
- Goals are stored in a `user_goals` Supabase table (one row per user, upserted on save)
- The progress bar recalculates expected pace: if today is Day 3 of 7, the system expects `goal × (3/7)` emails to have been sent by now

**Automated reminder emails:**
- A Vercel cron job (`/api/cron/goal-reminder`) runs Monday–Friday at 9 AM UTC
- For every user with a goal set, it checks if they are behind their expected daily pace
- Users who are behind receive an email from their own mailbox with the shortfall and a link back to the dashboard
- Protected with `CRON_SECRET` so external callers cannot trigger it

**Data privacy:**
- The `/my-stats` page fetches only the signed-in user's own rows from Supabase — team members cannot see each other's individual stats

---

### 13. Security Hardening

**Authentication & Session:**
- HMAC-SHA256 signed session tokens (unforgeable without `AUTH_SECRET`)
- Fail-closed: app refuses to run in production without a strong secret (minimum 32 characters)
- Salted password hashing with constant-time comparison to prevent timing attacks
- Rate limiting on login: 8 failed attempts / 15 minutes per IP

**Input Validation:**
- All user-submitted text clamped to safe maximum lengths
- URLs allow-listed to `http/https` only
- Email format validated with regex + length check
- Enum validation on `source` and `stage` fields
- Additional links capped at 20, each URL validated individually

**XSS Prevention:**
- `escapeHtml()` applied to all user-controlled data rendered into HTML email bodies and pages
- Stored XSS sinks (deal names, founder names from public form) are escaped before appearing in approval emails and response pages

**CSRF Protection:**
- Middleware rejects cross-origin `POST/PUT/PATCH/DELETE` to API routes
- Session cookies use `sameSite: lax`

**HTTP Security Headers (on every response):**
- `Content-Security-Policy` — restricts script/style/font/image/connect sources
- `Strict-Transport-Security` — HSTS with 2-year max-age, includeSubDomains, preload
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` — disables camera, microphone, geolocation

**Email Scanner Vulnerability (discovered and fixed):**
Corporate email scanners (Gmail, Outlook SafeLinks, GoDaddy filters) automatically pre-fetch every URL in an incoming email. The original `/api/approve` was a GET that took immediate action, meaning deals could be auto-approved before anyone read the email. Fixed: GET now renders a confirmation page only; action fires on a subsequent POST requiring physical button click.

**Rate Limiting:**
- Public deal submission: 8/min + 40/hr anonymous, 300/hr for logged-in team
- Login: 8 failed attempts / 15 min per IP
- Find-email (Hunter.io paid credits): 120/min per user
- Send-edited: 20/hr per user
- In-memory sliding window with probabilistic cleanup

---

### 14. Hunter.io Email Discovery Integration

- Integrated Hunter.io API for finding and verifying founder email addresses
- Two-step flow: Finder API first, then Verifier only for medium-confidence results
  - Score ≥ 85: trust directly, skip Verifier (saves paid API credits)
  - Score 30–84: run Verifier to confirm deliverability
  - Score < 30: flag as unverified, skip Verifier
- Accessible via CSV bulk upload tool (auth-gated, team only)

---

### 15. Brand Design System

**Colour palette:**

| Token | Hex | Usage |
|---|---|---|
| Brand (Teal) | `#1A4A44` | Primary actions, nav, headers |
| Gold | `#D4A017` | Accents, highlights, section labels |
| Plum | `#453643` | Secondary text |
| Ink | `#28112B` | Body text |
| Mint | `#E5F4E3` | Page backgrounds |

**Typography:**
- **Space Grotesk** — headings and display text
- **Inter** — body text
- **JetBrains Mono** — code and monospace elements

**Responsive design:**
- Custom `xs: 400px` breakpoint added to Tailwind config
- All key pages work on mobile
- Nav collapses on small screens, shows only essential items

---

### 16. Custom Domain & Deployment

- Deployed on **Vercel** with continuous deployment from GitHub (`main` branch auto-deploys)
- Custom domain: **crm.akroventures.com** (CNAME → Vercel, SSL auto-provisioned)
- All sensitive credentials (Supabase keys, SMTP passwords, auth secret) stored as encrypted Vercel environment variables — never in the repository
- `NEXT_PUBLIC_APP_URL` set to `https://crm.akroventures.com` so all email links point to the branded domain

---

## How the System Works End-to-End

**Deal intake and approval:**
```
Founder submits deal at crm.akroventures.com/submit
        ↓
Deal saved to Supabase instantly → success page shown to founder
        ↓
Background: Claude analyses pitch deck → generates summary + draft email
        ↓
Approval email sent to team (HTML, with AI summary + draft preview)
        ↓
Team member clicks Approve → confirmation page → POST → founder email sent
        (from deal owner's mailbox, with their name/title/phone in signature)
        ↓
Deal marked approved in dashboard; team tracks full pipeline from here
        ↓
When meeting is held, team opens deal → DD checklist available
        (26 items split across debt/equity tracks, progress tracked per deal)
```

**Lending campaign:**
```
Team member signs into crm.akroventures.com
        ↓
Campaign page → clicks "Send 20 now"
        ↓
System picks next 20 "queued" leads, verifies each domain has valid MX records
        ↓
Sends templated lending email from signed-in user's mailbox, CC'd to them
        (1.2–2.7 sec random delay between sends)
        ↓
Leads table updates: Sent / Skipped / Bounced with timestamps
        ↓
If a founder replies → appears in Replies inbox; team can dismiss or convert to deal
```

**Per-user accountability:**
```
Every evening, each user visits /my-stats
        ↓
Sees their own email counts: today / this week / this month / all time
        ↓
Sets a weekly email goal (e.g. 100 emails/week)
        ↓
Mon–Fri at 9 AM, cron checks if user is behind their daily pace
        ↓
If behind → reminder email sent from their own mailbox with shortfall count
```

---

## Technology Decisions

| Decision | Why |
|---|---|
| Next.js App Router (server components) | All sensitive data (session, DB queries) stays server-side; no API calls exposed to the browser |
| Web Crypto API for auth | Runs in both Node.js and Edge runtime (middleware); no external JWT library needed |
| Supabase with service role key | Full control over schema and queries server-side; RLS as backstop |
| GoDaddy SMTP relay | Only relay that authenticated reliably after testing; Titan SMTP failed repeatedly due to credential issues |
| Vercel REST API for env vars | Special characters in passwords mangled by shell/`.env` parsers — raw JSON API bypasses this entirely |
| Pessimistic UI updates | Optimistic UI was masking silent database failures (the root cause of the ghost-reply bug) |
| In-memory rate limiting | Zero-infra for a 4-person internal tool; noted limitation is per-serverless-instance |
| Server-side owner filter for non-admins | Hiding UI controls is insufficient — the query itself is scoped at the DB layer |

---

## Planned Enhancements (July–August 2025)

The following features are planned for the next sprint:

**1. Active Deals Page**
A dedicated view showing only deals where meaningful engagement has occurred — either a meeting has been held or the founder has replied to the outreach email. This separates "live" pipeline from cold leads that haven't responded.
Will also include a **Delete / Archive** action on deals, so the team can remove test entries or cancel stale deals without losing them from audit history.

**2. Deal Notes**
A free-text notes field per deal, editable from the deal detail page. Team members can log call summaries, follow-up commitments, and context that doesn't fit the structured fields. Notes would be timestamped and attributed to the team member who wrote them.

**3. Reply Tracker on Dashboard**
Currently, founder replies are only visible inside the Campaign page. The plan is to surface a "Replied" badge directly on deal cards in the main dashboard, so the team can see at a glance which founders responded without navigating to a separate page.

**4. Pipeline Kanban View**
An alternative view of the dashboard as a Kanban board with columns: Submitted → Contacted → Meeting Held → DD In Progress → Closed. Drag-and-drop to move deals between stages. The current date-grouped list view would remain as an option.

**5. Bulk CSV Upload for Deals**
Currently deals are submitted one at a time via the form. The team occasionally sources batches of leads from databases. A bulk upload flow would let admins upload a CSV, map columns to deal fields, and create multiple deals at once — with the same AI analysis and approval flow triggering per deal.

**6. Export to CSV / Excel**
Admins (Pari / Rohit) should be able to download the full pipeline as a spreadsheet for reporting and investor updates. The export would respect the current filters applied on the dashboard.

**7. Mandate Auto-Send**
After generating a mandate document from the deal detail page, the team currently downloads it and sends it manually. The plan is to add a "Send to Founder" button on the mandate page that emails the document directly to the founder's email as an attachment, from the deal owner's mailbox.

---

## Complete Commit History

```
b00d8d8  fix: remove duplicate dynamic export in deal detail page
25315f3  Add admin vs user view on dashboard
e14fe96  Add per-user stats + weekly goal feature
9d070d7  Simplify founder email to services list + CTA
a58ccaf  Fix campaign ghost replies (pessimistic UI, DB-first dismiss)
27d8111  Fix search bar (force details remount on active query)
aebb240  Fix: suppress lead in replies inbox even after refresh
7dbd37c  Fix: replies inbox dismiss and convert reliability
5b34b47  Fix: DD progress persists on navigation
88f1258  Fix: submit deal button routes to /submit
a5fcedb  Redirect / to login or dashboard; move submission form to /submit
b7c436e  Security hardening: 5 fixes from full audit
7585776  Campaign dashboard + 7 services + Eva email + CC fix
8211c87  Dynamic per-user email sending (deal owner / campaign operator)
86f5ad3  Fix tsconfig target ES2020 (Uint8Array/Map iteration on Vercel)
8720796  Redeploy with AUTH_SECRET configured
c67d0ed  Multi-user CRM, deal ownership, security hardening, brand redesign
9912c79  Add Campaign link in dashboard header
44d1189  Campaign sender: use GoDaddy relay, not Titan SMTP
cfa017c  Add lending-services bulk campaign (20/day, MX-verified)
8f60f64  DD checklist, deal detail page, mandate generator
c7c4b1a  Two-stage pipeline prompt, revenue proxy, Hunter confidence scoring
f0ddade  Full founder email rewrite — nerve line, real numbers, Calendly button
1046883  Chain Hunter Verifier after Finder
ec0c737  Hunter.io auto-lookup for estimated emails in CSV upload
e468700  Bullet-point email structure — stage-specific, skimmable
```

---

## Secondary Project — Personal Portfolio Website

In parallel with the CRM, a personal portfolio website was designed and deployed at Pari's custom domain. The site targets capital markets and GTM roles, anchored around the ₹20 Crore fundraising mandate that Akro ran. Built with Next.js, deployed on Vercel, with a strict light-palette design system (no dark mode, no glow effects, typographic hierarchy using space and weight rather than colour).

Key decisions: positioned around outcomes (capital raised, sectors covered, advisory depth) rather than a conventional "about me" format; structured for recruiter scan patterns with a clear above-the-fold value statement.
