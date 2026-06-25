"use client";

import { useState } from "react";
import { CheckCircle, Loader2, Send, ArrowLeft } from "lucide-react";

interface Props {
  token: string;
  dealId: string;
  startupName: string;
  founderName: string;
  founderEmail: string;
  draftEmail: string;
}

export default function EditEmailClient({
  token,
  startupName,
  founderName,
  founderEmail,
  draftEmail,
}: Props) {
  const [body, setBody] = useState(draftEmail);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const firstName = founderName.split(" ")[0];

  async function handleSend() {
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/send-edited", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, emailBody: body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-10 max-w-md text-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Email Sent</h1>
          <p className="text-sm text-slate-500">
            Your edited email was sent to <strong>{founderName}</strong> at{" "}
            <strong>{startupName}</strong>.
          </p>
          <a
            href="/dashboard"
            className="inline-block mt-6 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View Pipeline →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <a href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </a>
          <h1 className="text-2xl font-semibold text-slate-900">Edit Email Draft</h1>
          <p className="mt-1 text-sm text-slate-500">
            Editing email to <strong className="text-slate-700">{founderName}</strong> ·{" "}
            <span className="text-slate-400">{founderEmail}</span>
          </p>
        </div>

        {/* Email compose card */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">

          {/* Email header bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3">
            <div className="text-xs text-slate-500 space-y-1">
              <div><span className="font-medium text-slate-700 w-10 inline-block">To:</span> {founderName} &lt;{founderEmail}&gt;</div>
              <div><span className="font-medium text-slate-700 w-10 inline-block">Re:</span> Akro Ventures - {startupName}</div>
              <div><span className="font-medium text-slate-700 w-10 inline-block">From:</span> Rohit &amp; Akshita · info@akroventures.com</div>
            </div>
          </div>

          {/* Textarea */}
          <div className="p-5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Email Body</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full text-sm text-slate-800 leading-relaxed font-mono bg-transparent border border-slate-200 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              placeholder="Write your email here..."
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">{wordCount} words</p>
              <p className="text-xs text-slate-400">
                The Calendly booking button and signature are added automatically.
              </p>
            </div>
          </div>

          {/* Tip */}
          <div className="mx-5 mb-5 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-700 leading-relaxed">
              <strong>Tip:</strong> Keep it to 2 short paragraphs. Start with{" "}
              <code className="bg-amber-100 px-1 rounded">Hi {firstName},</code> - the Calendly
              button and your signature are appended automatically below.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-between bg-slate-50">
            <a href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
              Cancel
            </a>
            <button
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="btn-primary min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send to {firstName}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
