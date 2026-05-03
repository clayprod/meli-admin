import crypto from "node:crypto";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { COOKIE_NAME, verifyToken } from "@/lib/auth/token";

const PUBLIC_PREFIXES = ["/login", "/api/auth/", "/api/cron/", "/api/webhooks/"];

const CSRF_COOKIE = "meli_csrf";
const CSRF_HEADER = "x-csrf-token";
const CSRF_MAX_AGE = 12 * 60 * 60;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const CSRF_EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/integrations/mercadolivre/callback",
  "/api/integrations/mercadopago/callback",
  "/api/webhooks",
  "/api/cron",
];

function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function constantTimeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function withCsrfCookie(response: NextResponse, request: NextRequest): NextResponse {
  if (!request.cookies.get(CSRF_COOKIE)?.value) {
    response.cookies.set(CSRF_COOKIE, generateToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: CSRF_MAX_AGE,
    });
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;

  const isApiMutation =
    pathname.startsWith("/api/") &&
    !SAFE_METHODS.has(method) &&
    !CSRF_EXEMPT_PATHS.some((exempt) => pathname === exempt || pathname.startsWith(`${exempt}/`));

  if (isApiMutation) {
    const headerToken = request.headers.get(CSRF_HEADER);
    if (!cookieToken || !headerToken || !constantTimeEqual(cookieToken, headerToken)) {
      return NextResponse.json({ error: "CSRF token invalido." }, { status: 403 });
    }
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));

  if (isPublic) {
    return withCsrfCookie(NextResponse.next(), request);
  }

  const sessionToken = request.cookies.get(COOKIE_NAME)?.value;
  const session = sessionToken ? verifyToken(sessionToken) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return withCsrfCookie(NextResponse.next(), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
