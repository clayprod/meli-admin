import { getMercadoLivreConfig } from "@/lib/integrations/env";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number | string;
};

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, "https://api.mercadolibre.com");

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
    throw new Error(text || `Falha na API do Mercado Livre (${response.status}).`);
  }

  return (await response.json()) as T;
}

export function buildMercadoLivreAuthUrl(state: string) {
  const config = getMercadoLivreConfig();

  if (!config.clientId || !config.redirectUri) {
    throw new Error("Credenciais do Mercado Livre nao configuradas.");
  }

  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeMercadoLivreCode(code: string) {
  const config = getMercadoLivreConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseJsonResponse<TokenResponse>(response);
}

export async function refreshMercadoLivreToken(refreshToken: string) {
  const config = getMercadoLivreConfig();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseJsonResponse<TokenResponse>(response);
}

export async function mercadoLivreRequest<T>(path: string, accessToken: string, query?: Record<string, string | number | boolean | undefined>) {
  const response = await fetch(buildUrl(path, query), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accept: "application/json",
    },
    cache: "no-store",
  });

  return parseJsonResponse<T>(response);
}

export async function getMercadoLivreUserProfile(accessToken: string) {
  return mercadoLivreRequest<Record<string, unknown>>("/users/me", accessToken);
}

export async function searchMercadoLivreItemIds(accessToken: string, userId: string, limit = 50) {
  const response = await mercadoLivreRequest<{ results?: string[] }>(
    `/users/${userId}/items/search`,
    accessToken,
    {
      search_type: "scan",
      limit,
    },
  );

  return response.results ?? [];
}

export async function getMercadoLivreItems(accessToken: string, itemIds: string[]) {
  if (itemIds.length === 0) {
    return [];
  }

  const response = await mercadoLivreRequest<Array<{ body?: Record<string, unknown> }>>(
    "/items",
    accessToken,
    { ids: itemIds.join(",") },
  );

  return response.flatMap((item) => (item.body ? [item.body] : []));
}

export async function getMercadoLivreItemPromotions(accessToken: string, itemId: string) {
  return mercadoLivreRequest<Array<Record<string, unknown>>>(
    `/seller-promotions/items/${itemId}`,
    accessToken,
    { app_version: "v2" },
  );
}

export async function getMercadoLivreItemAdMetrics(
  accessToken: string,
  advertiserSiteId: string,
  itemId: string,
  dateFrom: string,
  dateTo: string,
) {
  return mercadoLivreRequest<{ results?: Array<Record<string, unknown>> }>(
    `/advertising/${advertiserSiteId}/product_ads/ads/${itemId}`,
    accessToken,
    {
      date_from: dateFrom,
      date_to: dateTo,
      metrics:
        "clicks,prints,ctr,cost,cpc,acos,organic_units_quantity,organic_units_amount,organic_items_quantity,direct_items_quantity,indirect_items_quantity,advertising_items_quantity,cvr,roas,sov,direct_units_quantity,indirect_units_quantity,units_quantity,direct_amount,indirect_amount,total_amount",
      aggregation_type: "DAILY",
    },
  );
}
