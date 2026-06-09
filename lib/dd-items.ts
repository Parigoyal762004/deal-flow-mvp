export type DDApplicableTo = "both" | "debt" | "equity";

export interface DDItem {
  key: string;
  label: string;
  applicableTo: DDApplicableTo;
}

export const DD_ITEMS: DDItem[] = [
  // ── Common (both debt & equity) ───────────────────────────────────────
  { key: "coi",              label: "Incorporation Certificate (COI)",                                                          applicableTo: "both"   },
  { key: "moa",              label: "MOA (Memorandum of Association)",                                                          applicableTo: "both"   },
  { key: "aoa",              label: "AOA (Articles of Association)",                                                            applicableTo: "both"   },
  { key: "bcc",              label: "Business Commencement Certificate",                                                        applicableTo: "both"   },
  { key: "company_type",     label: "Company Type (Pvt Ltd / Partnership / Proprietorship)",                                    applicableTo: "both"   },
  { key: "gst_cert",         label: "GST Certificate",                                                                         applicableTo: "both"   },
  { key: "gst_returns",      label: "GST Returns — all states, 2 years",                                                       applicableTo: "both"   },
  { key: "balance_sheet",    label: "Audited / Provisional Balance Sheet — 2 to 3 years",                                      applicableTo: "both"   },
  { key: "bank_stmt_all",    label: "Bank Statements — all banks + personal statements of directors/partners, 2 years",        applicableTo: "both"   },
  { key: "kyc_aadhaar_pan",  label: "KYC — Aadhaar + PAN of all Promoters/Partners/Directors",                                 applicableTo: "both"   },
  { key: "kyc_passport",     label: "KYC — Passport of all Promoters/Partners/Directors",                                      applicableTo: "both"   },

  // ── Debt-specific ─────────────────────────────────────────────────────
  { key: "trade_license",    label: "Trade License + Electricity Bill (last 3 months)",                                        applicableTo: "debt"   },
  { key: "property_docs",    label: "Property Ownership Documents (company or individual name)",                                applicableTo: "debt"   },
  { key: "valuation_report", label: "Valuation Report (Government or Bank approved valuer)",                                   applicableTo: "debt"   },
  { key: "cibil",            label: "CIBIL of all Promoters/Partners/Directors",                                               applicableTo: "debt"   },
  { key: "cmr",              label: "CMR of the Company",                                                                      applicableTo: "debt"   },
  { key: "debt_agreements",  label: "Any existing Debt / Loan Agreements",                                                     applicableTo: "debt"   },

  // ── Equity-specific ───────────────────────────────────────────────────
  { key: "pitch_deck_dd",        label: "Pitch Deck",                                                                          applicableTo: "equity" },
  { key: "fin_model",            label: "Financial Model / Projections (3–5 years)",                                           applicableTo: "equity" },
  { key: "cap_table",            label: "Cap Table (current shareholding structure)",                                          applicableTo: "equity" },
  { key: "mis_report",           label: "MIS Report / Monthly Revenue Data (last 12 months)",                                  applicableTo: "equity" },
  { key: "use_of_funds",         label: "Use of Funds Breakdown",                                                              applicableTo: "equity" },
  { key: "team_overview",        label: "Team Overview / Org Chart",                                                           applicableTo: "equity" },
  { key: "investor_agreements",  label: "Existing Investor Agreements / Term Sheets / SAFEs",                                  applicableTo: "equity" },
  { key: "pnl",                  label: "P&L Statement — last 2 to 3 years",                                                   applicableTo: "equity" },
  { key: "bank_stmt_12",         label: "Last 12 months Bank Statements",                                                      applicableTo: "equity" },
];
