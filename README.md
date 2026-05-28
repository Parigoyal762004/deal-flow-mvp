# Deal Flow MVP — Akro Ventures

Semi-automated investor deal-flow system. Founders submit pitch decks via a form → Claude AI analyzes and drafts a response → your team approves/rejects before anything reaches the founder.

## Stack

| Layer | Tool |
|---|---|
| Frontend | Next.js 14 (App Router) on Vercel |
| Database | Supabase (Postgres + Storage) |
| Automation | n8n |
| LLM | Anthropic Claude (claude-sonnet-4-6) |
| Email | Resend |

---

## Architecture

```
Browser Form
    │  PDF upload → Supabase Storage
    │  POST /api/submit-deal
    ▼
Next.js API Route
    │  INSERT deal → Supabase
    │  POST → n8n Webhook (Workflow 1)
    ▼
n8n Workflow 1 — Intake
    │  Download PDF from Supabase Storage
    │  Send PDF to Claude API
    │  Parse AI summary + draft email
    │  PATCH deal → Supabase (status: awaiting_approval)
    │  Send approval email (Resend) → investment team
    ▼
Team member clicks Approve / Reject (email link)
    ▼
Next.js /api/approve?token=xxx&action=approve|reject
    │  PATCH deal → Supabase (approval_status, email_status)
    │  If approved → POST → n8n Webhook (Workflow 2)
    ▼
n8n Workflow 2 — Send Founder Email
    │  Build HTML email from draft_email field
    │  Send to founder (Resend)
    │  PATCH deal → Supabase (email_status: sent)
```

---

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_ORG/deal-flow-mvp.git
cd deal-flow-mvp
npm install
```

### 2. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. Go to **Storage → New Bucket** (if the SQL insert failed):
   - Name: `pitch-decks`
   - Public: ✅ Yes
   - Allowed MIME: `application/pdf`
   - Max size: 20 MB
4. Copy your keys from **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Resend

1. Sign up at [resend.com](https://resend.com)
2. Add and verify your sending domain
3. Create an API key → `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to a verified sender address

### 4. Environment Variables

```bash
cp .env.example .env.local
# Fill in all values in .env.local
```

### 5. n8n

#### Import workflows
1. Open your n8n instance
2. Go to **Workflows → Import from File**
3. Import `n8n/workflow-1-intake.json`
4. Import `n8n/workflow-2-send-email.json`

#### Set environment variables
In n8n **Settings → Environment Variables**, add all variables listed in `n8n/n8n-env-vars.md`.

#### Set Anthropic credential
- Create a **Header Auth** credential
- Header Name: `x-api-key`
- Header Value: your Anthropic API key
- Attach it to the **HTTP — Claude API Analysis** node in Workflow 1

#### Get webhook URLs
1. Open Workflow 1 → click the Webhook node → copy the **Production URL**
   → paste into `.env.local` as `N8N_INTAKE_WEBHOOK_URL`
2. Open Workflow 2 → copy its webhook URL
   → paste as `N8N_SEND_EMAIL_WEBHOOK_URL`

#### Activate both workflows
Toggle each workflow to **Active**.

### 6. Local Development

```bash
npm run dev
# → http://localhost:3000        (form)
# → http://localhost:3000/dashboard  (pipeline view)
```

### 7. Deploy to Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

Add all `.env.local` variables in **Vercel → Project → Settings → Environment Variables**.

---

## GitHub Push

```bash
git init
git add .
git commit -m "feat: initial deal flow MVP"
git remote add origin https://github.com/YOUR_ORG/deal-flow-mvp.git
git branch -M main
git push -u origin main
```

---

## Testing Checklist

- [ ] Submit form with a real PDF — confirm Supabase Storage upload works
- [ ] Check Supabase `deals` table — row appears with `email_status: pending`
- [ ] n8n Workflow 1 executes — check execution log in n8n
- [ ] `deals` row updates to `email_status: awaiting_approval` with `ai_summary` and `draft_email` populated
- [ ] Approval email arrives in team inbox with correct startup details
- [ ] Click **Approve** → browser shows confirmation page
- [ ] `deals` row updates to `approval_status: approved`, `email_status: sent`
- [ ] n8n Workflow 2 executes — founder email sent
- [ ] Click **Reject** → `approval_status: rejected`, no email sent
- [ ] Dashboard at `/dashboard` shows correct statuses and counts
- [ ] Approval link cannot be used twice (returns "already processed")

---

## Email Status Flow

```
pending → drafted → awaiting_approval → sent
                                      → failed (rejection)
```

## Folder Structure

```
deal-flow-mvp/
├── app/
│   ├── api/
│   │   ├── submit-deal/route.ts   ← saves deal + triggers n8n
│   │   └── approve/route.ts       ← handles approve/reject links
│   ├── dashboard/page.tsx         ← pipeline table + stats
│   ├── layout.tsx
│   ├── page.tsx                   ← submission form
│   └── globals.css
├── components/
│   ├── DealForm.tsx               ← main form (react-hook-form + zod)
│   ├── AdditionalLinks.tsx        ← dynamic link array
│   └── FileUpload.tsx             ← drag-and-drop PDF upload
├── lib/
│   ├── types.ts                   ← shared TypeScript types
│   ├── supabase.ts                ← browser Supabase client + upload helper
│   ├── supabase-server.ts         ← server-only service role client
│   └── utils.ts                   ← cn(), formatDate(), statusColor()
├── supabase/
│   └── schema.sql                 ← full schema + RLS + storage bucket
├── n8n/
│   ├── workflow-1-intake.json     ← importable n8n workflow (intake + Claude)
│   ├── workflow-2-send-email.json ← importable n8n workflow (send to founder)
│   └── n8n-env-vars.md            ← variable reference for n8n
├── emails/
│   ├── approval-email.html        ← internal team approval template (reference)
│   └── founder-response.html      ← founder email template (reference)
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```
