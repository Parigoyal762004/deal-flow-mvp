# Akro Ventures — Deal Flow MVP

Internal deal management system for Akro Ventures. Handles lead intake, AI-powered deal analysis, team approval workflow, and personalised founder outreach emails.

**Live URL:** https://deal-flow-mvp.vercel.app  
**Owner:** Pari (Operations & Technology, Akro Ventures)  
**Stack:** Next.js 14 (App Router), Supabase (Postgres), Nodemailer (GoDaddy SMTP), Groq AI (llama-3.3-70b)

---

## What This System Does — Full Flow

```
Lead found → Deal submitted → AI analysis → Team approval email
     → Team approves / edits / rejects → Founder receives personal email
```

### Step by step

1. **A deal is submitted** — either via the web form (one at a time) or CSV bulk upload (many at once)
2. **AI analysis runs in the background** — Groq analyses the pitch deck and deal details, generates an internal summary (strengths, risks, recommended service)
3. **Internal approval email** is sent to `info@akroventures.com` with:
   - Full deal details (founder, stage, industry, source)
   - AI-generated internal summary
   - Draft founder email preview (personalised from form data — no AI dependency)
   - Three action buttons: **Approve & Send**, **Edit & Send**, **Reject**
4. **Team takes action:**
   - **Approve** → founder receives the draft email exactly as shown, instantly
   - **Edit & Send** → team is taken to `/edit-email?token=...` to edit the draft, then sends
   - **Reject** → nothing sent to founder, deal marked rejected in dashboard
5. **Founder receives** a plain-text personal email from `Rohit from Akro Ventures` — no logo, no colours, no marketing look. Signed by Rohit Jain personally. Includes a Calendly link for a 15-min call.

---

## Pages

| Route | What it does |
|---|---|
| `/` | Submit a single deal (form) + CSV bulk upload |
| `/dashboard` | View all deals, status, filter by stage/source |
| `/edit-email?token=xxx` | Edit the draft email before sending to founder |
| `/api/submit-deal` | POST — creates deal in DB, triggers background AI + approval email |
| `/api/approve?token=xxx&action=approve/reject` | GET — team clicks from email to approve or reject |
| `/api/send-edited` | POST — sends the manually edited email to founder |

---

## Email System

### Founder email (what founders receive)
- **From:** `Rohit from Akro Ventures <info@akroventures.com>`
- **Subject:** `[FirstName], a thought on [StartupName]`
- **CC:** `info@akroventures.com` (so team always has a copy in inbox)
- **Design:** Plain text only — no logo, no colours, no buttons. Looks like a real person typed it in Gmail.
- **Content:** Personalised from form data using smart templates (source-based opener, industry insight, stage-appropriate Akro pitch) — zero LLM dependency
- **CTA:** Plain Calendly link inline — https://calendly.com/akroventures-info/new-meeting
- **Signed by:** Rohit Jain, Akro Ventures

### Internal approval email (what the team receives)
- **To:** `info@akroventures.com`
- **Design:** Branded teal/gold — clearly internal, not for forwarding
- **Contains:** Deal details card, AI summary (strengths/risks/service), draft email preview, 3 action buttons

### SMTP config
- **Host:** `smtpout.secureserver.net` port 465, secure: true (GoDaddy relay)
- **DO NOT change to** `smtp.titan.email` — that one does not work
- **User:** `info@akroventures.com` | **Pass:** in `.env.local` as `SMTP_PASS`

---

## CSV Bulk Upload

On the home page (`/`), below the single deal form, there is a **Bulk Upload via CSV** section.

**Supported columns (flexible — all synonyms map automatically):**

| CSV column | Maps to |
|---|---|
| `startup_name` / `company_name` / `company` | Startup name |
| `founder_name` / `founder` | Founder name |
| `founder_email` / `email` / `estimated_email` | Founder email |
| `source` | Source (Backrr / LinkedIn / Referral / Cold Outreach / Event / Other) |
| `industry` / `sector` | Industry |
| `stage` / `last_funding_round` | Stage (pre-seed / seed / series-a / series-b / growth) |
| `website_url` / `source_url` | Website |
| `notes` / `akro_rationale` / `why_akro` | Notes |

Pipeline output columns are automatically recognised — upload Claude research output directly.  
Deals submit one by one with 800ms delay. One approval email per deal lands in the team inbox.

---

## Lead Research Pipeline

See `docs/PIPELINE_INSTRUCTIONS.md` for full operating procedure.  
See `docs/LEAD_RESEARCH_PROMPT_v2.md` for the Claude prompt to run.

**How pipeline connects to this app:**

1. Open Claude.ai (web search ON)
2. Paste the prompt from `docs/LEAD_RESEARCH_PROMPT_v2.md` — replace today's date at the top
3. Claude researches 15–25 Indian growth companies and outputs:
   - Full research table (save for your records)
   - A **CSV block** with exactly the right column headers
   - Market context for outreach timing
4. Copy the CSV block → save as `leads_YYYY-MM-DD.csv`
5. Go to https://deal-flow-mvp.vercel.app → scroll to CSV upload section
6. Upload the file → preview the deals → click **Submit X deals**
7. Approval emails arrive in `info@akroventures.com` one by one — team approves each

---

## Environment Variables

Stored in `.env.local` (never commit — already in `.gitignore`).  
Also set as Vercel environment variables for production.

```
NEXT_PUBLIC_APP_URL=https://deal-flow-mvp.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://hzsatixvibqminwgwycf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SMTP_USER=info@akroventures.com
SMTP_PASS=...
APPROVAL_EMAIL_RECIPIENTS=info@akroventures.com
GROQ_API_KEY=...
```

---

## Database (Supabase)

**Project ID:** `hzsatixvibqminwgwycf`  
**Main table:** `deals`

| Column | Purpose |
|---|---|
| `id` | UUID primary key |
| `startup_name`, `founder_name`, `founder_email` | Core deal info |
| `source`, `industry`, `stage` | Classification |
| `pitch_deck_url` | Supabase Storage URL |
| `ai_summary` | Groq-generated internal analysis |
| `draft_email` | The exact founder email the team approved — source of truth |
| `approval_token` | UUID used in approve / reject / edit URLs |
| `approval_status` | `pending` / `approved` / `rejected` |
| `email_status` | `pending` / `awaiting_approval` / `sent` / `failed` |

Secondary table `akro_leads` stores pipeline research output (schema in `docs/PIPELINE_INSTRUCTIONS.md`).

---

## Project Structure

```
deal-flow-mvp/
├── app/
│   ├── page.tsx                     # Home — deal form + CSV upload
│   ├── layout.tsx                   # Nav, favicon, metadata
│   ├── dashboard/page.tsx           # Deal pipeline view
│   ├── edit-email/
│   │   ├── page.tsx                 # Server — loads deal by token
│   │   └── EditEmailClient.tsx      # Client — editable textarea + send
│   └── api/
│       ├── submit-deal/route.ts     # POST — create deal, trigger background AI
│       ├── approve/route.ts         # GET — approve or reject via token
│       └── send-edited/route.ts     # POST — send manually edited email
├── components/
│   ├── DealForm.tsx                 # Single deal form
│   ├── CSVUpload.tsx                # CSV bulk upload with per-row progress
│   ├── FileUpload.tsx               # Pitch deck upload to Supabase Storage
│   └── AdditionalLinks.tsx          # Extra links field
├── lib/
│   ├── email.ts                     # ALL email logic — SMTP, templates, send functions
│   ├── claude.ts                    # Groq AI — internal summary only (not founder email)
│   ├── akro-knowledge.ts            # Akro context injected into AI prompt
│   ├── types.ts                     # TypeScript Deal type
│   ├── supabase.ts                  # Supabase client (browser)
│   ├── supabase-server.ts           # Supabase client (server, service role)
│   └── utils.ts                     # Shared helpers
├── public/
│   ├── akro-logo-full.jpg           # Full wordmark (used in internal approval email)
│   └── akro-icon.jpg                # Circular icon (favicon + internal email header)
├── docs/
│   ├── PIPELINE_INSTRUCTIONS.md     # How to run the weekly lead research pipeline
│   └── LEAD_RESEARCH_PROMPT_v2.md   # Claude prompt for lead research (outputs CSV)
├── supabase/
│   └── schema.sql                   # Full DB schema — run once to set up
└── .env.example                     # Template for environment variables
```

---

## Key Design Decisions

- **Founder email never uses AI** — smart templates from form data. Reliable, instant, no API dependency.
- **AI (Groq) is only for the internal team summary** — strengths, risks, recommended service.
- **`draft_email` is the source of truth** — what the team sees in the approval email is exactly what gets sent. `sendFounderEmail` always uses `deal.draft_email`, never regenerates.
- **Emails look like real Gmail** — no logo, no colours in founder emails. Plain text feel = higher reply rates, avoids spam filters.
- **Subject is personal** — `FirstName, a thought on StartupName` — no fake "Re:", no company prefix.

---

## Deployment

Auto-deploys from GitHub `main` branch via Vercel git integration.

Manual deploy:
```bash
npx vercel deploy --prod
```

GitHub: https://github.com/Parigoyal762004/deal-flow-mvp

---

## For Any AI Reading This

The critical files to read first:
1. `lib/email.ts` — all email logic lives here
2. `lib/claude.ts` — Groq integration (summary only)
3. `app/api/submit-deal/route.ts` — deal creation + background processing
4. `app/api/approve/route.ts` — approval flow
5. `components/CSVUpload.tsx` — bulk upload logic
6. `supabase/schema.sql` — full database schema

**SMTP host is `smtpout.secureserver.net:465`. Never change it to `smtp.titan.email`.**
