// Akro's services, as listed to STARTUPS in deal/founder emails.
//
// The bulk lending campaign (lib/campaign-email.ts) lists 5 services aimed at
// large/established businesses. For startups we list the full set. Two are
// confirmed below; the remaining ones are pending Akro's wording — add them here
// and every startup email picks them up automatically (no other code change).

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
  // TODO: add the remaining 5 startup services here once Akro confirms the copy.
];
