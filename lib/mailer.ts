import nodemailer from "nodemailer";
import { getUser } from "./users";

// ── Dynamic per-user SMTP ───────────────────────────────────────────────────
// Every outgoing email is sent AS a specific team member from their own mailbox
// and CC'd back to them. We use ONE relay (GoDaddy secureserver — the known
// working one; Titan's smtp does NOT authenticate) with per-mailbox credentials.
//
// A mailbox password lives in env var SMTP_<USERNAME>_PASS (e.g. SMTP_ROHIT_PASS),
// set directly in Vercel so symbols/quotes are never mangled by a shell or .env.
// If a user's password isn't configured, we fall back to info@ so nothing breaks.

const SMTP_HOST = process.env.SMTP_HOST ?? "smtpout.secureserver.net";
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const INFO_USER = process.env.SMTP_USER ?? "info@akroventures.com";
const INFO_PASS = process.env.SMTP_PASS ?? "";

export interface Sender {
  username: string | null;
  displayName: string;  // "Rohit"
  fullName: string;     // "Rohit Jain"
  email: string;        // from-address + CC target + SMTP user
  phone: string;        // signature line ("" if none)
  title: string;        // signature role line
  smtpUser: string;
  smtpPass: string;
  isFallback: boolean;  // true => fell back to info@ (user mailbox not configured)
}

const INFO_SENDER: Sender = {
  username: null,
  displayName: "Akro Ventures",
  fullName: "Akro Ventures",
  email: INFO_USER,
  phone: "",
  title: "Akro Ventures",
  smtpUser: INFO_USER,
  smtpPass: INFO_PASS,
  isFallback: true,
};

// Resolve who an email should be sent as, given a team username (e.g. a deal's
// owner, or the signed-in campaign operator). Falls back to info@ when the user's
// mailbox password isn't configured yet.
export function resolveSender(username: string | null | undefined): Sender {
  if (!username) return INFO_SENDER;
  const u = getUser(username);
  const pass = process.env[`SMTP_${username.trim().toUpperCase()}_PASS`];
  if (!u || !u.email || !pass) return INFO_SENDER;
  return {
    username: u.username,
    displayName: u.displayName,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone ?? "",
    title: u.title,
    smtpUser: u.email,
    smtpPass: pass,
    isFallback: false,
  };
}

export function transportFor(sender: Sender) {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: sender.smtpUser, pass: sender.smtpPass },
  });
}
