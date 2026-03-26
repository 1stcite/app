// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Defined inline — importing from app/lib/auth pulls in mongodb,
// which is a Node.js module that crashes the Edge runtime.
const SESSION_COOKIE = "px_session";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.startsWith("/presentrxiv-logo.png")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const isProtected = pathname === "/" || pathname.startsWith("/view/");
  if (!isProtected) return NextResponse.next();

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
    requireLogin = false;
  }

  if (!requireLogin) return NextResponse.next();

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return NextResponse.next();

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/", "/view/:path*"],
};