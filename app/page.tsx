import { cookies } from "next/headers";
import { DealForm } from "@/components/DealForm";
import CSVUpload from "@/components/CSVUpload";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

export default async function HomePage() {
  // The single-deal form is public (founders use it). The CSV bulk tool calls
  // the paid, auth-gated find-email endpoint, so only show it to the team.
  const loggedIn = (await getSessionUser(cookies().get(SESSION_COOKIE)?.value)) !== null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 border border-brand-100 rounded-full px-3 py-1 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
          Deal Intake
        </span>
        <h1 className="font-display text-3xl font-semibold text-ink tracking-tight">
          Submit a New Deal
        </h1>
        <p className="mt-2 text-plum text-sm max-w-lg">
          Fill in the startup details below. The pitch deck will be analyzed by AI and a
          draft response will be sent to your team for approval before reaching the founder.
        </p>
      </div>

      <DealForm />
      {loggedIn && <CSVUpload />}
    </div>
  );
}
