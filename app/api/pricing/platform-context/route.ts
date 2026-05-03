import { IntegrationProvider } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  checkMercadoLivreFlexItem,
  getMercadoLivreCategoryPrediction,
  getMercadoLivreListingPrices,
  getMercadoLivreSellerShippingCost,
} from "@/lib/integrations/mercadolivre";
import { getPrimaryConnection, getValidAccessToken } from "@/lib/integrations/service";

const requestSchema = z.object({
  listingId: z.string().optional(),
  productName: z.string().min(2).optional(),
  siteId: z.string().min(3).max(3).optional(),
  categoryId: z.string().optional(),
  referencePrice: z.number().positive(),
  listingType: z.enum(["CLASSICO", "PREMIUM"]),
  weightKg: z.number().positive(),
  lengthCm: z.number().positive(),
  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
});

const LISTING_TYPE_MAP = {
  CLASSICO: "gold_special",
  PREMIUM: "gold_pro",
} as const;

function buildDimensions(lengthCm: number, widthCm: number, heightCm: number, weightKg: number) {
  return `${Math.ceil(heightCm)}x${Math.ceil(widthCm)}x${Math.ceil(lengthCm)},${Math.ceil(weightKg * 1000)}`;
}

function buildShippingQuotePayload(response: {
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
}) {
  const coverage = response.coverage?.all_country;
  const finalCost = Number(coverage?.list_cost ?? 0);
  const promotedAmount = Number(coverage?.discount?.promoted_amount ?? finalCost);

  return {
    marketplaceShippingCost: finalCost,
    marketplaceShippingRebate: Math.max(0, promotedAmount - finalCost),
    currencyId: coverage?.currency_id ?? "BRL",
    billableWeight: coverage?.billable_weight ?? null,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = requestSchema.parse(await request.json());

    const selectedListing = payload.listingId
      ? await prisma.marketplaceListing.findFirst({
          where: { id: payload.listingId, connection: { orgId: session.orgId } },
          include: { connection: true },
        })
      : null;

    const siteId = selectedListing?.siteId ?? payload.siteId ?? "MLB";
    let categoryId = selectedListing?.categoryId ?? payload.categoryId ?? null;

    if (!categoryId && payload.productName) {
      const prediction = await getMercadoLivreCategoryPrediction(siteId, payload.productName);
      categoryId = prediction[0]?.category_id ?? null;
    }

    const listingPrices = await getMercadoLivreListingPrices(siteId, {
      price: payload.referencePrice,
      categoryId: categoryId ?? undefined,
    });

    const listingPriceMap = {
      CLASSICO:
        listingPrices.find((entry) => entry.listing_type_id === LISTING_TYPE_MAP.CLASSICO) ?? null,
      PREMIUM:
        listingPrices.find((entry) => entry.listing_type_id === LISTING_TYPE_MAP.PREMIUM) ?? null,
    };

    const primaryConnection =
      selectedListing?.connection ??
      (await getPrimaryConnection(session.orgId, IntegrationProvider.MERCADO_LIVRE));
    const accessToken = primaryConnection ? await getValidAccessToken(primaryConnection) : null;
    const sellerId = selectedListing?.sellerId ?? primaryConnection?.externalUserId ?? null;
    const dimensions = buildDimensions(
      payload.lengthCm,
      payload.widthCm,
      payload.heightCm,
      payload.weightKg,
    );
    const listingTypeId = LISTING_TYPE_MAP[payload.listingType];

    let fullQuote = null;
    let flexQuote = null;
    let flexEnabled: boolean | null = null;

    if (accessToken && sellerId) {
      const [fullResponse, flexResponse, flexStatus] = await Promise.all([
        getMercadoLivreSellerShippingCost(accessToken, sellerId, {
          dimensions,
          itemPrice: payload.referencePrice,
          listingTypeId,
          mode: "me2",
          logisticType: "fulfillment",
          categoryId: categoryId ?? undefined,
          verbose: true,
        }).catch(() => null),
        getMercadoLivreSellerShippingCost(accessToken, sellerId, {
          dimensions,
          itemPrice: payload.referencePrice,
          listingTypeId,
          mode: "self_service",
          logisticType: "flex",
          categoryId: categoryId ?? undefined,
          verbose: true,
        }).catch(() => null),
        selectedListing?.itemId
          ? checkMercadoLivreFlexItem(accessToken, siteId, selectedListing.itemId).catch(() => null)
          : Promise.resolve(null),
      ]);

      fullQuote = fullResponse ? buildShippingQuotePayload(fullResponse) : null;
      flexQuote = flexResponse ? buildShippingQuotePayload(flexResponse) : null;
      flexEnabled = flexStatus;
    }

    return NextResponse.json({
      context: {
        listingId: selectedListing?.id ?? null,
        itemId: selectedListing?.itemId ?? null,
        title: selectedListing?.title ?? null,
        siteId,
        categoryId,
        referencePrice: payload.referencePrice,
        predictedFromTitle: !selectedListing && !payload.categoryId,
      },
      commissionSuggestions: {
        CLASSICO: listingPriceMap.CLASSICO
          ? {
              listingTypeId: LISTING_TYPE_MAP.CLASSICO,
              listingTypeName: listingPriceMap.CLASSICO.listing_type_name ?? "Classico",
              saleFeeRate: Number(listingPriceMap.CLASSICO.sale_fee_amount ?? 0),
            }
          : null,
        PREMIUM: listingPriceMap.PREMIUM
          ? {
              listingTypeId: LISTING_TYPE_MAP.PREMIUM,
              listingTypeName: listingPriceMap.PREMIUM.listing_type_name ?? "Premium",
              saleFeeRate: Number(listingPriceMap.PREMIUM.sale_fee_amount ?? 0),
            }
          : null,
      },
      shippingSuggestions: {
        FULL: fullQuote,
        FLEX: flexQuote
          ? {
              ...flexQuote,
              flexEnabled,
            }
          : null,
        PROPRIA: {
          marketplaceShippingCost: 0,
          marketplaceShippingRebate: 0,
          currencyId: selectedListing?.currencyId ?? "BRL",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao consultar contexto da plataforma.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
