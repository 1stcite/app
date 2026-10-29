import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "px_session";
const PREVIEW_CONF_COOKIE = "px_conf";

function hostnameOf(req: NextRequest): string {
  // x-forwarded-host is the real hostname on Vercel's edge network
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  return host.split(",")[0].trim().split(":")[0];
}

/**
 * Vercel preview deployments (…vercel.app, other than the PresentrXiv
 * production alias) and localhost have no conference in their hostname.
 * There, and only there, a conference can be chosen with ?conf=<subdomain>,
 * remembered in a cookie. Production hostnames ignore this entirely, so it
 * can't be used to reach another conference's data.
 */
function isPreviewHost(hostname: string): boolean {
  if (/^(www\.)?presentrxiv\.vercel\.app$/.test(hostname)) return false;
  return hostname.endsWith(".vercel.app") || hostname === "localhost" || hostname === "127.0.0.1";
}

const CONF_RE = /^[a-z0-9-]{1,40}$/;

function previewConference(req: NextRequest): string | null {
  const fromQuery = req.nextUrl.searchParams.get("conf")?.toLowerCase() ?? "";
  if (CONF_RE.test(fromQuery)) return fromQuery;
  const fromCookie = req.cookies.get(PREVIEW_CONF_COOKIE)?.value?.toLowerCase() ?? "";
  if (CONF_RE.test(fromCookie)) return fromCookie;
  return null;
}

function extractSubdomain(req: NextRequest): string {
  const hostname = hostnameOf(req);

  // www.presentrxiv.org and presentrxiv.org both resolve to the repo
  if (/^(www\.)?presentrxiv\.(org|vercel\.app)$/.test(hostname)) return "presentrxiv";

  // Extract subdomain from *.1stcite.app, *.1stcite.com, *.presentrxiv.org
  // e.g. lsw.1stcite.app → lsw
  const patterns = [/^(.+)\.1stcite\.app$/, /^(.+)\.1stcite\.com$/, /^(.+)\.presentrxiv\.org$/];
  for (const pattern of patterns) {
    const match = hostname.match(pattern);
    if (match) return match[1];
  }

  if (isPreviewHost(hostname)) {
    const conf = previewConference(req);
    if (conf) return conf;
  }

  // Fallback: use NEXT_PUBLIC_SITE_ID env var (for existing projects)
  return process.env.NEXT_PUBLIC_SITE_ID ?? "1stcite";
}

/** Pass the request on with x-subdomain set; remember ?conf= on preview hosts. */
function next(req: NextRequest, subdomain: string) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-subdomain", subdomain);
  const res = NextResponse.next({ request: { headers: requestHeaders } });

  const q = req.nextUrl.searchParams.get("conf")?.toLowerCase() ?? "";
  if (q && CONF_RE.test(q) && isPreviewHost(hostnameOf(req))) {
    res.cookies.set({ name: PREVIEW_CONF_COOKIE, value: q, path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
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

  const subdomain = extractSubdomain(req);

  // API routes and the login page: set x-subdomain, no auth redirect
  if (pathname.startsWith("/api") || pathname.startsWith("/login")) {
    return next(req, subdomain);
  }

  const isProtected = pathname === "/" || pathname.startsWith("/view/");
  if (!isProtected) return next(req, subdomain);

  let requireLogin = false;
  try {
    const url = req.nextUrl.clone();
    url.pathname = "/api/config";
    url.search = "";
    // On preview hosts, carry the chosen conference into this check
    if (isPreviewHost(hostnameOf(req))) url.searchParams.set("conf", subdomain);
    const r = await fetch(url, { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      requireLogin = Boolean(j?.requireLogin);
    }
  } catch {
    requireLogin = false;
  }

  if (!requireLogin) return next(req, subdomain);

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (hasSession) return next(req, subdomain);

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname);
  if (isPreviewHost(hostnameOf(req))) loginUrl.searchParams.set("conf", subdomain);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
