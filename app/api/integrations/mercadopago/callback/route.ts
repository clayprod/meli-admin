import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/auth/audit";
import { clientIpFromHeaders } from "@/lib/auth/rate-limit";
import { getSession } from "@/lib/auth/session";
import { connectMercadoPagoAccount } from "@/lib/integrations/service";

function getOrigin(request: Request): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function parseStateCookie(raw: string | undefined): { state: string; orgId: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.state === "string" && typeof parsed?.orgId === "string") {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getOrigin(request);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const stateCookie = parseStateCookie((await cookies()).get("mercadopago_oauth_state")?.value);

  if (error) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state || !stateCookie || state !== stateCookie.state) {
    return NextResponse.redirect(`${origin}/integrations?error=oauth_state_invalid`);
  }

  try {
    const connection = await connectMercadoPagoAccount(stateCookie.orgId, code);
    const session = await getSession();
    if (session) {
      await writeAudit({
        orgId: stateCookie.orgId,
        userId: session.userId,
        ipAddress: clientIpFromHeaders(request.headers),
        entity: "IntegrationConnection",
        entityId: connection.id,
        action: "INTEGRATION_CONNECTED",
        after: { provider: "MERCADO_PAGO", externalUserId: connection.externalUserId },
      });
    }
    const response = NextResponse.redirect(`${origin}/integrations?connected=mercadopago`);
    response.cookies.delete("mercadopago_oauth_state");
    return response;
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Falha no OAuth do Mercado Pago.";
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(message)}`);
  }
}
