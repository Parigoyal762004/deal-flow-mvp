"use server";
import { cookies } from "next/headers";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase-server";

export async function saveGoalAction(weeklyGoal: number) {
  const username = await getSessionUser(cookies().get(SESSION_COOKIE)?.value);
  if (!username) return { ok: false as const, error: "Unauthorized." };
  if (!Number.isInteger(weeklyGoal) || weeklyGoal < 0 || weeklyGoal > 10000)
    return { ok: false as const, error: "Invalid goal." };

  const supa = createServerClient();
  const { error } = await supa
    .from("user_goals")
    .upsert({ username, weekly_email_goal: weeklyGoal, updated_at: new Date().toISOString() }, { onConflict: "username" });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
