import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/auth/audit";
import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { clearSession, getSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  const session = await getSession();
  await clearSession();

  if (session) {
    await writeAudit({
      orgId: session.orgId,
      userId: session.userId,
      ipAddress: clientIpFromHeaders(request.headers),
      entity: "User",
      entityId: session.userId,
      action: "logout",
    });
  }

  return NextResponse.json({ ok: true });
}
