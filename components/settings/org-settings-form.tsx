"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { fetchWithCsrf } from "@/lib/csrf-client";
import { formatPercent } from "@/lib/format";

type Props = {
  initial: {
    name: string;
    taxRegime: "SIMPLES_NACIONAL" | "LUCRO_PRESUMIDO" | "LUCRO_REAL" | "MEI";
    simplesAnexo: string | null;
    rbt12: number | null;
    effectiveTaxRate: number | null;
  };
};

const REGIMES = [
  { value: "SIMPLES_NACIONAL", label: "Simples Nacional" },
  { value: "LUCRO_PRESUMIDO", label: "Lucro Presumido" },
  { value: "LUCRO_REAL", label: "Lucro Real" },
  { value: "MEI", label: "MEI" },
];

const ANEXOS = [
  { value: "I", label: "Anexo I (Comércio)" },
  { value: "II", label: "Anexo II (Indústria)" },
  { value: "III", label: "Anexo III (Serviços)" },
];

export function OrgSettingsForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [taxRegime, setTaxRegime] = useState(initial.taxRegime);
  const [simplesAnexo, setSimplesAnexo] = useState(initial.simplesAnexo ?? "I");
  const [rbt12, setRbt12] = useState<string>(initial.rbt12 != null ? String(initial.rbt12) : "");
  const [effectiveTaxRate, setEffectiveTaxRate] = useState(initial.effectiveTaxRate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOkMsg(null);

    try {
      const body: Record<string, unknown> = {
        name,
        taxRegime,
        simplesAnexo: taxRegime === "SIMPLES_NACIONAL" ? simplesAnexo : null,
        rbt12: rbt12.trim() === "" ? null : Number(rbt12),
      };

      const res = await fetchWithCsrf("/api/org/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Falha ao salvar.");
      }

      const data = (await res.json()) as Props["initial"];
      setEffectiveTaxRate(data.effectiveTaxRate);
      setOkMsg("Configuracao salva.");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <CardHeader>
          <CardTitle>Identidade fiscal</CardTitle>
          <CardDescription>
            Define o regime tributario da sua empresa e a base de calculo da aliquota efetiva.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Razao social / nome</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taxRegime">Regime tributario</Label>
              <Select id="taxRegime" value={taxRegime} onChange={(e) => setTaxRegime(e.target.value as typeof taxRegime)}>
                {REGIMES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>

            {taxRegime === "SIMPLES_NACIONAL" && (
              <div className="space-y-2">
                <Label htmlFor="simplesAnexo">Anexo do Simples</Label>
                <Select
                  id="simplesAnexo"
                  value={simplesAnexo}
                  onChange={(e) => setSimplesAnexo(e.target.value)}
                >
                  {ANEXOS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {taxRegime === "SIMPLES_NACIONAL" && (
            <div className="space-y-2">
              <Label htmlFor="rbt12">Receita bruta acumulada nos ultimos 12 meses (RBT12)</Label>
              <Input
                id="rbt12"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={rbt12}
                onChange={(e) => setRbt12(e.target.value)}
                placeholder="ex: 480000"
              />
              <p className="text-xs text-slate-500">
                Soma do faturamento dos ultimos 12 meses fechados. Usada para calcular a aliquota efetiva da DAS.
              </p>
            </div>
          )}

          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>}
          {okMsg && <p className="rounded-xl bg-green-50 px-4 py-2.5 text-sm text-green-700">{okMsg}</p>}

          <div className="flex justify-end">
            <Button type="submit" disabled={busy}>
              {busy ? "Salvando..." : "Salvar configuracao"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aliquota efetiva calculada</CardTitle>
          <CardDescription>
            Recalculada toda vez que voce salva. Usada como default no workbench de pricing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {taxRegime === "SIMPLES_NACIONAL" ? (
            effectiveTaxRate != null ? (
              <div className="space-y-3">
                <p className="text-4xl font-semibold text-slate-950">{formatPercent(effectiveTaxRate)}</p>
                <p className="text-sm text-slate-600">
                  Calculada a partir do RBT12 informado, na faixa correspondente do Anexo {simplesAnexo}.
                </p>
                <p className="text-xs text-slate-500">
                  Formula: ((RBT12 x aliquota nominal da faixa) - parcela a deduzir) / RBT12
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Informe o RBT12 e salve para calcular a aliquota efetiva.
              </p>
            )
          ) : (
            <p className="text-sm text-slate-500">
              Calculo automatico de aliquota efetiva esta disponivel apenas para Simples Nacional. Para outros regimes,
              configure manualmente no workbench.
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}
