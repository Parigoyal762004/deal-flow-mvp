import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { ownerDisplayName } from "@/lib/users";
import SignOutButton from "@/components/SignOutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deal Flow | Akro Ventures",
  description: "Investor deal flow management system",
  icons: {
    icon: "/akro-icon.jpg",
    apple: "/akro-icon.jpg",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  const loggedIn = user !== null;

  return (
    <html lang="en">
      <body>
        <nav className="fixed top-0 inset-x-0 z-50 bg-white border-b border-brand-100 h-14 flex items-center px-4 sm:px-6">
          <a href={loggedIn ? "/dashboard" : "/login"} className="flex items-center gap-2 sm:gap-2.5 shrink-0 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/akro-logo.png" alt="Akro Ventures" className="h-5 sm:h-7 w-auto max-w-[112px] sm:max-w-none" />
            <span className="hidden xs:inline text-brand-200 font-normal text-sm">/</span>
            <span className="hidden xs:inline font-display font-semibold text-ink text-sm tracking-tight">Deal Flow</span>
          </a>
          <div className="ml-auto flex items-center gap-3 sm:gap-5">
            <a href="/submit" className="hidden sm:block text-sm text-plum-600 hover:text-ink transition-colors">
              Submit Deal
            </a>
            {loggedIn && (
              <>
                <a href="/dashboard" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  Dashboard
                </a>
                <a href="/campaign" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  Campaign
                </a>
                <a href="/my-stats" className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                  My Stats
                </a>
                <span className="hidden md:flex items-center gap-1.5 text-sm text-plum-500">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-semibold flex items-center justify-center">
                    {ownerDisplayName(user).charAt(0)}
                  </span>
                  {ownerDisplayName(user)}
                </span>
                <SignOutButton />
              </>
            )}
          </div>
        </nav>
        <main className="pt-14 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
