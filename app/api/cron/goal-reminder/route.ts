import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { transportFor, resolveSender } from "@/lib/mailer";
import { USERS } from "@/lib/users";

export const dynamic = "force-dynamic";

// Vercel invokes this at the schedule in vercel.json. The CRON_SECRET header
// ensures no external caller can trigger it.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supa = createServerClient();
  const now = new Date();

  // Week window: Monday 00:00 UTC → now
  const dow      = now.getUTCDay();
  const daysBack = dow === 0 ? 6 : dow - 1;
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(todayUTC.getTime() - daysBack * 86400000);
  const daysIntoWeek = daysBack + 1;

  const { data: goals } = await supa
    .from("user_goals")
    .select("username, weekly_email_goal")
    .gt("weekly_email_goal", 0);

  if (!goals?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const results: string[] = [];

  for (const { username, weekly_email_goal } of goals) {
    const { count } = await supa
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("sent_by", username)
      .not("sent_at", "is", null)
      .gte("sent_at", weekStart.toISOString());

    const sent = count ?? 0;
    const expectedByNow = Math.round((weekly_email_goal / 7) * daysIntoWeek);
    if (sent >= expectedByNow) continue; // on track — no email

    const user = USERS.find(u => u.username === username);
    if (!user) continue;

    const toGo = weekly_email_goal - sent;
    const sender = resolveSender(username);

    try {
      await transportFor(sender).sendMail({
        from: `"Akro CRM" <${sender.smtpUser}>`,
        to: user.email,
        subject: `Behind on your weekly goal — ${toGo} emails to go`,
        text: [
          `Hi ${user.displayName},`,
          `Quick nudge from the CRM: you've sent ${sent} emails so far this week, and your goal is ${weekly_email_goal}.`,
          `You're behind pace — ideally you'd have ${expectedByNow} by now. ${toGo} more to go by Sunday.`,
          `Log in and fire off some outreach: https://crm.akroventures.com/dashboard`,
          `— Akro CRM`,
        ].join("\n\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;color:#28112b">
            <p>Hi ${user.displayName},</p>
            <p>Quick nudge: you've sent <strong>${sent}</strong> emails this week. Your goal is <strong>${weekly_email_goal}</strong>.</p>
            <p>You're behind pace — you should be at <strong>${expectedByNow}</strong> by now. That's <strong>${toGo} more to go</strong> by Sunday.</p>
            <p style="margin:24px 0">
              <a href="https://crm.akroventures.com/dashboard"
                 style="background:#1A4A44;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
                Go to Dashboard →
              </a>
            </p>
            <p style="color:#9ca3af;font-size:12px">To change your goal visit <a href="https://crm.akroventures.com/my-stats">My Stats</a>.</p>
          </div>
        `,
      });
      results.push(`${username}: reminder sent (${sent}/${weekly_email_goal})`);
    } catch (e: unknown) {
      results.push(`${username}: email failed — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return NextResponse.json({ sent: results.length, results });
}
