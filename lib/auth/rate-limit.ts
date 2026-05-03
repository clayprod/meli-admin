import "server-only";

import { prisma } from "@/lib/db/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_PER_EMAIL = 8;
const MAX_FAILED_PER_IP = 30;

export async function isLoginThrottled(email: string, ipAddress: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);

  const [emailFails, ipFails] = await Promise.all([
    prisma.loginAttempt.count({
      where: { email: email.toLowerCase(), success: false, attemptedAt: { gte: since } },
    }),
    ipAddress
      ? prisma.loginAttempt.count({
          where: { ipAddress, success: false, attemptedAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  return emailFails >= MAX_FAILED_PER_EMAIL || ipFails >= MAX_FAILED_PER_IP;
}

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress: string | null;
  success: boolean;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      email: params.email.toLowerCase(),
      ipAddress: params.ipAddress,
      success: params.success,
    },
  });
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}
