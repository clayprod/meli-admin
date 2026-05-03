import crypto from "node:crypto";

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const SCRYPT_OPTS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const HASH_VERSION = "scrypt$1";

export function hashPassword(password: string): string {
  if (!password || password.length < 8) {
    throw new Error("Senha precisa ter pelo menos 8 caracteres.");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString("hex");
  return `${HASH_VERSION}$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || `${parts[0]}$${parts[1]}` !== HASH_VERSION) return false;
  const salt = parts[2];
  const expected = parts[3];
  try {
    const computed = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTS).toString("hex");
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
