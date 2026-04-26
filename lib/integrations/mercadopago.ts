import { getMercadoPagoConfig } from "@/lib/integrations/env";

type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number | string;
};

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, "https://api.mercadopago.com");

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

async function parseJsonResponse<T>(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Falha na API do Mercado Pago (${response.status}).`);
  }

  return (await response.json()) as T;
}

export function buildMercadoPagoAuthUrl(state: string) {
  const config = getMercadoPagoConfig();

  if (!config.clientId || !config.redirectUri) {
    throw new Error("Credenciais do Mercado Pago nao configuradas.");
  }

  const url = new URL("https://auth.mercadopago.com/authorization");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("platform_id", "mp");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", config.redirectUri);

  return url.toString();
}

export async function exchangeMercadoPagoCode(code: string) {
  const config = getMercadoPagoConfig();

  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  return parseJsonResponse<OAuthTokenResponse>(response);
}

export async function refreshMercadoPagoToken(refreshToken: string) {
  const config = getMercadoPagoConfig();

  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  return parseJsonResponse<OAuthTokenResponse>(response);
}

export async function mercadoPagoRequest<T>(path: string, accessToken: string, query?: Record<string, string | number | boolean | undefined>) {
  const response = await fetch(buildUrl(path, query), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  return parseJsonResponse<T>(response);
}

export async function searchMercadoPagoPayments(
  accessToken: string,
  options: {
    beginDate: string;
    endDate: string;
    limit?: number;
    offset?: number;
  },
) {
  return mercadoPagoRequest<{
    results?: Array<Record<string, unknown>>;
    paging?: Record<string, unknown>;
  }>("/v1/payments/search", accessToken, {
    begin_date: options.beginDate,
    end_date: options.endDate,
    range: "date_created",
    sort: "date_created",
    criteria: "desc",
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  });
}
