// Team users for Deal Flow.
//
// Passwords are NOT stored in plaintext — only a salted SHA-256 hash lives here,
// so the repo never contains a usable credential. To change a password, recompute
// the hash:  sha256(`${SALT}:${plaintextPassword}`)  and paste it below.
//
// `username` is what people type to log in (lowercase). `displayName` is shown in
// the UI and used as the deal "owner" label.

const enc = new TextEncoder();
const SALT = "akro-deal-flow-v1";

export interface TeamUser {
  username: string;
  displayName: string;
  fullName: string;     // full name for email signatures
  email: string;        // mailbox / "from" address (also the SMTP user)
  phone?: string;       // shown in email signature
  title: string;        // role line in signature
  passwordHash: string; // hex sha256 of `${SALT}:${password}`
}

// NOTE: the SMTP password for each mailbox is NOT stored here. It lives in an env
// var named SMTP_<USERNAME>_PASS (e.g. SMTP_PARI_PASS), set directly in Vercel so
// special characters are never mangled by a shell or .env parser. See lib/mailer.ts.
export const USERS: TeamUser[] = [
  { username: "pari",    displayName: "Pari",    fullName: "Pari Goyal",        email: "pari.goyal@akroventures.com",        phone: "",                 title: "Akro Ventures",            passwordHash: "09b5689e6a6d6d2971758e118cc43df6bfba0e909b285149e4fdce595cbe9d5c" },
  { username: "rohit",   displayName: "Rohit",   fullName: "Rohit Jain",        email: "rohit.jain@akroventures.com",        phone: "+91 99406 28986",  title: "Co-Founder, Akro Ventures", passwordHash: "9ed389b0c036846f223338fd06927c0261bd0e358ce7a4e86a95eaa25903a781" },
  { username: "eva",     displayName: "Eva",     fullName: "Eva Kriplani",      email: "eva.kriplani@akroventures.com",      phone: "",                 title: "Akro Ventures",            passwordHash: "fb55bae8fb0ffa74bbce2ac4059feca428976776d2ff2499d02c6a97f7b2a014" },
  { username: "akshita", displayName: "Akshita", fullName: "Akshita Chahande",  email: "akshita.chahande@akroventures.com",  phone: "",                 title: "Akro Ventures",            passwordHash: "2f70db86e9ff85c444b6b0a44cf34efab74a5517991517c675c9ea384272abca" },
];

// Map an owner username -> display name (falls back to a capitalised username,
// or "Harish" legacy label, so old/unknown values still render nicely).
export function ownerDisplayName(username: string | null | undefined): string {
  if (!username) return "Unassigned";
  const u = USERS.find((x) => x.username === username.toLowerCase());
  if (u) return u.displayName;
  return username.charAt(0).toUpperCase() + username.slice(1);
}

export function getUser(username: string): TeamUser | null {
  return USERS.find((u) => u.username === username.trim().toLowerCase()) ?? null;
}

const ADMINS = new Set(["pari", "rohit"]);

export function isAdmin(username: string | null | undefined): boolean {
  return !!username && ADMINS.has(username.trim().toLowerCase());
}

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Returns the matched user (constant-time on the hash) or null.
export async function verifyUser(username: string, password: string): Promise<TeamUser | null> {
  const user = getUser(username);
  const candidate = await sha256Hex(`${SALT}:${password}`);
  // Always compare against *some* hash to keep timing uniform whether or not the
  // username exists.
  const target = user?.passwordHash ?? "0".repeat(64);
  const ok = timingSafeEqualStr(candidate, target);
  return ok && user ? user : null;
}
