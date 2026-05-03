import { NextResponse } from "next/server";
import { z } from "zod";

import { writeAudit } from "@/lib/auth/audit";
import { rotateCsrfCookie } from "@/lib/auth/csrf";
import { verifyPassword } from "@/lib/auth/password";
import { clientIpFromHeaders, isLoginThrottled, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { setSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const GENERIC_ERROR = "Credenciais invalidas.";

export async function POST(request: Request) {
  const ipAddress = clientIpFromHeaders(request.headers);

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const email = parsed.email.toLowerCase();

  if (await isLoginThrottled(email, ipAddress)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && user.active && verifyPassword(parsed.password, user.passwordHash);

  await recordLoginAttempt({ email, ipAddress, success: Boolean(ok) });

  if (!ok || !user) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  await setSession({ userId: user.id, orgId: user.orgId, email: user.email, role: user.role });
  await rotateCsrfCookie();

  await writeAudit({
    orgId: user.orgId,
    userId: user.id,
    ipAddress,
    entity: "User",
    entityId: user.id,
    action: "login.success",
  });

  return NextResponse.json({ ok: true });
}
