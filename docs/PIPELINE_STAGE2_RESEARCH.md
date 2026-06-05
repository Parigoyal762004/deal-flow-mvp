# Akro Ventures — Pipeline Stage 2: Deep Research and Qualification
# Run AFTER Stage 1. Paste the Stage 1 name list at the bottom of this prompt.
# Use in Claude.ai with web search ON

---

## YOUR JOB IN THIS PROMPT

You have a list of 30 to 40 company names from Stage 1.
Pick the 12 most promising. Research each one deeply.
Remove the ones that fail qualification. Deliver the final table and CSV.

---

## WHAT AKRO VENTURES DOES

Capital advisory firm. Services: unsecured loans (Rs 10L-5Cr), secured loans (Rs 25L-50Cr+),
project funding (Rs 1Cr-100Cr+), startup fundraising (pre-seed to Series A), startup
consultation, FDI/ECB advisory, export invoice factoring. Success fee only, nothing upfront.

PERFECT LEAD: Revenue Rs 50-150Cr, founder-led, seed/Series A at most, no DRHP filed,
not heavily covered in startup media, founder findable on LinkedIn.

---

## STEP 1: PICK YOUR TOP 12 FROM THE STAGE 1 LIST

From the list below, select 12 companies that look most likely to fit.
Immediately exclude any that:
- Revenue signals suggest above Rs 150Cr
- Raised Series B or beyond
- Filed DRHP or announced IPO
- Appear in Inc42 or YourStory frequently
- Have a publicly quoted valuation

---

## STEP 2: REVENUE QUALIFICATION

For each of your 12 companies, confirm or estimate revenue in the Rs 50-150Cr range.

### Direct search first
- "[Company Name] revenue FY24 FY25 crore"
- "[Company Name] annual report turnover India"
- "[Company Name] site:zauba.co OR site:tofler.in"

### If direct revenue data is not found, ESTIMATE from proxies

This is important. Truly under-radar companies will not have revenue in news.
Use this estimation framework:

| Signals | Estimated Revenue Range |
|---|---|
| 50-100 employees + seed Rs 2-5Cr + 3-5 years operating + B2B SaaS | Rs 20-60Cr ARR |
| 100-200 employees + seed Rs 5-10Cr + 4-6 years operating + B2B SaaS | Rs 50-120Cr ARR |
| 100-300 employees + Series A Rs 10-25Cr + 3-5 years + any sector | Rs 50-150Cr |
| 200-500 employees + Series A Rs 20-50Cr + 4-7 years + manufacturing | Rs 80-200Cr |
| Export company + 50-200 employees + 5+ years operating | Rs 40-120Cr |
| D2C brand + 50-150 employees + seed round + 3-5 years | Rs 30-80Cr |
| Clinic/diagnostic chain + 10-30 locations + 4+ years | Rs 40-100Cr |

If your estimate puts them outside Rs 50-150Cr, remove the company.
If you cannot estimate at all, remove the company.

Write your revenue source as either "Confirmed: [URL]" or "Estimated from: [signals used]"

---

## STEP 3: FULL QUALIFICATION CHECKLIST

Before including any company, verify all of these:

- Revenue confirmed or estimated Rs 50Cr to Rs 150Cr with source
- NOT raised Series B or beyond (search "[Company Name] funding history")
- NOT filed DRHP (search "[Company Name] DRHP IPO")
- Does NOT appear as a headline in Inc42 more than 5 times in last 12 months
  (search "site:inc42.com [Company Name]" and count results)
- Founder name found
- Founder LinkedIn URL found (search "[Company Name] founder LinkedIn India")
- A specific Akro service clearly fits their current situation
- Company NOT in a Bain, McKinsey, or major PE firm portfolio announcement

If even one box fails, remove the company.

---

## STEP 4: FOUNDER ACCESSIBILITY SCORE

For each founder, assess how reachable they are:

Active (score 3): Posts on LinkedIn at least twice a month, has under 5000 connections,
replies to comments, shares personal opinions
Occasional (score 2): Has a LinkedIn profile with some activity in last 6 months
Minimal (score 1): LinkedIn exists but barely active or very large following (hard to reach)
Not found (score 0): Remove the company

Prioritise Active and Occasional founders. They are 3x more likely to reply to a cold email.

---

## STEP 5: AKRO FIT ASSESSMENT

For each company, identify the specific Akro service they need right now:

Startup Fundraising: if they are at seed or Series A and likely raising in next 12 months
Startup Consultation: if they are pre-revenue or early stage and need strategy clarity
Unsecured Loans: if they are a profitable SME needing working capital without pledging assets
Secured Loans: if they have property, shares, or machinery that could be leveraged
Project Funding: if they are a real estate, infrastructure, or large capex business
FDI / ECB Advisory: if they are export-oriented or seeking foreign capital
Export Invoice Factoring: if they export and wait 30-120 days for overseas buyers to pay

Capital Need Signal: Search "[Company Name] hiring CFO" or "[Company Name] expanding 2024"
or "[Company Name] new office 2024". Any of these signals they are scaling and need advisory.

---

## OUTPUT PART 1: Research Table

| Field | Detail |
|---|---|
| Company Name | |
| Sector | |
| HQ City | |
| Revenue (Rs Cr) | Confirmed or Estimated |
| Revenue Source | Confirmed: URL or Estimated from: [signals] |
| Funding History | Stage and amount, seed or angel or Series A only |
| Founded Year | |
| Employee Count | Approximate from LinkedIn |
| Why Under the Radar | One specific sentence, not generic |
| Capital Need Signal | Job post, expansion news, or "none found" |
| Founder Name | |
| Founder LinkedIn | Direct URL |
| Founder Accessibility | Active / Occasional / Minimal |
| Estimated Email | firstname at domain |
| Website | |
| Akro Fit | Hot / Warm / Cold |
| Specific Akro Service | Which one and why now in one sentence |
| Inc42 Result Count | Number of Inc42 articles found for this company |
| Source URL | At least one link |

---

## OUTPUT PART 2: CSV

After the table, output a CSV block with exactly these headers:

startup_name,founder_name,founder_email,source,industry,stage,website_url,notes

Rules:
- source = LinkedIn for all
- stage = pre-seed / seed / series-a / series-b / growth
- notes = one sentence, specific reason Akro fits right now, no commas (use semicolons instead)
- Only include companies where Akro Fit is Hot or Warm

Wrap in a code block labelled csv.

---

## OUTPUT PART 3: Origination Note

4 sentences:
- Which companies from today's list are the strongest and why
- Which sector is showing the most opportunity this week
- One macro reason these companies may need advisory soon
- Suggested outreach angle for this specific batch

---

## PASTE STAGE 1 LIST BELOW THIS LINE

[Paste the table from Stage 1 here before running this prompt]
