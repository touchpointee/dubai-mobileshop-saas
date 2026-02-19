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
  OWNER: ["/owner", "/vat", "/non-vat"],
  VAT_STAFF: ["/vat"],
  NON_VAT_STAFF: ["/non-vat"],
  STAFF: ["/staff"],
};

function getDefaultRedirect(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN": return "/super-admin/dashboard";
    case "OWNER": return "/owner/dashboard";
    case "VAT_STAFF": return "/vat/pos";
    case "NON_VAT_STAFF": return "/non-vat/pos";
    case "STAFF": return "/staff/pos";
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

  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET });

  if (isAdminSubdomain(host)) {
    if (!token) {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      const loginUrl = new URL(`${prefix}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role !== "SUPER_ADMIN") {
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
    if (!token) {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      const loginUrl = new URL(`${prefix}/login`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (token.role === "SUPER_ADMIN") {
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}/login`, request.url));
    }

    const allowedPaths = SHOP_ROLE_PATHS[token.role as string] || [];
    const pathAllowed = allowedPaths.some((p) => pathWithoutLocale.startsWith(p));

    if (!pathAllowed && pathWithoutLocale !== "/" && pathWithoutLocale !== "") {
      const defaultPath = getDefaultRedirect(token.role as Role);
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}${defaultPath}`, request.url));
    }

    if (pathWithoutLocale === "/" || pathWithoutLocale === "") {
      const defaultPath = getDefaultRedirect(token.role as Role);
      const locale = pathname.split("/").filter(Boolean)[0];
      const prefix = locale && ["en", "ar"].includes(locale) ? `/${locale}` : "";
      return NextResponse.redirect(new URL(`${prefix}${defaultPath}`, request.url));
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
