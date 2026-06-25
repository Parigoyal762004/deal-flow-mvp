import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";

// Paths reachable WITHOUT a team login.
//  - "/" is the public deal-submission form (founders use it, not the team).
//  - the login page + auth endpoints.
//  - /api/submit-deal powers that public submission form (rate-limited+validated).
//  - /api/approve is clicked straight from Pari's mail client and is already
//    protected by an unguessable token, so it must stay open.
// Everything else (dashboard, campaign, find-email, send-edited, DD) requires login.
const PUBLIC = [
  "/",
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/submit-deal",
  "/api/approve",
];

function isPublic(pathname: string): boolean {
  return PUBLIC.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // CSRF defence: reject cross-site state-changing requests to our API. GETs and
  // the token-gated /api/approve (clicked from email clients) are exempt.
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  if (isMutation && pathname.startsWith("/api/") && pathname !== "/api/approve" && !isSameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  // API calls get a clean 401; pages redirect to the login screen.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|pdf|txt|xml)).*)",
  ],
};
