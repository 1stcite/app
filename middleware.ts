import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "px_session";

function extractSubdomain(req: NextRequest): string {
  const host = req.headers.get("host") ?? "";
  // Strip port if present
  const hostname = host.split(":")[0];

  // Extract subdomain from *.1stcite.app or *.1stcite.com
  // e.g. iaprd.1stcite.app → iaprd
  //      presentrxiv.vercel.app → presentrxiv
  //      presentrxiv.org → presentrxiv
  const patterns = [
    /^(.+)\.1stcite\.app$/,
    /^(.+)\.1stcite\.com$/,
    /^(.+)\.presentrxiv\.org$/,
    /^presentrxiv\.org$/,
    /^presentrxiv\.vercel\.app$/,
  ];

  if (/^presentrxiv\.(org|vercel\.app)$/.test(hostname)) return "presentrxiv";

  for (const pattern of patterns) {
    const match = hostname.match(pattern);
    if (match) return match[1];
  }

  // Fallback: use NEXT_PUBLIC_SITE_ID env var (for existing projects)
  return process.env.NEXT_PUBLIC_SITE_ID ?? "1stcite";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots") ||
    pathname.startsWith("/sitemap") ||
    pathname.match(/\.(png|jpg|svg|ico|webmanifest)$/)
  ) {
    return NextResponse.next();
  }

  // For API routes, pass x-subdomain header but skip auth checks
  if (pathname.startsWith("/api")) {
    const subdomain = extractSubdomain(req);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-subdomain", subdomain);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const subdomain = extractSubdomain(req);

  const isProtected = pathname === "/" || pathname.startsWith("/view/");
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-subdomain", subdomain);

  if (!isProtected) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

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

  if (!requireLogin) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
