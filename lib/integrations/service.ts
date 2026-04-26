import {
  ConnectionStatus,
  IntegrationProvider,
  Prisma,
  type IntegrationConnection,
} from "@prisma/client";

import { prisma as db } from "@/lib/db/prisma";
import { decryptSecret, encryptSecret } from "@/lib/integrations/crypto";
import { getMercadoPagoConfig } from "@/lib/integrations/env";
import {
  exchangeMercadoLivreCode,
  getMercadoLivreItemAdMetrics,
  getMercadoLivreItemPromotions,
  getMercadoLivreItems,
  getMercadoLivreUserProfile,
  refreshMercadoLivreToken,
  searchMercadoLivreItemIds,
} from "@/lib/integrations/mercadolivre";
import {
  exchangeMercadoPagoCode,
  refreshMercadoPagoToken,
  searchMercadoPagoPayments,
} from "@/lib/integrations/mercadopago";

function mapTokenExpiry(expiresIn?: number) {
  if (!expiresIn) {
    return null;
  }

  return new Date(Date.now() + expiresIn * 1000);
}

function resolveConnectionLabel(provider: IntegrationProvider, profile: Record<string, unknown>, fallbackId: string) {
  if (provider === IntegrationProvider.MERCADO_LIVRE) {
    return String(profile.nickname ?? profile.first_name ?? `Vendedor ${fallbackId}`);
  }

  return String(profile.nickname ?? `Conta MP ${fallbackId}`);
}

async function upsertConnection(params: {
  provider: IntegrationProvider;
  externalUserId: string;
  accountLabel: string;
  siteId?: string | null;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scopes?: string | null;
  tokenExpiresAt?: Date | null;
  metadataJson?: Record<string, unknown> | null;
}) {
  return db.integrationConnection.upsert({
    where: {
      provider_externalUserId: {
        provider: params.provider,
        externalUserId: params.externalUserId,
      },
    },
    update: {
      status: ConnectionStatus.ACTIVE,
      accountLabel: params.accountLabel,
      siteId: params.siteId,
      accessTokenEnc: encryptSecret(params.accessToken),
      refreshTokenEnc: params.refreshToken ? encryptSecret(params.refreshToken) : null,
      tokenType: params.tokenType,
      scopes: params.scopes,
      tokenExpiresAt: params.tokenExpiresAt,
      metadataJson: params.metadataJson ? (params.metadataJson as Prisma.InputJsonValue) : Prisma.JsonNull,
      lastSyncError: null,
    },
    create: {
      provider: params.provider,
      externalUserId: params.externalUserId,
      accountLabel: params.accountLabel,
      siteId: params.siteId,
      status: ConnectionStatus.ACTIVE,
      accessTokenEnc: encryptSecret(params.accessToken),
      refreshTokenEnc: params.refreshToken ? encryptSecret(params.refreshToken) : null,
      tokenType: params.tokenType,
      scopes: params.scopes,
      tokenExpiresAt: params.tokenExpiresAt,
      metadataJson: params.metadataJson ? (params.metadataJson as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

async function markSyncError(connectionId: string, error: unknown) {
  await db.integrationConnection.update({
    where: { id: connectionId },
    data: {
      lastSyncStatus: "error",
      lastSyncError: error instanceof Error ? error.message : "Falha na sincronizacao.",
    },
  });
}

async function markSyncSuccess(connectionId: string) {
  await db.integrationConnection.update({
    where: { id: connectionId },
    data: {
      lastSyncedAt: new Date(),
      lastSyncStatus: "success",
      lastSyncError: null,
    },
  });
}

export async function connectMercadoLivreAccount(code: string) {
  const token = await exchangeMercadoLivreCode(code);
  const profile = await getMercadoLivreUserProfile(token.access_token);
  const externalUserId = String(token.user_id ?? profile.id ?? profile.user_id);

  if (!externalUserId) {
    throw new Error("Nao foi possivel identificar a conta do Mercado Livre.");
  }

  return upsertConnection({
    provider: IntegrationProvider.MERCADO_LIVRE,
    externalUserId,
    accountLabel: resolveConnectionLabel(IntegrationProvider.MERCADO_LIVRE, profile, externalUserId),
    siteId: String(profile.site_id ?? "MLB"),
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type ?? null,
    scopes: token.scope ?? null,
    tokenExpiresAt: mapTokenExpiry(token.expires_in),
    metadataJson: profile,
  });
}

export async function connectMercadoPagoAccount(code: string) {
  const token = await exchangeMercadoPagoCode(code);
  const externalUserId = String(token.user_id ?? `collector-${Date.now()}`);
  const metadata = {
    token_user_id: token.user_id ?? null,
  };

  return upsertConnection({
    provider: IntegrationProvider.MERCADO_PAGO,
    externalUserId,
    accountLabel: resolveConnectionLabel(IntegrationProvider.MERCADO_PAGO, metadata, externalUserId),
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type ?? null,
    scopes: token.scope ?? null,
    tokenExpiresAt: mapTokenExpiry(token.expires_in),
    metadataJson: metadata,
  });
}

async function ensureDirectMercadoPagoConnection() {
  const config = getMercadoPagoConfig();

  if (!config.accessToken) {
    return null;
  }

  return upsertConnection({
    provider: IntegrationProvider.MERCADO_PAGO,
    externalUserId: "env-direct",
    accountLabel: "Mercado Pago direto (token)",
    accessToken: config.accessToken,
    refreshToken: null,
    tokenType: "Bearer",
    scopes: "direct_access",
    tokenExpiresAt: null,
    metadataJson: {
      mode: "direct_access_token",
      public_key: config.publicKey || null,
    },
  });
}

export async function getPrimaryConnection(provider: IntegrationProvider) {
  return db.integrationConnection.findFirst({
    where: {
      provider,
      status: {
        not: ConnectionStatus.DISCONNECTED,
      },
    },
    orderBy: [{ updatedAt: "desc" }],
  });
}

export async function getValidAccessToken(connection: IntegrationConnection) {
  const accessToken = decryptSecret(connection.accessTokenEnc);
  const refreshToken = connection.refreshTokenEnc ? decryptSecret(connection.refreshTokenEnc) : null;
  const expiresSoon = connection.tokenExpiresAt
    ? connection.tokenExpiresAt.getTime() - Date.now() < 10 * 60 * 1000
    : false;

  if (!expiresSoon) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error("A conexao nao possui refresh token para renovacao automatica.");
  }

  const refreshed =
    connection.provider === IntegrationProvider.MERCADO_LIVRE
      ? await refreshMercadoLivreToken(refreshToken)
      : await refreshMercadoPagoToken(refreshToken);

  const updated = await db.integrationConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encryptSecret(refreshed.access_token),
      refreshTokenEnc: refreshed.refresh_token ? encryptSecret(refreshed.refresh_token) : connection.refreshTokenEnc,
      tokenExpiresAt: mapTokenExpiry(refreshed.expires_in),
      tokenType: refreshed.token_type ?? connection.tokenType,
      scopes: refreshed.scope ?? connection.scopes,
      status: ConnectionStatus.ACTIVE,
    },
  });

  return decryptSecret(updated.accessTokenEnc);
}

function parseDate(input: unknown, fallback = new Date()) {
  const date = typeof input === "string" ? new Date(input) : input instanceof Date ? input : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function parseNumber(input: unknown) {
  if (typeof input === "number") {
    return input;
  }

  if (typeof input === "string" && input.trim() !== "") {
    const parsed = Number(input);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parseIntOrNull(input: unknown) {
  const parsed = parseNumber(input);
  return parsed === null ? null : Math.trunc(parsed);
}

function stringifyJson(input: unknown) {
  return input && typeof input === "object" ? (input as Prisma.InputJsonValue) : Prisma.JsonNull;
}

export async function syncMercadoLivreListings() {
  const connection = await getPrimaryConnection(IntegrationProvider.MERCADO_LIVRE);

  if (!connection) {
    throw new Error("Conecte uma conta do Mercado Livre antes de sincronizar.");
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const itemIds = await searchMercadoLivreItemIds(accessToken, connection.externalUserId);
    const items = await getMercadoLivreItems(accessToken, itemIds.slice(0, 50));

    const result = await db.$transaction(async (tx) => {
      let synced = 0;

      for (const item of items) {
        const itemId = String(item.id ?? "");
        if (!itemId) {
          continue;
        }

        await tx.marketplaceListing.upsert({
          where: { itemId },
          update: {
            siteId: String(item.site_id ?? connection.siteId ?? "MLB"),
            sellerId: String(item.seller_id ?? connection.externalUserId),
            title: String(item.title ?? "Sem titulo"),
            status: String(item.status ?? "active"),
            condition: item.condition ? String(item.condition) : null,
            domainId: item.domain_id ? String(item.domain_id) : null,
            categoryId: item.category_id ? String(item.category_id) : null,
            currencyId: item.currency_id ? String(item.currency_id) : null,
            listingTypeId: item.listing_type_id ? String(item.listing_type_id) : null,
            logisticType:
              item.shipping && typeof item.shipping === "object" && "logistic_type" in item.shipping
                ? String((item.shipping as Record<string, unknown>).logistic_type ?? "") || null
                : null,
            officialStoreId: item.official_store_id ? String(item.official_store_id) : null,
            catalogListing: Boolean(item.catalog_listing),
            acceptsMercadoPago: item.accepts_mercadopago !== false,
            price: parseNumber(item.price) ?? 0,
            originalPrice: parseNumber(item.original_price),
            availableQuantity: parseIntOrNull(item.available_quantity),
            soldQuantity: parseIntOrNull(item.sold_quantity),
            thumbnail: item.thumbnail ? String(item.thumbnail) : null,
            permalink: item.permalink ? String(item.permalink) : null,
            videoId: item.video_id ? String(item.video_id) : null,
            picturesJson: stringifyJson(item.pictures),
            attributesJson: stringifyJson(item.attributes),
            shippingJson: stringifyJson(item.shipping),
            variationsJson: stringifyJson(item.variations),
            tagsJson: stringifyJson(item.tags),
            rawJson: stringifyJson(item),
            lastSyncedAt: new Date(),
          },
          create: {
            connectionId: connection.id,
            itemId,
            siteId: String(item.site_id ?? connection.siteId ?? "MLB"),
            sellerId: String(item.seller_id ?? connection.externalUserId),
            title: String(item.title ?? "Sem titulo"),
            status: String(item.status ?? "active"),
            condition: item.condition ? String(item.condition) : null,
            domainId: item.domain_id ? String(item.domain_id) : null,
            categoryId: item.category_id ? String(item.category_id) : null,
            currencyId: item.currency_id ? String(item.currency_id) : null,
            listingTypeId: item.listing_type_id ? String(item.listing_type_id) : null,
            logisticType:
              item.shipping && typeof item.shipping === "object" && "logistic_type" in item.shipping
                ? String((item.shipping as Record<string, unknown>).logistic_type ?? "") || null
                : null,
            officialStoreId: item.official_store_id ? String(item.official_store_id) : null,
            catalogListing: Boolean(item.catalog_listing),
            acceptsMercadoPago: item.accepts_mercadopago !== false,
            price: parseNumber(item.price) ?? 0,
            originalPrice: parseNumber(item.original_price),
            availableQuantity: parseIntOrNull(item.available_quantity),
            soldQuantity: parseIntOrNull(item.sold_quantity),
            thumbnail: item.thumbnail ? String(item.thumbnail) : null,
            permalink: item.permalink ? String(item.permalink) : null,
            videoId: item.video_id ? String(item.video_id) : null,
            picturesJson: stringifyJson(item.pictures),
            attributesJson: stringifyJson(item.attributes),
            shippingJson: stringifyJson(item.shipping),
            variationsJson: stringifyJson(item.variations),
            tagsJson: stringifyJson(item.tags),
            rawJson: stringifyJson(item),
            lastSyncedAt: new Date(),
          },
        });
        synced += 1;
      }

      return synced;
    });

    await markSyncSuccess(connection.id);
    return { syncedListings: result };
  } catch (error) {
    await markSyncError(connection.id, error);
    throw error;
  }
}

export async function syncMercadoLivrePromotions() {
  const connection = await getPrimaryConnection(IntegrationProvider.MERCADO_LIVRE);

  if (!connection) {
    throw new Error("Conecte uma conta do Mercado Livre antes de sincronizar promocoes.");
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const listings = await db.marketplaceListing.findMany({
      where: { connectionId: connection.id },
      select: { id: true, itemId: true },
      take: 50,
    });

    let synced = 0;

    for (const listing of listings) {
      const promotions = await getMercadoLivreItemPromotions(accessToken, listing.itemId);
      const promotionIds = promotions.map((promotion) => String(promotion.id ?? "")).filter(Boolean);

      await db.listingPromotion.deleteMany({
        where: {
          listingId: listing.id,
          ...(promotionIds.length > 0 ? { promotionId: { notIn: promotionIds } } : {}),
        },
      });

      for (const promotion of promotions) {
        const promotionId = String(promotion.id ?? "");
        if (!promotionId) {
          continue;
        }

        await db.listingPromotion.upsert({
          where: {
            listingId_promotionId: {
              listingId: listing.id,
              promotionId,
            },
          },
          update: {
            promotionType: String(promotion.type ?? promotion.promotion_type ?? "UNKNOWN"),
            subType: promotion.sub_type ? String(promotion.sub_type) : null,
            status: String(promotion.status ?? "pending"),
            name: promotion.name ? String(promotion.name) : null,
            dealPrice: parseNumber(promotion.price),
            originalPrice: parseNumber(promotion.original_price),
            fixedPercentage: parseNumber(promotion.fixed_percentage),
            fixedAmount: parseNumber(promotion.fixed_amount),
            sellerPercentage: parseNumber(promotion.seller_percentage),
            meliPercentage: parseNumber(promotion.meli_percentage),
            startDate: promotion.start_date ? parseDate(promotion.start_date) : null,
            finishDate: promotion.finish_date ? parseDate(promotion.finish_date) : null,
            rawJson: stringifyJson(promotion),
          },
          create: {
            connectionId: connection.id,
            listingId: listing.id,
            promotionId,
            promotionType: String(promotion.type ?? promotion.promotion_type ?? "UNKNOWN"),
            subType: promotion.sub_type ? String(promotion.sub_type) : null,
            status: String(promotion.status ?? "pending"),
            name: promotion.name ? String(promotion.name) : null,
            dealPrice: parseNumber(promotion.price),
            originalPrice: parseNumber(promotion.original_price),
            fixedPercentage: parseNumber(promotion.fixed_percentage),
            fixedAmount: parseNumber(promotion.fixed_amount),
            sellerPercentage: parseNumber(promotion.seller_percentage),
            meliPercentage: parseNumber(promotion.meli_percentage),
            startDate: promotion.start_date ? parseDate(promotion.start_date) : null,
            finishDate: promotion.finish_date ? parseDate(promotion.finish_date) : null,
            rawJson: stringifyJson(promotion),
          },
        });
        synced += 1;
      }
    }

    await markSyncSuccess(connection.id);
    return { syncedPromotions: synced };
  } catch (error) {
    await markSyncError(connection.id, error);
    throw error;
  }
}

export async function syncMercadoLivreAds(days = 14) {
  const connection = await getPrimaryConnection(IntegrationProvider.MERCADO_LIVRE);

  if (!connection) {
    throw new Error("Conecte uma conta do Mercado Livre antes de sincronizar ads.");
  }

  if (!connection.siteId) {
    throw new Error("A conexao do Mercado Livre nao possui siteId para consultar ads.");
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const listings = await db.marketplaceListing.findMany({
      where: { connectionId: connection.id },
      select: { id: true, itemId: true },
      take: 30,
    });
    const dateTo = new Date();
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dateFromString = dateFrom.toISOString().slice(0, 10);
    const dateToString = dateTo.toISOString().slice(0, 10);

    let synced = 0;

    for (const listing of listings) {
      const metrics = await getMercadoLivreItemAdMetrics(
        accessToken,
        connection.siteId,
        listing.itemId,
        dateFromString,
        dateToString,
      );

      for (const row of metrics.results ?? []) {
        const metricDate = parseDate(row.date, dateTo);
        await db.listingAdMetric.upsert({
          where: {
            listingId_metricDate_campaignId: {
              listingId: listing.id,
              metricDate,
              campaignId: row.campaign_id ? String(row.campaign_id) : "",
            },
          },
          update: {
            clicks: parseIntOrNull(row.clicks),
            prints: parseIntOrNull(row.prints),
            ctr: parseNumber(row.ctr),
            cost: parseNumber(row.cost),
            cpc: parseNumber(row.cpc),
            acos: parseNumber(row.acos),
            roas: parseNumber(row.roas),
            cvr: parseNumber(row.cvr),
            sov: parseNumber(row.sov),
            directAmount: parseNumber(row.direct_amount),
            indirectAmount: parseNumber(row.indirect_amount),
            totalAmount: parseNumber(row.total_amount),
            unitsQuantity: parseIntOrNull(row.units_quantity),
            directUnitsQuantity: parseIntOrNull(row.direct_units_quantity),
            indirectUnitsQuantity: parseIntOrNull(row.indirect_units_quantity),
            advertisingItemsQuantity: parseIntOrNull(row.advertising_items_quantity),
            organicUnitsQuantity: parseIntOrNull(row.organic_units_quantity),
            organicUnitsAmount: parseNumber(row.organic_units_amount),
            rawJson: stringifyJson(row),
          },
          create: {
            connectionId: connection.id,
            listingId: listing.id,
            metricDate,
            campaignId: row.campaign_id ? String(row.campaign_id) : "",
            clicks: parseIntOrNull(row.clicks),
            prints: parseIntOrNull(row.prints),
            ctr: parseNumber(row.ctr),
            cost: parseNumber(row.cost),
            cpc: parseNumber(row.cpc),
            acos: parseNumber(row.acos),
            roas: parseNumber(row.roas),
            cvr: parseNumber(row.cvr),
            sov: parseNumber(row.sov),
            directAmount: parseNumber(row.direct_amount),
            indirectAmount: parseNumber(row.indirect_amount),
            totalAmount: parseNumber(row.total_amount),
            unitsQuantity: parseIntOrNull(row.units_quantity),
            directUnitsQuantity: parseIntOrNull(row.direct_units_quantity),
            indirectUnitsQuantity: parseIntOrNull(row.indirect_units_quantity),
            advertisingItemsQuantity: parseIntOrNull(row.advertising_items_quantity),
            organicUnitsQuantity: parseIntOrNull(row.organic_units_quantity),
            organicUnitsAmount: parseNumber(row.organic_units_amount),
            rawJson: stringifyJson(row),
          },
        });
        synced += 1;
      }
    }

    await markSyncSuccess(connection.id);
    return { syncedMetrics: synced };
  } catch (error) {
    await markSyncError(connection.id, error);
    throw error;
  }
}

function inferListingLink(externalReference: string | null, itemLookup: Map<string, { id: string; productId: string | null }>) {
  if (!externalReference) {
    return null;
  }

  const direct = itemLookup.get(externalReference);
  if (direct) {
    return direct;
  }

  for (const [itemId, listing] of itemLookup.entries()) {
    if (externalReference.includes(itemId)) {
      return listing;
    }
  }

  return null;
}

export async function syncMercadoPagoPayments(days = 30) {
  const connection =
    (await getPrimaryConnection(IntegrationProvider.MERCADO_PAGO)) ??
    (await ensureDirectMercadoPagoConnection());

  if (!connection) {
    throw new Error("Configure um access token ou conecte uma conta do Mercado Pago antes de sincronizar pagamentos.");
  }

  try {
    const accessToken = await getValidAccessToken(connection);
    const endDate = new Date();
    const beginDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const response = await searchMercadoPagoPayments(accessToken, {
      beginDate: beginDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100,
    });
    const listings = await db.marketplaceListing.findMany({
      select: { id: true, itemId: true, productId: true },
    });
    const itemLookup = new Map(listings.map((listing) => [listing.itemId, { id: listing.id, productId: listing.productId }]));

    let synced = 0;

    for (const payment of response.results ?? []) {
      const paymentId = String(payment.id ?? "");
      if (!paymentId) {
        continue;
      }

      const externalReference = payment.external_reference ? String(payment.external_reference) : null;
      const linkedListing = inferListingLink(externalReference, itemLookup);
      const feeDetails = Array.isArray(payment.fee_details)
        ? payment.fee_details as Array<Record<string, unknown>>
        : [];
      const marketplaceFeeAmount = feeDetails
        .filter((fee) => String(fee.type ?? "").includes("application"))
        .reduce((total, fee) => total + (parseNumber(fee.amount) ?? 0), 0);
      const mercadopagoFeeAmount = feeDetails
        .filter((fee) => !String(fee.type ?? "").includes("application"))
        .reduce((total, fee) => total + (parseNumber(fee.amount) ?? 0), 0);

      await db.financialPayment.upsert({
        where: { paymentId },
        update: {
          listingId: linkedListing?.id ?? null,
          productId: linkedListing?.productId ?? null,
          externalReference,
          merchantOrderId:
            payment.order && typeof payment.order === "object" && "id" in payment.order
              ? String((payment.order as Record<string, unknown>).id ?? "") || null
              : null,
          marketplaceOrderId: payment.marketplace ? String(payment.marketplace) : null,
          status: String(payment.status ?? "unknown"),
          statusDetail: payment.status_detail ? String(payment.status_detail) : null,
          paymentMethodId: payment.payment_method_id ? String(payment.payment_method_id) : null,
          paymentTypeId: payment.payment_type_id ? String(payment.payment_type_id) : null,
          currencyId: payment.currency_id ? String(payment.currency_id) : null,
          transactionAmount: parseNumber(payment.transaction_amount) ?? 0,
          totalPaidAmount: parseNumber(payment.total_paid_amount),
          netReceivedAmount:
            parseNumber(payment.net_received_amount) ??
            parseNumber(
              payment.transaction_details && typeof payment.transaction_details === "object"
                ? (payment.transaction_details as Record<string, unknown>).net_received_amount
                : null,
            ),
          shippingAmount: parseNumber(payment.shipping_amount),
          marketplaceFeeAmount: marketplaceFeeAmount || null,
          mercadopagoFeeAmount: mercadopagoFeeAmount || null,
          approvedAt: payment.date_approved ? parseDate(payment.date_approved) : null,
          paymentCreatedAt: payment.date_created ? parseDate(payment.date_created) : null,
          paymentUpdatedAt: payment.date_last_updated ? parseDate(payment.date_last_updated) : null,
          rawJson: stringifyJson(payment),
        },
        create: {
          connectionId: connection.id,
          listingId: linkedListing?.id ?? null,
          productId: linkedListing?.productId ?? null,
          paymentId,
          externalReference,
          merchantOrderId:
            payment.order && typeof payment.order === "object" && "id" in payment.order
              ? String((payment.order as Record<string, unknown>).id ?? "") || null
              : null,
          marketplaceOrderId: payment.marketplace ? String(payment.marketplace) : null,
          status: String(payment.status ?? "unknown"),
          statusDetail: payment.status_detail ? String(payment.status_detail) : null,
          paymentMethodId: payment.payment_method_id ? String(payment.payment_method_id) : null,
          paymentTypeId: payment.payment_type_id ? String(payment.payment_type_id) : null,
          currencyId: payment.currency_id ? String(payment.currency_id) : null,
          transactionAmount: parseNumber(payment.transaction_amount) ?? 0,
          totalPaidAmount: parseNumber(payment.total_paid_amount),
          netReceivedAmount:
            parseNumber(payment.net_received_amount) ??
            parseNumber(
              payment.transaction_details && typeof payment.transaction_details === "object"
                ? (payment.transaction_details as Record<string, unknown>).net_received_amount
                : null,
            ),
          shippingAmount: parseNumber(payment.shipping_amount),
          marketplaceFeeAmount: marketplaceFeeAmount || null,
          mercadopagoFeeAmount: mercadopagoFeeAmount || null,
          approvedAt: payment.date_approved ? parseDate(payment.date_approved) : null,
          paymentCreatedAt: payment.date_created ? parseDate(payment.date_created) : null,
          paymentUpdatedAt: payment.date_last_updated ? parseDate(payment.date_last_updated) : null,
          rawJson: stringifyJson(payment),
        },
      });
      synced += 1;
    }

    await markSyncSuccess(connection.id);
    return { syncedPayments: synced };
  } catch (error) {
    await markSyncError(connection.id, error);
    throw error;
  }
}

export async function recordIntegrationWebhook(params: {
  provider: IntegrationProvider;
  topic: string;
  payload: Record<string, unknown>;
  resource?: string | null;
  externalEventId?: string | null;
  externalUserId?: string | null;
}) {
  const connection = params.externalUserId
    ? await db.integrationConnection.findFirst({
        where: {
          provider: params.provider,
          externalUserId: params.externalUserId,
        },
      })
    : null;

  return db.integrationWebhookEvent.create({
    data: {
      connectionId: connection?.id ?? null,
      provider: params.provider,
      topic: params.topic,
      resource: params.resource ?? null,
      externalEventId: params.externalEventId ?? null,
      payloadJson: params.payload as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });
}
