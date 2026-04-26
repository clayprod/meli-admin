import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

import { COOKIE_NAME, createToken, sessionDurationSeconds, verifyToken } from "./token";

export async function getSession(): Promise<{ email: string } | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSession(email: string): Promise<void> {
  (await cookies()).set(COOKIE_NAME, createToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds(),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export function verifyPassword(password: string): boolean {
  const hash = process.env.AUTH_PASSWORD_HASH ?? "";
  const colonIdx = hash.indexOf(":");
  if (colonIdx < 0) return false;
  const salt = hash.slice(0, colonIdx);
  const stored = hash.slice(colonIdx + 1);
  try {
    const computed = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(stored, "hex"));
  } catch {
    return false;
  }
}
