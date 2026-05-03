import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

export const CSRF_COOKIE = "meli_csrf";
export const CSRF_HEADER = "x-csrf-token";

const CSRF_DURATION_SECONDS = 12 * 60 * 60;

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function ensureCsrfCookie(): Promise<string> {
  const store = await cookies();
  const existing = store.get(CSRF_COOKIE)?.value;
  if (existing) return existing;

  const token = generateCsrfToken();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_DURATION_SECONDS,
  });
  return token;
}

export async function rotateCsrfCookie(): Promise<string> {
  const store = await cookies();
  const token = generateCsrfToken();
  store.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CSRF_DURATION_SECONDS,
  });
  return token;
}
