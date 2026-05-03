import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import type { Role } from "@/lib/constants";
import { extractSubdomain, isAdminSubdomain, getShopSlug } from "@/lib/subdomain";

const intlMiddleware = createMiddleware(routing);

function pathnameWithoutLocale(pathname: string): string {
  const locales = ["en", "ar"];
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && locales.includes(segments[0])) {
    return "/" + segments.slice(1).join("/");
  }
  return pathname || "/";
}

const ADMIN_ALLOWED_PATHS = ["/super-admin/dashboard", "/super-admin/shops", "/super-admin/users", "/login"];
const SHOP_ROLE_PATHS: Record<string, string[]> = {
  VAT_STAFF: ["/vat"],
  STAFF: ["/staff"],
  VAT_SHOP_STAFF: ["/vat-shop-staff/pos", "/vat-shop-staff/stock", "/vat-shop-staff/service"],
};

function getDefaultRedirect(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN": return "/super-admin/dashboard";
    case "VAT_STAFF": return "/vat/pos";
    case "STAFF": return "/staff/pos";
    case "VAT_SHOP_STAFF": return "/vat-shop-staff/pos";
    default: return "/login";
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "localhost:3000";

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    const shopSlug = getShopSlug(host);
    if (shopSlug) {
      const headers = new Headers(request.headers);
      headers.set("x-shop-slug", shopSlug);
      return NextResponse.next({ request: { headers } });
    }
    if (isAdminSubdomain(host)) {
      const headers = new Headers(request.headers);
      headers.set("x-admin-context", "true");
      return NextResponse.next({ request: { headers } });
    }
    return NextResponse.next();
  }

  const pathWithoutLocale = pathnameWithoutLocale(pathname);
  const subdomain = extractSubdomain(host);

  if (!subdomain) {
    if (pathWithoutLocale === "/login" || pathWithoutLocale === "/") {
      return intlMiddleware(request);
    }
    return intlMiddleware(request);
  }

  if (pathWithoutLocale === "/login") {
    return intlMiddleware(request);
  }

  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  const token = await getToken({ req: request, secret });

  if (isAdminSubdomain(host)) {
    // Edge middleware might return null for token even if valid. 
    // Let layout.tsx handle the strict redirect when no token is found.
    if (token && token.role !== "SUPER_ADMIN") {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}/login`, request.url));
    }

    const allowed = ADMIN_ALLOWED_PATHS.some((p) => pathWithoutLocale.startsWith(p));
    if (!allowed && pathWithoutLocale !== "/" && pathWithoutLocale !== "") {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}/super-admin/dashboard`, request.url));
    }

    if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}/super-admin/dashboard`, request.url));
    }

    return intlMiddleware(request);
  }

  const shopSlug = getShopSlug(host);
  if (shopSlug) {
    // Shop subdomain: only redirect to login when we're confident there's no session.
    // If we have a token and it's not SUPER_ADMIN, allow. If we have no token, still
    // let the request through — the VAT/staff layout uses auth() (Node) to check session
    // and redirect. That avoids redirect loops when Edge middleware doesn't get
    // AUTH_SECRET and getToken() returns null even though the cookie is valid.
    if (token && token.role === "SUPER_ADMIN") {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}/login`, request.url));
    }

    const headers = new Headers(request.headers);
    headers.set("x-shop-slug", shopSlug);
    const response = intlMiddleware(request);
    if (response) {
      response.headers.set("x-shop-slug", shopSlug);
    }
    return response;
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
