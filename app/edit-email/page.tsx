import { createServerClient } from "@/lib/supabase-server";
import EditEmailClient from "./EditEmailClient";

interface Props {
  searchParams: { token?: string };
}

export default async function EditEmailPage({ searchParams }: Props) {
  const token = searchParams.token ?? "";

  if (!token) {
    return <ErrorPage message="Missing approval token." />;
  }

  const supabase = createServerClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("id, startup_name, founder_name, founder_email, draft_email, approval_status, stage, industry")
    .eq("approval_token", token)
    .single();

  if (!deal) {
    return <ErrorPage message="This link is invalid or has expired." />;
  }

  if (deal.approval_status !== "pending") {
    const label = deal.approval_status === "approved" ? "approved" : "rejected";
    return <ErrorPage message={`This deal was already ${label}. No further action needed.`} />;
  }

  return (
    <EditEmailClient
      token={token}
      dealId={deal.id}
      startupName={deal.startup_name}
      founderName={deal.founder_name}
      founderEmail={deal.founder_email}
      draftEmail={deal.draft_email ?? ""}
    />
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-xl p-10 max-w-md text-center shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-100 flex items-center justify-center mx-auto mb-5 text-red-500 text-xl font-bold">✕</div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">Cannot Edit</h1>
        <p className="text-sm text-slate-500">{message}</p>
        <a href="/dashboard" className="inline-block mt-6 text-sm text-brand-600 font-medium hover:text-brand-700">
          View Dashboard →
        </a>
      </div>
    </div>
  );
}
