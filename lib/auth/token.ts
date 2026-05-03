import crypto from "node:crypto";

import type { UserRole } from "@prisma/client";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "meli_session";

export type SessionPayload = {
  userId: string;
  orgId: string;
  email: string;
  role: UserRole;
};

function getSecret(): string {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s) throw new Error("AUTH_SESSION_SECRET nao configurada.");
  return s;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export { COOKIE_NAME };

export function createToken(payload: SessionPayload): string {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const body = encode(JSON.stringify({ ...payload, exp: expiry }));
  return `${body}.${hmac(body)}`;
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot < 0) return null;

    const body = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = hmac(body);

    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null;

    const parsed = JSON.parse(decode(body)) as SessionPayload & { exp: number };
    if (typeof parsed.exp !== "number" || Date.now() > parsed.exp) return null;
    if (!parsed.userId || !parsed.orgId || !parsed.email || !parsed.role) return null;

    return { userId: parsed.userId, orgId: parsed.orgId, email: parsed.email, role: parsed.role };
  } catch {
    return null;
  }
}

export function sessionDurationSeconds(): number {
  return SESSION_DURATION_MS / 1000;
}
