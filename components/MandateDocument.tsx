/**
 * MandateDocument
 * Renders the full mandate agreement as HTML with inline styles.
 * Inline styles are required so that the document can be injected into a
 * print popup window (no Tailwind / CSS bundle available there).
 */

import type { MandateParams } from "@/lib/mandate-template";
import {
  formatINR, inWords, formatDateLong, formatDateShort,
  addMonths, mandateTypeLabel, numToWords,
} from "@/lib/mandate-template";

// ── Style tokens ──────────────────────────────────────────────────────────────
const FONT   = "'Times New Roman', Times, serif";
const BODY   = { fontFamily: FONT, fontSize: "10.5pt", color: "#111", lineHeight: "1.65" } as React.CSSProperties;
const H1     = { ...BODY, fontSize: "13pt", fontWeight: "bold", textAlign: "center" as const, marginBottom: 4, letterSpacing: "0.03em" };
const H2     = { ...BODY, fontSize: "10.5pt", fontWeight: "bold", marginTop: 20, marginBottom: 4 };
const LABEL  = { ...BODY, fontSize: "9.5pt", color: "#555", paddingRight: 8, verticalAlign: "top" as const, whiteSpace: "nowrap" as const, width: "38%" };
const VALUE  = { ...BODY, fontSize: "10pt", verticalAlign: "top" as const };
const TH     = { ...BODY, fontWeight: "bold", border: "1px solid #555", padding: "5px 8px", backgroundColor: "#2C7873", color: "#fff", fontSize: "9.5pt" };
const TD     = { ...BODY, border: "1px solid #bbb", padding: "5px 8px", fontSize: "9.5pt", verticalAlign: "top" as const };
const TD_L   = { ...TD, fontWeight: "bold", width: "36%", backgroundColor: "#f7f7f7" };

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHead({ n, title }: { n: string | number; title: string }) {
  return (
    <p style={{ ...H2, marginTop: 18 }}>
      {n}. {title.toUpperCase()}
    </p>
  );
}

// ── Key-value table row ────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={TD_L}>{label}</td>
      <td style={TD}>{value}</td>
    </tr>
  );
}

// ── Full mandate component ─────────────────────────────────────────────────────
export function MandateDocument({ params }: { params: MandateParams }) {
  const {
    companyName, incorporationType, cin, dateOfIncorp, pan, tan, registeredAddress,
    effectiveDate, mandateType, targetRaiseAmount, equityInstruments, debtInstruments,
    targetInvestors, tenureMonths, retainerAmount, successFeeEquityPct, successFeeDebtPct,
    minIntroductions, minMeetings, tailPeriodMonths,
  } = params;

  const isEquity      = mandateType === "equity_debt" || mandateType === "equity";
  const isDebt        = mandateType === "equity_debt" || mandateType === "debt";
  const typeLabel     = mandateTypeLabel(mandateType);
  const expiry        = addMonths(effectiveDate, tenureMonths);
  const expiryISO     = (() => { const d = new Date(effectiveDate); d.setMonth(d.getMonth() + tenureMonths); return d.toISOString().split("T")[0]; })();
  const effectiveLong = formatDateLong(effectiveDate);
  const effectiveShort= formatDateShort(effectiveDate);

  // Example success fee calc (for 10Cr)
  const exampleBase   = 100_000_000;
  const exFeeEquity   = exampleBase * successFeeEquityPct / 100;
  const exFeeDebt     = exampleBase * successFeeDebtPct   / 100;

  const wrap: React.CSSProperties = { ...BODY, padding: "48mm 20mm 44mm 20mm" };
  const tableF: React.CSSProperties = { width: "100%", borderCollapse: "collapse", marginTop: 6, marginBottom: 8 };
  const bullet: React.CSSProperties = { ...BODY, marginLeft: 24, marginBottom: 3 };

  return (
    <div style={wrap} id="mandate-doc-inner">

      {/* Title */}
      <p style={{ ...H1, fontSize: "14pt", marginBottom: 2 }}>
        FUNDRAISING MANDATE AGREEMENT
      </p>
      <p style={{ ...BODY, textAlign: "center", fontSize: "10.5pt", marginBottom: 2 }}>
        {typeLabel.replace(" - Exclusive", "")}
      </p>
      <p style={{ ...BODY, textAlign: "center", marginBottom: 16 }}>
        For <strong>{companyName}</strong>
      </p>
      <p style={{ ...BODY, textAlign: "center", marginBottom: 24 }}>
        Effective Date: {effectiveLong}
      </p>

      <hr style={{ border: "none", borderTop: "1.5px solid #2C7873", marginBottom: 20 }} />

      {/* 1. PARTIES */}
      <SectionHead n={1} title="Parties" />
      <p style={{ ...BODY, marginBottom: 6 }}>
        This Fundraising Mandate Agreement (<strong>"Agreement"</strong>) is entered into as of{" "}
        <strong>{effectiveLong}</strong> (<strong>"Effective Date"</strong>) by and between:
      </p>

      {/* Advisor block */}
      <p style={{ ...BODY, fontWeight: "bold", marginTop: 10, marginBottom: 4 }}>A. ADVISOR</p>
      <table style={tableF}>
        <tbody>
          <Row label="Firm Name"       value="Akro Ventures Private Limited" />
          <Row label="Type"            value="Financial Capital Advisory & Startup Consultancy" />
          <Row label="Registered Office" value="Innov8, 2nd Floor, AH45, Krishna Reddy Industrial Area, Dooravani Nagar, Bangalore, Karnataka - 560016" />
          <Row label="Represented by"  value="Rohit Jain, Co-Founder" />
        </tbody>
      </table>

      {/* Client block */}
      <p style={{ ...BODY, fontWeight: "bold", marginTop: 10, marginBottom: 4 }}>B. CLIENT (Company)</p>
      <table style={tableF}>
        <tbody>
          <Row label="Company Name"      value={<strong>{companyName}</strong>} />
          <Row label="Incorporation"     value={incorporationType} />
          {cin       && <Row label="CIN"              value={cin} />}
          {dateOfIncorp && <Row label="Date of Incorp." value={dateOfIncorp} />}
          {pan       && <Row label="PAN"              value={pan} />}
          {tan       && <Row label="TAN"              value={tan} />}
          {registeredAddress && <Row label="Registered Address" value={registeredAddress} />}
        </tbody>
      </table>

      <p style={{ ...BODY, marginTop: 8 }}>
        Akro Ventures and <strong>{companyName}</strong> shall collectively be referred to as the <strong>"Parties"</strong> and individually as a <strong>"Party."</strong>
      </p>

      {/* 2. MANDATE SCOPE */}
      <SectionHead n={2} title="Mandate Scope & Objective" />
      <p style={{ ...BODY, marginBottom: 6 }}>
        The Client hereby appoints Akro Ventures Private Limited as its exclusive financial advisor to raise capital on the following terms:
      </p>
      <table style={tableF}>
        <tbody>
          <Row label="Mandate Type"         value={<strong>{typeLabel}</strong>} />
          <Row label="Target Raise Amount"  value={<><strong>{formatINR(targetRaiseAmount)}</strong> ({inWords(targetRaiseAmount)})</>} />
          {isEquity && <Row label="Equity Instruments" value={equityInstruments} />}
          {isDebt   && <Row label="Debt Instruments"   value={debtInstruments} />}
          <Row label="Target Investors / Lenders" value={targetInvestors} />
          <Row label="Mandate Tenure"       value={<>{tenureMonths} ({numToWords(tenureMonths)}) Calendar Months from Effective Date</>} />
          <Row label="Mandate Expiry"       value={expiry} />
        </tbody>
      </table>

      {/* 3. ADVISOR OBLIGATIONS */}
      <SectionHead n={3} title="Advisor Obligations" />
      <p style={{ ...BODY, marginBottom: 6 }}>During the Mandate Period, Akro Ventures shall:</p>
      {[
        `Prepare and review investor${isDebt ? "/lender" : ""}-ready materials including pitch deck, financial model, information memorandum, and company brief;`,
        `Identify, approach, and introduce suitable ${isEquity ? "equity investors" : ""}${isEquity && isDebt ? " and " : ""}${isDebt ? "debt lenders" : ""} from its proprietary network and external outreach;`,
        isEquity && isDebt ? "Structure and present both equity and debt proposals appropriately for each investor/lender category;" : null,
        `Coordinate due diligence requests, investor${isDebt ? "/lender" : ""} calls, site visits (if required), and Q&A management;`,
        `Assist in negotiation of term sheets${isDebt ? ", sanction letters," : ""} and key commercial terms in coordination with legal counsel;`,
        `Maintain an Investor${isDebt ? "/Lender" : ""} Introduction Tracker ("IIT") documenting all introductions made during and post-Mandate Period;`,
        "Provide bi-weekly status updates to the Client on the deal pipeline.",
        `Deliver a minimum of ${minIntroductions} (${numToWords(minIntroductions).toLowerCase()}) formal investor${isDebt ? "/lender" : ""} introductions and facilitate no fewer than ${minMeetings} (${numToWords(minMeetings).toLowerCase()}) investor${isDebt ? "/lender" : ""} meetings during the Mandate Period ("Performance Objectives").`,
      ].filter(Boolean).map((item, i) => (
        <p key={i} style={bullet}>• {item}</p>
      ))}

      {/* 4. CLIENT OBLIGATIONS */}
      <SectionHead n={4} title="Client Obligations" />
      <p style={{ ...BODY, marginBottom: 6 }}>The Client agrees to:</p>
      {[
        "Provide accurate, complete, and updated information, documentation, financials, and disclosures as reasonably requested by Akro Ventures;",
        `Maintain exclusivity with Akro Ventures during the Mandate Period - no parallel engagement of another advisor, placement agent, or broker for the same mandate;`,
        `Promptly review and respond to queries from investor${isDebt ? "s or lenders" : "s"} routed through Akro Ventures;`,
        "Pay the Retainer Fee and applicable Success Fees as stipulated in Section 5;",
        `Not directly negotiate or close transactions with any investor${isDebt ? " or lender" : ""} introduced by Akro Ventures in circumvention of this Agreement.`,
      ].map((item, i) => (
        <p key={i} style={bullet}>• {item}</p>
      ))}

      {/* 5. FEES */}
      <SectionHead n={5} title="Fees & Payment Terms" />

      {/* 5.1 Retainer */}
      <p style={{ ...H2, marginTop: 12 }}>5.1 Retainer Fee</p>
      <table style={tableF}>
        <tbody>
          <Row label="Retainer Amount"  value={<><strong>{formatINR(retainerAmount)}</strong> ({inWords(retainerAmount)})</>} />
          <Row label="Payment Terms"    value="100% upfront - payable on the same day as execution of this Agreement" />
          <Row label="Nature"           value="Conditionally refundable as per Refund Conditions; otherwise non-refundable" />
          <Row label="Purpose"          value="Covers advisory, research, outreach, documentation, and deal structuring services" />
        </tbody>
      </table>
      <p style={{ ...BODY, marginTop: 6, fontStyle: "italic" }}>
        Work commencement is strictly conditional upon receipt of the full Retainer Fee of {formatINR(retainerAmount)}. No investor{isDebt ? "/lender" : ""} introductions, pitch preparation, or outreach shall be initiated prior to payment confirmation.
      </p>

      {/* 5.2 Equity Success Fee */}
      {isEquity && (
        <>
          <p style={{ ...H2, marginTop: 14 }}>5.2 Success Fee - Equity Raise</p>
          <table style={tableF}>
            <tbody>
              <Row label="Success Fee Rate"   value={<><strong>{successFeeEquityPct}% ({numToWords(successFeeEquityPct)} Percent)</strong> of equity capital successfully raised</>} />
              <Row label="Trigger"            value="Due upon each tranche of equity funds received by the Client" />
              <Row label="Calculation Base"   value="Gross equity capital raised from investors introduced by Akro Ventures" />
              <Row label="Payment Timeline"   value="Payable within 7 (seven) business days of each closing tranche" />
            </tbody>
          </table>
          <p style={{ ...BODY, marginTop: 4, fontStyle: "italic" }}>
            Example: If ₹10 Crore equity is raised - Success Fee payable = {formatINR(exFeeEquity)} ({inWords(exFeeEquity)}).
          </p>
        </>
      )}

      {/* 5.3 Debt Success Fee */}
      {isDebt && (
        <>
          <p style={{ ...H2, marginTop: 14 }}>{isEquity ? "5.3" : "5.2"} Success Fee - Debt Raise</p>
          <table style={tableF}>
            <tbody>
              <Row label="Success Fee Rate"   value={<><strong>{successFeeDebtPct}% ({numToWords(successFeeDebtPct)} Percent)</strong> of debt / loan amount sanctioned and disbursed</>} />
              <Row label="Trigger"            value="Due upon sanction letter issuance or first disbursement, whichever is earlier" />
              <Row label="Calculation Base"   value="Gross loan / debt amount disbursed from lenders introduced by Akro Ventures" />
              <Row label="Payment Timeline"   value="Payable within 7 (seven) business days of first disbursement tranche" />
            </tbody>
          </table>
          <p style={{ ...BODY, marginTop: 4, fontStyle: "italic" }}>
            Example: If ₹10 Crore debt is raised - Success Fee payable = {formatINR(exFeeDebt)} ({inWords(exFeeDebt)}).
          </p>
        </>
      )}

      {isEquity && isDebt && (
        <p style={{ ...BODY, marginTop: 8 }}>
          <strong>Note:</strong> In case of a blended equity + debt raise, Success Fees shall be computed and invoiced separately for each instrument category.
        </p>
      )}

      <p style={{ ...BODY, marginTop: 8 }}>
        <strong>Late Payment Penalty:</strong> In the event the Success Fee is not paid within 7 (seven) business days of the trigger event, a late payment charge of ₹500 (Five Hundred Rupees) per ₹1,00,000 (One Lakh) of the outstanding Success Fee amount shall be levied for every week (or part thereof) of delay, until full payment is received.
      </p>

      {/* 5.4 Tail */}
      <p style={{ ...H2, marginTop: 14 }}>{isEquity && isDebt ? "5.4" : isEquity || isDebt ? "5.3" : "5.3"} Tail Period</p>
      <p style={{ ...BODY }}>
        In the event this Agreement expires or is terminated by the Client (other than for Akro Ventures' material breach), the Success Fee shall remain payable for any transaction closed within{" "}
        <strong>{tailPeriodMonths} ({numToWords(tailPeriodMonths)}) months</strong> of expiry or termination, in respect of any investor{isDebt ? " or lender" : ""} introduced and evidenced in the IIT during the Mandate Period.
      </p>

      {/* 6. EXCLUSIVITY */}
      <SectionHead n={6} title="Exclusivity & Anti-Circumvention" />
      <p style={{ ...BODY, marginBottom: 6 }}>
        <strong>6.1</strong> The Client grants Akro Ventures exclusive rights to raise {mandateType === "equity_debt" ? "both equity and debt capital" : mandateType === "equity" ? "equity capital" : "debt capital"} for the mandate described herein during the Mandate Period. The Client shall not engage, solicit, or enter into discussions with any other fundraising advisor, placement agent, or {isDebt ? "lending broker" : "broker"} for the same mandate during this period.
      </p>
      <p style={{ ...BODY, marginBottom: 6 }}>
        <strong>6.2</strong> The Client shall not approach, negotiate with, or close any transaction with any investor{isDebt ? " or lender" : ""} introduced by Akro Ventures - whether directly or indirectly - without the involvement of Akro Ventures and without payment of the applicable Success Fee.
      </p>
      <p style={{ ...BODY }}>
        <strong>6.3</strong> Breach of exclusivity or anti-circumvention obligations shall entitle Akro Ventures to Liquidated Damages equal to 5% (Five Percent) of the capital raised or ₹25,00,000 (Twenty-Five Lakhs), whichever is higher, without prejudice to any other remedies available at law or equity.
      </p>

      {/* 7. CONFIDENTIALITY */}
      <SectionHead n={7} title="Confidentiality" />
      <p style={{ ...BODY }}>
        Each Party agrees to keep strictly confidential all non-public information received from the other Party in connection with this Agreement (<strong>"Confidential Information"</strong>), including but not limited to investor{isDebt ? "/lender" : ""} identities, financial data, business strategies{isDebt ? ", loan structures" : ""}, and deal terms. This obligation shall survive termination of this Agreement for a period of 3 (three) years.
      </p>

      {/* 8. TERMINATION */}
      <SectionHead n={8} title="Termination" />
      <p style={{ ...BODY, marginBottom: 6 }}>
        <strong>8.1</strong> The Client may terminate this Agreement by providing 30 (thirty) days' written notice. The Retainer Fee shall not be refunded upon termination.
      </p>
      <p style={{ ...BODY, marginBottom: 6 }}>
        <strong>8.2</strong> Akro Ventures may terminate this Agreement with immediate effect if the Client fails to cooperate in good faith, provides materially inaccurate information, or breaches any provision of this Agreement.
      </p>
      <p style={{ ...BODY }}>
        <strong>8.3</strong> Termination shall not affect accrued rights, Tail Period obligations, or any amounts already due and payable.
      </p>

      {/* 9. REPRESENTATIONS */}
      <SectionHead n={9} title="Representations & Warranties" />
      <p style={{ ...BODY, marginBottom: 6 }}>
        Each Party represents that: (i) it has full legal authority to enter into this Agreement; (ii) this Agreement does not conflict with any other existing commitment; and (iii) all information provided to the other Party is accurate and complete to the best of its knowledge.
      </p>
      {cin && (
        <p style={{ ...BODY }}>
          The Client specifically represents that <strong>{companyName}</strong> is duly incorporated under the Companies Act, 2013 (CIN: {cin}), and that the person executing this Agreement has full authority to bind the Company.
        </p>
      )}

      {/* 10. GOVERNING LAW */}
      <SectionHead n={10} title="Governing Law & Dispute Resolution" />
      <p style={{ ...BODY, marginBottom: 6 }}>
        <strong>10.1</strong> This Agreement shall be governed by and construed in accordance with the laws of India.
      </p>
      <p style={{ ...BODY, marginBottom: 6 }}>
        <strong>10.2</strong> Any dispute arising out of or in connection with this Agreement shall first be attempted to be resolved through good-faith negotiations within 15 (fifteen) days. Failing resolution, disputes shall be referred to binding arbitration under the Arbitration and Conciliation Act, 1996 (as amended), with the seat of arbitration in Bengaluru, Karnataka, India.
      </p>
      <p style={{ ...BODY }}>
        <strong>10.3</strong> Notwithstanding the above, Akro Ventures reserves the right to seek urgent interim injunctive or equitable relief before a court of competent jurisdiction.
      </p>

      {/* 11. MISCELLANEOUS */}
      <SectionHead n={11} title="Miscellaneous" />
      {[
        ["Entire Agreement", "This Agreement constitutes the entire agreement between the Parties and supersedes all prior understandings, whether oral or written."],
        ["Amendments", "Any amendments must be in writing and signed by authorised representatives of both Parties."],
        ["Assignment", "Neither Party may assign this Agreement without prior written consent of the other."],
        ["Severability", "If any provision is found invalid or unenforceable, the remaining provisions continue in full force."],
        ["Notices", "All notices shall be sent to the registered addresses / official email IDs of the Parties as notified in writing."],
        ["Force Majeure", "Neither Party shall be liable for delays or failures caused by circumstances beyond its reasonable control."],
      ].map(([key, val]) => (
        <p key={key} style={{ ...BODY, marginBottom: 4 }}>
          <strong>{key}:</strong> {val}
        </p>
      ))}

      {/* SIGNATURE BLOCK */}
      <div style={{ marginTop: 28, borderTop: "1.5px solid #2C7873", paddingTop: 16 }}>
        <p style={{ ...H1, fontSize: "11pt", marginBottom: 16 }}>
          EXECUTION
        </p>
        <p style={{ ...BODY, marginBottom: 16 }}>
          IN WITNESS WHEREOF, the authorised representatives of the Parties have executed this Agreement as of the date first written above.
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr>
              <td style={{ width: "48%", verticalAlign: "top", paddingRight: 16 }}>
                <p style={{ ...BODY, fontWeight: "bold", marginBottom: 10 }}>FOR AKRO VENTURES PRIVATE LIMITED</p>
                <p style={{ ...BODY, marginBottom: 30 }}>Signature: _____________________________</p>
                <p style={{ ...BODY, marginBottom: 8 }}>Name: Rohit Jain</p>
                <p style={{ ...BODY, marginBottom: 8 }}>Title: Co-Founder</p>
                <p style={{ ...BODY, marginBottom: 8 }}>Date: {effectiveShort}</p>
                <p style={{ ...BODY }}>Place: Bengaluru, India</p>
              </td>
              <td style={{ width: "4%" }} />
              <td style={{ width: "48%", verticalAlign: "top" }}>
                <p style={{ ...BODY, fontWeight: "bold", marginBottom: 10 }}>FOR {companyName.toUpperCase()}</p>
                <p style={{ ...BODY, marginBottom: 30 }}>Signature: _____________________________</p>
                <p style={{ ...BODY, marginBottom: 8 }}>Name: _________________________________</p>
                <p style={{ ...BODY, marginBottom: 8 }}>Title: _________________________________</p>
                <p style={{ ...BODY, marginBottom: 8 }}>Date: _________________________________</p>
                <p style={{ ...BODY }}>Place: ________________________________</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* SCHEDULE A */}
      <div style={{ marginTop: 32, borderTop: "2px solid #2C7873", paddingTop: 16 }}>
        <p style={{ ...H1, fontSize: "11pt", marginBottom: 4 }}>SCHEDULE A</p>
        <p style={{ ...H1, fontSize: "10.5pt", marginBottom: 14 }}>INVESTOR / LENDER INTRODUCTION TRACKER (IIT)</p>
        <p style={{ ...BODY, marginBottom: 10 }}>
          This schedule forms an integral part of the Agreement. Akro Ventures shall maintain and update this tracker with all introductions made during the Mandate Period. Entries herein shall constitute conclusive evidence of introduction for Success Fee and Tail Period claims.
        </p>
        <table style={{ ...tableF, marginTop: 8 }}>
          <thead>
            <tr>
              {["S.No.", "Investor / Lender Name", "Type (Equity / Debt)", "Date of Intro.", "Contact Details", "Stage / Status"].map((h) => (
                <th key={h} style={TH}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <tr key={n}>
                {[n, "", "", "", "", ""].map((v, i) => (
                  <td key={i} style={{ ...TD, height: 22 }}>{v}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ ...BODY, marginTop: 8, fontStyle: "italic" }}>
          Updated bi-weekly and shared with the Client by Akro Ventures.
        </p>
      </div>

      {/* SCHEDULE B */}
      <div style={{ marginTop: 32, borderTop: "2px solid #2C7873", paddingTop: 16 }}>
        <p style={{ ...H1, fontSize: "11pt", marginBottom: 4 }}>SCHEDULE B</p>
        <p style={{ ...H1, fontSize: "10.5pt", marginBottom: 14 }}>MANDATE SUMMARY CARD</p>
        <table style={tableF}>
          <tbody>
            <Row label="Client"           value={<><strong>{companyName}</strong>{cin ? ` (CIN: ${cin})` : ""}</>} />
            <Row label="Mandate Type"     value={typeLabel} />
            <Row label="Target Raise"     value={`${formatINR(targetRaiseAmount)} (${numToWords(targetRaiseAmount)})`} />
            {isEquity && <Row label="Equity Instruments" value={equityInstruments} />}
            {isDebt   && <Row label="Debt Instruments"   value={debtInstruments} />}
            <Row label="Retainer Fee"     value={`${formatINR(retainerAmount)} (Upfront, Conditionally Refundable)`} />
            <Row label="Success Fee"      value={isEquity && isDebt ? `${successFeeEquityPct}% equity / ${successFeeDebtPct}% debt (computed separately)` : isEquity ? `${successFeeEquityPct}% of equity capital raised` : `${successFeeDebtPct}% of debt disbursed`} />
            <Row label="Mandate Tenure"   value={`${tenureMonths} Months`} />
            <Row label="Start Date"       value={effectiveLong} />
            <Row label="End Date"         value={expiry} />
            <Row label="Tail Period"      value={`${tailPeriodMonths} months post-expiry / termination`} />
            <Row label="Governing Law"    value="Laws of India | Arbitration Seat: Bengaluru" />
            <Row label="Advisor"          value="Akro Ventures Private Limited, Bengaluru" />
          </tbody>
        </table>
        <p style={{ ...BODY, textAlign: "center", marginTop: 20, fontStyle: "italic", color: "#555" }}>
          - End of Agreement -
        </p>
      </div>
    </div>
  );
}
