import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Flow | Akro Ventures",
  description: "Investor deal flow management system",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-slate-200 h-14 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-brand-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-semibold text-slate-900 text-sm tracking-tight">
              Akro Ventures <span className="text-slate-400 font-normal">/ Deal Flow</span>
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <a href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
              Submit Deal
            </a>
            <a
              href="/dashboard"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Dashboard
            </a>
          </div>
        </nav>
        <main className="pt-14 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
