// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/app/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow static + api
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

  // Always allow login page
  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const isProtected = pathname === "/" || pathname.startsWith("/view/");
  if (!isProtected) return NextResponse.next();

  // Fetch requireLogin config
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