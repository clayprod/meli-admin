"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { fetchWithCsrf } from "@/lib/csrf-client";

type ProductOption = {
  id: string;
  name: string;
  sku: string | null;
};

type LinkListingControlProps = {
  listingId: string;
  currentProductId: string | null;
  products: ProductOption[];
};

export function LinkListingControl({ listingId, currentProductId, products }: LinkListingControlProps) {
  const router = useRouter();
  const [productId, setProductId] = useState(currentProductId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetchWithCsrf("/api/listings/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          listingId,
          productId: productId || null,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao vincular produto.");
      }

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Falha ao vincular produto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Select value={productId} onChange={(event) => setProductId(event.target.value)}>
        <option value="">Sem vinculo</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name} {product.sku ? `(${product.sku})` : ""}
          </option>
        ))}
      </Select>
      <Button type="button" size="sm" onClick={handleSave} disabled={busy}>
        {busy ? "Salvando..." : "Vincular"}
      </Button>
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
    </div>
  );
}
