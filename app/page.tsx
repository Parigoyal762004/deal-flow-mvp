import { DealForm } from "@/components/DealForm";
import CSVUpload from "@/components/CSVUpload";

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 bg-brand-50 border border-brand-100 rounded-full px-3 py-1 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
          Deal Intake
        </span>
        <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
          Submit a New Deal
        </h1>
        <p className="mt-2 text-slate-500 text-sm max-w-lg">
          Fill in the startup details below. The pitch deck will be analyzed by AI and a
          draft response will be sent to your team for approval before reaching the founder.
        </p>
      </div>

      <DealForm />
      <CSVUpload />
    </div>
  );
}
