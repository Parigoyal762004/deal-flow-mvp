// Akro's full service list for startup/founder emails (7 services).
// campaign-email.ts lists the same 5 lending services for established-business outreach.
// Adding a service here automatically includes it in every founder email.

export interface AkroService {
  name: string;
  line: string; // one plain sentence, no em dashes
}

export const STARTUP_SERVICES: AkroService[] = [
  {
    name: "Startup Fundraising",
    line: "Pre-seed to growth stage, end to end. We guide startups through every stage of the raise, from sharpening the pitch and building investor-ready models to warm introductions to the right angels, family offices, and institutional VCs across India and Southeast Asia.",
  },
  {
    name: "Startup Consultation",
    line: "Strategic clarity beyond just capital. We go deep on the fundamentals investors and lenders scrutinise, the ones that often decide whether a business can raise at all, and help you avoid the traps we have seen across dozens of raises.",
  },
  {
    name: "Unsecured Business Loans",
    line: "Working capital without pledging assets, underwritten on your cashflow (GST returns, bank statements, revenue) rather than just a credit score.",
  },
  {
    name: "Secured Loans",
    line: "Larger financing at better rates, against property, listed shares, fixed deposits, or machinery.",
  },
  {
    name: "Project Funding",
    line: "Dedicated capital for large projects, with milestone-based drawdowns and hybrid debt-equity structures.",
  },
  {
    name: "FDI & ECB Advisory",
    line: "Lower-cost cross-border capital, with the RBI and FEMA structuring, filings, and compliance handled for you.",
  },
  {
    name: "Export Invoice Factoring",
    line: "Up to 90% of your export invoice value on Day 0, collateral-free, while your buyer pays later.",
  },
];
