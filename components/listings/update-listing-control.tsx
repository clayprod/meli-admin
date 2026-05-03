"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { fetchWithCsrf } from "@/lib/csrf-client";

type UpdateListingControlProps = {
  listingId: string;
  itemId: string;
  currentPrice: number;
  currentAvailableQuantity: number | null;
  currentStatus: string;
  suggestedPrice?: number | null;
};

type Step = "idle" | "review" | "confirm";

export function UpdateListingControl({
  listingId,
  itemId,
  currentPrice,
  currentAvailableQuantity,
  currentStatus,
  suggestedPrice,
}: UpdateListingControlProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const initialQuantity = currentAvailableQuantity ?? 0;
  const [price, setPrice] = useState<string>(String(currentPrice));
  const [quantity, setQuantity] = useState<string>(String(initialQuantity));
  const [status, setStatus] = useState<string>(currentStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedPrice = price.trim() ? Number(price) : currentPrice;
  const parsedQuantity = quantity.trim() ? Number(quantity) : initialQuantity;

  const priceChanged = Number.isFinite(parsedPrice) && parsedPrice !== currentPrice;
  const quantityChanged = Number.isFinite(parsedQuantity) && parsedQuantity !== initialQuantity;
  const statusChanged = status !== currentStatus;
  const hasChanges = priceChanged || quantityChanged || statusChanged;

  function reset() {
    setPrice(String(currentPrice));
    setQuantity(String(initialQuantity));
    setStatus(currentStatus);
    setStep("idle");
    setError(null);
  }

  async function handleConfirm() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetchWithCsrf("/api/listings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          confirm: true,
          price: priceChanged ? parsedPrice : undefined,
          availableQuantity: quantityChanged ? parsedQuantity : undefined,
          status: statusChanged ? (status as "active" | "paused" | "closed") : undefined,
        }),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao atualizar anuncio.");
      }

      setStep("idle");
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Falha ao atualizar anuncio.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setStep("review")}>
          Editar no ML
        </Button>
        {suggestedPrice && suggestedPrice !== currentPrice ? (
          <span className="text-xs text-slate-500">Sugerido: R$ {suggestedPrice.toFixed(2)}</span>
        ) : null}
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50/50 p-3">
        <p className="text-xs font-medium text-slate-700">Editar item {itemId}</p>
        <div className="grid grid-cols-3 gap-2">
          <label className="space-y-1 text-xs text-slate-600">
            Preco
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            Estoque
            <Input
              type="number"
              step="1"
              min="0"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
          <label className="space-y-1 text-xs text-slate-600">
            Status
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="closed">closed</option>
            </Select>
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setStep("confirm")}
            disabled={!hasChanges}
          >
            Revisar alteracoes
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={reset}>
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-red-300 bg-red-50/60 p-3">
      <p className="text-xs font-semibold text-red-800">
        Confirmar publicacao no Mercado Livre?
      </p>
      <ul className="space-y-1 text-xs text-slate-700">
        {priceChanged ? (
          <li>
            Preco: <span className="line-through">{currentPrice}</span> &rarr; <strong>{parsedPrice}</strong>
          </li>
        ) : null}
        {quantityChanged ? (
          <li>
            Estoque: <span className="line-through">{initialQuantity}</span> &rarr; <strong>{parsedQuantity}</strong>
          </li>
        ) : null}
        {statusChanged ? (
          <li>
            Status: <span className="line-through">{currentStatus}</span> &rarr; <strong>{status}</strong>
          </li>
        ) : null}
      </ul>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={handleConfirm} disabled={busy}>
          {busy ? "Publicando..." : "Confirmar e publicar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setStep("review")} disabled={busy}>
          Voltar
        </Button>
      </div>
      {error ? <p className="text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  );
}
