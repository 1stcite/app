import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ATTENDEE_COOKIE = "px_attendee";

export async function proxy(req: NextRequest){
  const { pathname } = req.nextUrl;

  // Always allow these
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") || // NOTE: config fetch below still hits /api/config, so we allow it
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/presentrxiv-logo.png")
  ) {
    return NextResponse.next();
  }

  // Allow login page always
  if (pathname.startsWith("/login")) return NextResponse.next();

  // Protect only library + viewer (not /admin for now)
  const isProtected = pathname === "/" || pathname.startsWith("/view/");
  if (!isProtected) return NextResponse.next();

  // Read config (Mongo-backed) through internal API
  let requireLogin = false;
  try {
    const url = req.nextUrl.clone();
    url.pathname = "/api/config";
    url.search = "";
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      requireLogin = Boolean(j?.requireLogin);
    }
  } catch {
    // If config fetch fails, default to NOT blocking (safer for demos)
    requireLogin = false;
  }

  if (!requireLogin) return NextResponse.next();

  const hasAttendee = Boolean(req.cookies.get(ATTENDEE_COOKIE)?.value);
  if (hasAttendee) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/view/:path*"],
};