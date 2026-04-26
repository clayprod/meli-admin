import crypto from "node:crypto";

import { getIntegrationSecret } from "@/lib/integrations/env";

function getKey() {
  const secret = getIntegrationSecret();

  if (!secret) {
    throw new Error("INTEGRATIONS_SECRET nao configurada.");
  }

  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptSecret(value: string) {
  const [ivEncoded, encryptedEncoded, tagEncoded] = value.split(":");

  if (!ivEncoded || !encryptedEncoded || !tagEncoded) {
    throw new Error("Valor criptografado invalido.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivEncoded, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedEncoded, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
