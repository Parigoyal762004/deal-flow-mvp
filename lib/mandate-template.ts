// ── Types ──────────────────────────────────────────────────────────────────

export type MandateType = "equity_debt" | "equity" | "debt";

export interface MandateParams {
  // Client info
  companyName: string;
  incorporationType: string;
  cin: string;
  dateOfIncorp: string;   // human-readable e.g. "February 5, 2024"
  pan: string;
  tan: string;
  registeredAddress: string;

  // Mandate terms
  effectiveDate: string;  // ISO "YYYY-MM-DD"
  mandateType: MandateType;
  targetRaiseAmount: number; // rupees (integer)
  equityInstruments: string;
  debtInstruments: string;
  targetInvestors: string;
  tenureMonths: number;

  // Fees
  retainerAmount: number;
  successFeeEquityPct: number;
  successFeeDebtPct: number;

  // Performance
  minIntroductions: number;
  minMeetings: number;

  // Tail
  tailPeriodMonths: number;
}

// ── Number helpers ──────────────────────────────────────────────────────────

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS_W = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n];
  return TENS_W[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function threeDigitWords(n: number): string {
  if (n === 0) return "";
  if (n < 100) return twoDigitWords(n);
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigitWords(n % 100) : "");
}

export function numToWords(n: number): string {
  if (n === 0) return "Zero";
  const crore    = Math.floor(n / 10_000_000);
  const lakh     = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rem      = n % 1_000;
  let r = "";
  if (crore)    r += threeDigitWords(crore)    + " Crore ";
  if (lakh)     r += threeDigitWords(lakh)     + " Lakh ";
  if (thousand) r += threeDigitWords(thousand) + " Thousand ";
  if (rem)      r += threeDigitWords(rem);
  return r.trim();
}

/** ₹20,00,00,000 */
export function formatINR(n: number): string {
  const s = String(n);
  if (s.length <= 3) return "₹" + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/(\d)(?=(\d{2})+$)/g, "$1,");
  return "₹" + rest + "," + last3;
}

/** "Indian Rupees Twenty Crore Only" */
export function inWords(n: number): string {
  return "Indian Rupees " + numToWords(n) + " Only";
}

// ── Date helpers ────────────────────────────────────────────────────────────

export function formatDateLong(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("/");
}

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export function addMonthsISO(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

// ── Mandate type label ──────────────────────────────────────────────────────

export function mandateTypeLabel(t: MandateType): string {
  if (t === "equity_debt") return "Equity & Debt Fundraising - Exclusive";
  if (t === "equity")      return "Equity Fundraising - Exclusive";
  return                          "Debt Fundraising - Exclusive";
}

// ── Default params factory ──────────────────────────────────────────────────

export function defaultMandateParams(deal: {
  startup_name: string;
  industry?: string | null;
  stage?: string | null;
}): MandateParams {
  const today = new Date().toISOString().split("T")[0];
  return {
    companyName:       deal.startup_name,
    incorporationType: "Company limited by shares under the Companies Act, 2013",
    cin:               "",
    dateOfIncorp:      "",
    pan:               "",
    tan:               "",
    registeredAddress: "",
    effectiveDate:     today,
    mandateType:       "equity_debt",
    targetRaiseAmount: 20_000_000,
    equityInstruments: "Equity Shares / CCPS / SAFE / Convertible Notes (as negotiated)",
    debtInstruments:   "Term Loans / Structured Debt / NBFC Lending / Working Capital Facilities / ECB",
    targetInvestors:   "Angel Investors, HNIs, Family Offices, Seed/Pre-Series A Funds, NBFCs, Banks, AIF Debt Funds",
    tenureMonths:      4,
    retainerAmount:    50_000,
    successFeeEquityPct: 3,
    successFeeDebtPct:   3,
    minIntroductions:  30,
    minMeetings:       15,
    tailPeriodMonths:  12,
  };
}
