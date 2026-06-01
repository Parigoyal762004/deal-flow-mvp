# Akro Ventures — Lead Research Pipeline
## Standard Operating Procedure

**Version**: 1.0 | **Last Updated**: June 1, 2025
**Owner**: Pari (Operations & Technology, Akro Ventures)
**Purpose**: Systematic discovery of Indian growth companies (₹50Cr+ revenue) as investor-connect and advisory leads

---

## What This Pipeline Does

Every time you run this pipeline, it:

1. Searches for high-growth Indian companies active in today's market
2. Qualifies them against Akro's revenue threshold (₹50Cr+)
3. Finds founder / finance contact details
4. Scores each lead for fit
5. Stores results in Supabase with today's date as a timestamp
6. Surfaces market context relevant to outreach timing

You can run this weekly or fortnightly. Each run is date-stamped so you can track which leads came from which market moment.

---

## Prerequisites

| Tool | Purpose | Status |
|---|---|---|
| Claude.ai (Pro) | Run the research prompt with web search | Required |
| Supabase project `hzsatixvibqminwgwycf` | Store leads | Already set up |
| LinkedIn (personal or Sales Navigator) | Contact verification | Manual step |
| Email (Rohit's domain or your own) | Outreach | Manual step |

**Web search must be ON** when running the Claude prompt. Toggle it in the Claude chat interface before pasting the prompt.

---

## Supabase Table Setup

Run this SQL once in your Supabase SQL editor to create the leads table:

```sql
CREATE TABLE IF NOT EXISTS akro_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date_found DATE NOT NULL,
  company_name TEXT NOT NULL,
  sector TEXT,
  hq_city TEXT,
  estimated_revenue TEXT,
  revenue_proof TEXT,
  last_funding_round TEXT,
  funding_amount TEXT,
  funding_date TEXT,
  growth_signal TEXT,
  founder_name TEXT,
  founder_linkedin TEXT,
  cfo_name TEXT,
  estimated_email TEXT,
  akro_fit_score TEXT CHECK (akro_fit_score IN ('Hot', 'Warm', 'Cold')),
  akro_rationale TEXT,
  source_url TEXT,
  outreach_status TEXT DEFAULT 'Not Started' 
    CHECK (outreach_status IN ('Not Started', 'LinkedIn Sent', 'Email Sent', 'Responded', 'Meeting Booked', 'Not Interested', 'Archived')),
  outreach_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast filtering by date and score
CREATE INDEX idx_akro_leads_date ON akro_leads(date_found);
CREATE INDEX idx_akro_leads_fit ON akro_leads(akro_fit_score);
CREATE INDEX idx_akro_leads_status ON akro_leads(outreach_status);
```

---

## How To Run — Step by Step

### Step 1: Open a fresh Claude chat
- Go to claude.ai → New Chat
- **Turn on Web Search** (toggle in the input bar)
- Make sure you're using Claude Sonnet or Opus (not Haiku)

### Step 2: Set today's date in the prompt
- Open `LEAD_RESEARCH_PROMPT.md`
- Find this line: `### TODAY'S DATE: {INSERT TODAY'S DATE}`
- Replace with today's actual date, e.g.: `### TODAY'S DATE: June 1, 2025`
- Copy the entire prompt

### Step 3: Paste and run
- Paste into Claude
- Let it run fully — it will search multiple sources
- This typically takes 3–5 minutes

### Step 4: Copy the output table
- Copy the markdown table Claude produces
- Also copy the "Today's Market Context" section — save it separately

### Step 5: Insert into Supabase
Use the Supabase dashboard Table Editor, or run SQL inserts.

**Quick paste method via Claude:**
After getting the table, open a second Claude chat and paste:

```
Convert this markdown lead table into individual Supabase SQL INSERT statements 
for the table `akro_leads`. Use today's date as date_found. 
Set outreach_status = 'Not Started' for all rows.

[PASTE YOUR LEAD TABLE HERE]
```

Then run those INSERT statements in the Supabase SQL editor.

### Step 6: Review and prioritize
- In Supabase, filter by `akro_fit_score = 'Hot'`
- These are your Week 1 outreach targets
- Move to `akro_fit_score = 'Warm'` in Week 2

---

## Outreach Protocol

### LinkedIn Outreach (Connection + Message)

**Connection request note** (300 char limit):

> Hi [Name], I work with Akro Ventures — we help Indian founders at the ₹50–500Cr stage connect with the right capital and strategic partners. Would love to connect and share what we're seeing in the market.

**Follow-up message after connection** (send 2–3 days later):

> [Name], thanks for connecting. We're currently working with investors looking specifically at [sector] businesses in India. Given [Company]'s growth trajectory, there could be a relevant fit worth a 15-minute call. Would that be of interest?

---

### Email Outreach

**Subject line options** (A/B test these):
- `Investor interest in [Company Name] — Akro Ventures`
- `Capital access for [Company] — worth a quick call?`
- `[Founder Name], a relevant investor introduction`

**Email body template:**

> Hi [Name],
>
> I'm reaching out from Akro Ventures — we're a financial advisory firm focused on helping Indian founders at the ₹50Cr+ stage access institutional capital and strategic growth partnerships.
>
> We've been tracking [Company]'s growth and believe there's a strong fit with a few investors in our network who are actively deploying in [sector] right now.
>
> Would you be open to a 15-minute introductory call this week or next? Happy to share more context on what we're seeing on the investor side.
>
> Best,
> [Your name]
> Akro Ventures | [Phone] | [Website]

---

## Tracking Outreach in Supabase

After each outreach action, update the record:

```sql
UPDATE akro_leads
SET 
  outreach_status = 'LinkedIn Sent',
  outreach_notes = 'Sent connection request on June 2, 2025. Message: standard intro.',
  updated_at = NOW()
WHERE company_name = 'XYZ Company';
```

Add an `updated_at` column if not already present:
```sql
ALTER TABLE akro_leads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
```

---

## Run Cadence

| Frequency | Action |
|---|---|
| Weekly (Monday) | Run the research prompt, add new leads to Supabase |
| Weekly (Tuesday) | LinkedIn outreach to all new Hot leads |
| Weekly (Wednesday) | Email outreach to Hot leads with no LinkedIn response |
| Bi-weekly | Follow up on Warm leads from previous run |
| Monthly | Archive Cold leads with no engagement after 3 touches |

---

## Quality Control

Before inserting into Supabase, verify each lead manually:

- [ ] Company exists and is findable on Google
- [ ] Revenue signal is from a credible source (not a random blog)
- [ ] Founder LinkedIn URL resolves correctly
- [ ] Company is NOT listed on NSE/BSE mainboard
- [ ] No duplicate of an existing Supabase record (search by company name first)

---

## Notes

- The prompt is designed to be market-aware. It will pick up on what's happening today — funding activity, sector momentum, policy changes. This is why you run it fresh each week rather than reusing old output.
- If Claude misses a sector you care about in a given run, add a follow-up message in the same chat: "Now specifically search for growth companies in [sector] with ₹50Cr+ revenue."
- LinkedIn outreach performs better Tuesday–Thursday, 9am–11am IST.
- Email outreach performs better Monday and Thursday mornings.

---

*Built for Akro Ventures internal use. Do not distribute.*
