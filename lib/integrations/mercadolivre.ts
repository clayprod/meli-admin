import { getMercadoLivreConfig } from "@/lib/integrations/env";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number | string;
};

type QueryValue = string | number | boolean | undefined;

type ListingPriceResponse = {
  listing_type_id?: string;
  listing_type_name?: string;
  sale_fee_amount?: number;
  listing_fee_amount?: number;
  free_relist?: boolean;
  stop_time?: string;
};

function buildUrl(path: string, query?: Record<string, QueryValue>) {
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

export async function getMercadoLivreCategoryPrediction(siteId: string, query: string) {
  const url = new URL(`https://api.mercadolibre.com/sites/${siteId}/domain_discovery/search`);
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  return parseJsonResponse<
    Array<{
      category_id?: string;
      category_name?: string;
      domain_id?: string;
      domain_name?: string;
    }>
  >(response);
}

export async function getMercadoLivreListingPrices(
  siteId: string,
  options: { price: number; categoryId?: string; listingTypeId?: string },
) {
  const url = new URL(`https://api.mercadolibre.com/sites/${siteId}/listing_prices`);
  url.searchParams.set("price", String(options.price));
  if (options.categoryId) url.searchParams.set("category_id", options.categoryId);
  if (options.listingTypeId) url.searchParams.set("listing_type_id", options.listingTypeId);

  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  return parseJsonResponse<ListingPriceResponse[]>(response);
}

export async function getMercadoLivreSellerShippingCost(
  accessToken: string,
  userId: string,
  options: {
    itemId?: string;
    dimensions?: string;
    itemPrice: number;
    listingTypeId: string;
    mode: string;
    logisticType: string;
    condition?: string;
    categoryId?: string;
    currencyId?: string;
    verbose?: boolean;
  },
) {
  return mercadoLivreRequest<{
    coverage?: {
      all_country?: {
        list_cost?: number;
        currency_id?: string;
        billable_weight?: number;
        discount?: {
          rate?: number;
          type?: string;
          promoted_amount?: number;
        };
      };
    };
  }>(`/users/${userId}/shipping_options/free`, accessToken, {
    item_id: options.itemId,
    dimensions: options.dimensions,
    item_price: options.itemPrice,
    listing_type_id: options.listingTypeId,
    mode: options.mode,
    logistic_type: options.logisticType,
    condition: options.condition ?? "new",
    category_id: options.categoryId,
    currency_id: options.currencyId,
    verbose: options.verbose ?? true,
  });
}

export async function checkMercadoLivreFlexItem(
  accessToken: string,
  siteId: string,
  itemId: string,
) {
  const response = await fetch(
    `https://api.mercadolibre.com/sites/${siteId}/shipping/selfservice/items/${itemId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (response.status === 204) {
    return true;
  }

  if (response.status === 403 || response.status === 404) {
    return false;
  }

  const text = await response.text();
  throw new Error(text || "Falha ao consultar disponibilidade do Flex.");
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

export async function getMercadoLivreItem(accessToken: string, itemId: string) {
  return mercadoLivreRequest<Record<string, unknown>>(`/items/${itemId}`, accessToken);
}

export async function updateMercadoLivreItem(
  accessToken: string,
  itemId: string,
  payload: { price?: number; available_quantity?: number; status?: "active" | "paused" | "closed" },
) {
  const response = await fetch(buildUrl(`/items/${itemId}`), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function searchMercadoLivreQuestions(
  accessToken: string,
  sellerId: string,
  options: { status?: "UNANSWERED" | "ANSWERED"; limit?: number; offset?: number } = {},
) {
  return mercadoLivreRequest<{
    questions?: Array<Record<string, unknown>>;
    total?: number;
  }>("/my/received_questions/search", accessToken, {
    seller_id: sellerId,
    status: options.status,
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
    api_version: 4,
  });
}

export async function answerMercadoLivreQuestion(
  accessToken: string,
  questionId: string | number,
  text: string,
) {
  const response = await fetch(buildUrl("/answers"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ question_id: questionId, text }),
  });

  return parseJsonResponse<Record<string, unknown>>(response);
}

export async function searchMercadoLivrePublicItems(
  siteId: string,
  query: { q?: string; category?: string; limit?: number; offset?: number },
) {
  const url = new URL(`https://api.mercadolibre.com/sites/${siteId}/search`);
  if (query.q) url.searchParams.set("q", query.q);
  if (query.category) url.searchParams.set("category", query.category);
  url.searchParams.set("limit", String(query.limit ?? 20));
  url.searchParams.set("offset", String(query.offset ?? 0));

  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  return parseJsonResponse<{
    results?: Array<Record<string, unknown>>;
    paging?: Record<string, unknown>;
  }>(response);
}

export async function getMercadoLivreCategoryHighlights(siteId: string, categoryId: string) {
  const url = new URL(`https://api.mercadolibre.com/highlights/${siteId}/category/${categoryId}`);
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  return parseJsonResponse<{ content?: Array<Record<string, unknown>> }>(response);
}

export async function getMercadoLivreTrends(siteId: string, categoryId?: string) {
  const path = categoryId ? `/trends/${siteId}/${categoryId}` : `/trends/${siteId}`;
  const url = new URL(`https://api.mercadolibre.com${path}`);
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  return parseJsonResponse<Array<{ keyword: string; url?: string }>>(response);
}

export async function getMercadoLivrePublicItem(itemId: string) {
  const url = new URL(`https://api.mercadolibre.com/items/${itemId}`);
  const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
  return parseJsonResponse<Record<string, unknown>>(response);
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
