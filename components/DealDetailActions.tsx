"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDealAction, rejectDealAction, markMeetingHeldAction } from "@/app/dashboard/actions";

interface Props {
  dealId: string;
  meetingHeld: boolean;
  approvalStatus: string;
}

export default function DealDetailActions({ dealId, meetingHeld, approvalStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleMarkMeeting() {
    setError(null);
    startTransition(async () => {
      const res = await markMeetingHeldAction(dealId);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  async function handleReject() {
    if (!confirm("Mark this deal as rejected? This can be undone from Supabase if needed.")) return;
    setError(null);
    startTransition(async () => {
      const res = await rejectDealAction(dealId);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm("Permanently delete this deal? This CANNOT be undone.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDealAction(dealId);
      if (!res.ok) { setError(res.error); return; }
      router.push("/dashboard");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <span className="text-xs text-red-500 mr-2">{error}</span>
      )}

      {!meetingHeld && (
        <button
          onClick={handleMarkMeeting}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100 transition-colors disabled:opacity-50"
        >
          📅 Mark Meeting Held
        </button>
      )}

      {approvalStatus !== "rejected" && (
        <button
          onClick={handleReject}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition-colors disabled:opacity-50"
        >
          ✕ Reject Deal
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
      >
        🗑 Delete Deal
      </button>
    </div>
  );
}
