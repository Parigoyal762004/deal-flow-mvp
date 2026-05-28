import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const maxDuration = 20;

export async function GET() {
  const user = process.env.SMTP_USER ?? "info@akroventures.com";
  const pass = process.env.SMTP_PASS ?? "(not set)";

  const results: Record<string, string> = {
    smtp_user: user,
    smtp_pass_length: `${pass.length} chars`,
    smtp_pass_set: pass !== "(not set)" ? "yes" : "NO - env var missing",
  };

  // Test smtpout.secureserver.net:465 (GoDaddy legacy — confirmed working)
  try {
    const t465 = nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await t465.verify();
    results.smtpout_465 = "SUCCESS";
  } catch (e: unknown) {
    results.smtpout_465 = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  // Test smtpout.secureserver.net:587 STARTTLS
  try {
    const t587 = nodemailer.createTransport({
      host: "smtpout.secureserver.net",
      port: 587,
      secure: false,
      auth: { user, pass },
    });
    await t587.verify();
    results.smtpout_587 = "SUCCESS";
  } catch (e: unknown) {
    results.smtpout_587 = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}
