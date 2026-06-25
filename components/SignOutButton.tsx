"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  function signOut() {
    start(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <button
      onClick={signOut}
      disabled={pending}
      className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
