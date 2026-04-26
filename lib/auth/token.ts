import crypto from "node:crypto";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE_NAME = "meli_session";

function getSecret(): string {
  const s = process.env.AUTH_SESSION_SECRET;
  if (!s) throw new Error("AUTH_SESSION_SECRET nao configurada.");
  return s;
}

function hmac(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export { COOKIE_NAME };

export function createToken(email: string): string {
  const expiry = Date.now() + SESSION_DURATION_MS;
  const payload = `${email}:${expiry}`;
  return `${payload}:${hmac(payload)}`;
}

export function verifyToken(token: string): { email: string } | null {
  try {
    const lastColon = token.lastIndexOf(":");
    if (lastColon < 0) return null;

    const payload = token.slice(0, lastColon);
    const tokenHmac = token.slice(lastColon + 1);
    const expectedHmac = hmac(payload);

    if (tokenHmac.length !== expectedHmac.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(tokenHmac, "hex"), Buffer.from(expectedHmac, "hex"))) return null;

    const colonIdx = payload.indexOf(":");
    if (colonIdx < 0) return null;
    const email = payload.slice(0, colonIdx);
    const expiry = parseInt(payload.slice(colonIdx + 1), 10);

    if (Number.isNaN(expiry) || Date.now() > expiry) return null;

    return { email };
  } catch {
    return null;
  }
}

export function sessionDurationSeconds(): number {
  return SESSION_DURATION_MS / 1000;
}
