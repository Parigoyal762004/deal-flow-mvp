import { createServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Deal } from "@/lib/types";
import { MandateGenerator } from "@/components/MandateGenerator";

export const dynamic = "force-dynamic";

export default async function MandatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();
  const deal = data as Deal;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href={`/dashboard/${id}`}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {deal.startup_name}
      </Link>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
          Generate Mandate Agreement
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Fill in the parameters on the left — the document updates live. Click{" "}
          <strong>Download PDF</strong> to export with letterhead.
        </p>
      </div>

      <MandateGenerator deal={deal} />
    </div>
  );
}
