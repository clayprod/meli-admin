import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { connectMercadoPagoAccount } from "@/lib/integrations/service";

function getOrigin(request: Request): string {
  const host = request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = getOrigin(request);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const stateCookie = (await cookies()).get("mercadopago_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(error)}`);
  }

  if (!code || !state || state !== stateCookie) {
    return NextResponse.redirect(`${origin}/integrations?error=oauth_state_invalid`);
  }

  try {
    await connectMercadoPagoAccount(code);
    const response = NextResponse.redirect(`${origin}/integrations?connected=mercadopago`);
    response.cookies.delete("mercadopago_oauth_state");
    return response;
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Falha no OAuth do Mercado Pago.";
    return NextResponse.redirect(`${origin}/integrations?error=${encodeURIComponent(message)}`);
  }
}
