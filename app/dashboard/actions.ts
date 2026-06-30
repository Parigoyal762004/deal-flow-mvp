"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

async function requireAuth() {
  const user = await getSessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!user) return null;
  return user;
}

export async function deleteDealAction(id: string) {
  const user = await requireAuth();
  if (!user) return { ok: false as const, error: "Unauthorized." };
  if (!id) return { ok: false as const, error: "Missing deal ID." };

  const supa = createServerClient();
  const { error } = await supa.from("deals").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const };
}

export async function rejectDealAction(id: string) {
  const user = await requireAuth();
  if (!user) return { ok: false as const, error: "Unauthorized." };
  if (!id) return { ok: false as const, error: "Missing deal ID." };

  const supa = createServerClient();
  const { error } = await supa
    .from("deals")
    .update({ approval_status: "rejected" })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function markMeetingHeldAction(id: string) {
  const user = await requireAuth();
  if (!user) return { ok: false as const, error: "Unauthorized." };
  if (!id) return { ok: false as const, error: "Missing deal ID." };

  const supa = createServerClient();
  const { error } = await supa
    .from("deals")
    .update({ meeting_held: true })
    .eq("id", id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
