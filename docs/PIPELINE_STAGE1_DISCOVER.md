# Akro Ventures — Pipeline Stage 1: Company Discovery
# Run this first. Get the name list. Then run Stage 2 separately.
# Use in Claude.ai with web search ON

---

## YOUR ONLY JOB IN THIS PROMPT

Find 30 to 40 Indian company names that MIGHT be good leads for Akro Ventures.
Do not research them deeply. Do not verify revenue. Do not find founder emails.
Just names, sector, rough size signal, and one sentence on why they might fit.

Speed matters here. Cast wide. Filter in Stage 2.

---

## WHAT AKRO VENTURES DOES

Capital advisory firm. We help Indian founders raise debt and equity.
Services: unsecured loans (Rs 10L-5Cr), secured loans (Rs 25L-50Cr+), project funding
(Rs 1Cr-100Cr+), startup fundraising (pre-seed to Series A), startup consultation,
FDI/ECB advisory, export invoice factoring. Success fee only, nothing upfront.

THE PROFILE WE WANT:
- Revenue Rs 50Cr to Rs 150Cr
- Founder-led, still running the business
- Seed or Series A at most, no Series B+
- No DRHP filed, no IPO announced
- Not a household name
- Founder is findable on LinkedIn

WHAT WE DO NOT WANT:
- Revenue above Rs 150Cr
- Series B or beyond
- DRHP filed or IPO announced
- Companies that appear in Inc42 or YourStory frequently
- Publicly quoted valuations

---

## TODAY'S DATE: {INSERT TODAY'S DATE}

---

## WHERE TO SEARCH — IN THIS ORDER

### 1. MSME and SME award lists (best source — these are exactly the profile we want)
- "MSME award winner India 2024 site:pib.gov.in"
- "CII SME award 2024 India winner list"
- "DPIIT startup award 2024 winner India"
- "Economic Times emerging companies award 2024"
- "Dun Bradstreet India top SME 2024"
- "NASSCOM emerge50 2024 companies"
- "Inc42 30 under 30 founders 2024"
- "YourStory Tech30 2024 list"
- "TiE50 award 2024 India winners"
- "Startup India showcase 2024 selected companies"

### 2. State-level startup and business coverage (national media misses these)
- "Maharashtra startup seed funded 2024 crore"
- "Pune company raised 2024 growth"
- "Gujarat startup revenue crore 2024"
- "Hyderabad B2B startup seed 2024"
- "Bengaluru SaaS startup small Series A 2024"
- "Chennai manufacturing startup 2024 funded"
- "Jaipur startup raised 2024"
- "Ahmedabad company revenue growth 2024"
- "Noida startup angel 2024"
- "Coimbatore manufacturing company growth 2024"
- "Surat export company 2024 revenue"

### 3. Export sector (almost invisible in startup media, perfect for Akro)
These companies need export invoice factoring and FDI/ECB advisory. They never appear in
startup press because they are not venture-backed. But they have real revenue.
- "India SME exporter revenue 50 crore 2024"
- "India textile exporter startup 2024 growth"
- "India pharma API exporter small company 2024"
- "India engineering goods exporter 2024 revenue crore"
- "India software services exporter small 2024"
- "ECGC India exporter award 2024 winner"
- "FIEO award India exporter 2024"
- "India agri commodity exporter 2024 revenue"
- "Tirupur garment exporter company 2024"
- "Ludhiana manufacturer exporter 2024"

### 4. Small funding rounds only
- "site:tracxn.com India seed 2022 2023 2024"
- "Crunchbase India seed $500K $1M $2M 2022 2023"
- "India angel round 2023 undisclosed startup"
- "India bootstrapped profitable company 50 crore 2024"

### 5. Sector-specific (pick 3 sectors this run, rotate next run)
Choose 3 from:
- D2C food and beverage: "India D2C food brand revenue 50 crore 2024"
- Last-mile logistics: "India logistics startup Series A 2023 small"
- Healthcare clinics: "India healthtech seed 2024 clinic diagnostic chain"
- B2B SaaS mid-market: "India B2B SaaS Series A 2022 2023 profitable ARR"
- Niche manufacturing: "India manufacturing startup raised 2024 crore"
- Niche edtech: "India edtech Series A 2023 small NOT Byju NOT Unacademy"
- Small fintech: "India fintech seed 2024 small NBFC lending"
- AgriTech: "India agritech seed 2023 2024 crore farmer"
- HR tech: "India HR SaaS startup Series A 2023"
- Construction tech: "India proptech startup Series A 2023 small"

---

## QUICK DISQUALIFY IN STAGE 1

As you collect names, immediately drop any company that:
- Has a publicly quoted valuation
- Has raised Series B or beyond
- Has filed DRHP
- Is a well-known consumer brand
- Appears regularly in Inc42 headlines

---

## OUTPUT FORMAT

Return a simple table with these columns only:

| Company Name | Sector | HQ City | Size Signal | Why They Might Fit |
|---|---|---|---|---|

Size signal = anything you found: employee count, funding amount, revenue mention, years operating.
Why they might fit = one sentence maximum.

Target 30 to 40 rows. If you find fewer good ones, stop at 25. Do not pad with bad leads.

At the bottom, note which 3 sectors you searched today so Stage 2 knows which ones to skip for rotation.
