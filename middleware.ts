import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protect /app/* in deployed production.
 * Local dev / offline preview has no session cookie infrastructure, so the
 * middleware stays permissive there and lets the client store fall back to
 * localStorage demo mode. The API routes enforce auth themselves when D1
 * is bound, so this is a UX-level redirect, not the security boundary.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never interfere with auth pages, API, or static assets.
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/app")) {
    const hasSession = req.cookies.get("af_session")?.value;
    // Only redirect when we can tell this is a deployed environment where
    // sessions are real. Localhost keeps the offline demo experience.
    const host = req.headers.get("host") || "";
    const isLocal = host.startsWith("localhost") || host.startsWith("127.");
    if (!hasSession && !isLocal) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
