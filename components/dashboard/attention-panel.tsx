import { AlertCircle, Boxes, MessageSquareWarning, PauseCircle, Wallet } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardOverview } from "@/lib/db/dashboard-queries";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  attention: DashboardOverview["attention"];
  details: DashboardOverview["attentionDetails"];
};

type Tile = {
  icon: LucideIcon;
  label: string;
  count: number;
  tone: "critical" | "warning" | "info";
  href: string;
  hint: string;
};

const TONE_CLASSES: Record<Tile["tone"], string> = {
  critical: "bg-red-50 text-red-700 ring-red-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function AttentionPanel({ attention, details }: Props) {
  const tiles: Tile[] = [
    {
      icon: Wallet,
      label: "Pagamentos pendentes",
      count: attention.pendingPayments,
      tone: "warning",
      href: "/finance",
      hint: "em revisão / em processamento",
    },
    {
      icon: PauseCircle,
      label: "Anúncios pausados",
      count: attention.pausedListings,
      tone: "warning",
      href: "/listings",
      hint: "fora do ar agora",
    },
    {
      icon: Boxes,
      label: "Estoque crítico",
      count: attention.lowStockListings,
      tone: "critical",
      href: "/listings",
      hint: "menos de 5 unidades",
    },
    {
      icon: MessageSquareWarning,
      label: "Perguntas (24h)",
      count: attention.unansweredQuestions,
      tone: "info",
      href: "/listings",
      hint: "recebidas hoje",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="size-4 text-orange-500" />
          Atenção agora
        </CardTitle>
        <CardDescription>O que precisa de ação humana antes do próximo ciclo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.label}
                href={tile.href}
                className={cn(
                  "rounded-2xl ring-1 p-4 transition hover:scale-[1.01]",
                  TONE_CLASSES[tile.tone],
                )}
              >
                <div className="flex items-start justify-between">
                  <Icon className="size-4" />
                  <span className="text-3xl font-bold leading-none">{tile.count}</span>
                </div>
                <p className="mt-3 text-sm font-medium">{tile.label}</p>
                <p className="text-xs opacity-70">{tile.hint}</p>
              </Link>
            );
          })}
        </div>

        {details.lowStock.length > 0 ? (
          <div className="rounded-xl border border-red-100 bg-red-50/40 p-3">
            <p className="text-xs font-semibold text-red-800">
              Estoque crítico — {details.lowStock.length} anúncio{details.lowStock.length === 1 ? "" : "s"}
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {details.lowStock.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-baseline justify-between gap-2">
                  <Link
                    href={l.permalink ?? "/listings"}
                    target={l.permalink ? "_blank" : undefined}
                    className="truncate text-slate-700 hover:underline"
                  >
                    {l.title}
                  </Link>
                  <span className="shrink-0 font-mono font-semibold text-red-700">
                    {l.availableQuantity} un
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {details.pendingPayments.length > 0 ? (
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
            <p className="text-xs font-semibold text-amber-800">
              Pagamentos pendentes — recentes
            </p>
            <ul className="mt-2 space-y-1 text-xs">
              {details.pendingPayments.slice(0, 5).map((p) => (
                <li key={p.paymentId} className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-slate-700">
                    <span className="font-mono text-slate-500">{p.paymentId}</span>
                    {p.statusDetail ? <span className="ml-2 text-slate-500">— {p.statusDetail}</span> : null}
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">
                    {formatCurrency(p.transactionAmount)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
