"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Point = {
  date: string;
  revenue: number;
  netReceived: number;
  adCost: number;
  paymentsCount: number;
};

type Props = {
  data: Point[];
  periodLabel: string;
};

const SERIES = [
  { key: "revenue", label: "Receita bruta", color: "#f97316", type: "bar" as const },
  { key: "netReceived", label: "Líquido recebido", color: "#10b981", type: "line" as const },
  { key: "adCost", label: "Custo de ads", color: "#8b5cf6", type: "line" as const },
];

function formatDateBR(iso: string): string {
  const [_, month, day] = iso.split("-");
  return `${day}/${month}`;
}

export function DailyTrendChart({ data, periodLabel }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    revenue: true,
    netReceived: true,
    adCost: true,
  });

  const allEmpty = data.every((p) => p.revenue === 0 && p.netReceived === 0 && p.adCost === 0);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Tendência diária</CardTitle>
          <CardDescription>{periodLabel} · receita, líquido e custo de ads</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {SERIES.map((s) => (
            <Button
              key={s.key}
              type="button"
              size="sm"
              variant={enabled[s.key] ? "secondary" : "ghost"}
              onClick={() => setEnabled((prev) => ({ ...prev, [s.key]: !prev[s.key] }))}
              className="gap-2"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {allEmpty ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">
            Sem movimentação no período. Aguarde a próxima sincronização ou amplie o período.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateBR}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={(v: number) => (v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`)}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={56}
              />
              <Tooltip
                formatter={(value, name) => {
                  const series = SERIES.find((s) => s.key === name);
                  return [formatCurrency(typeof value === "number" ? value : 0), series?.label ?? String(name)];
                }}
                labelFormatter={(label) => formatDateBR(String(label))}
                contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #f1f5f9" }}
              />
              <Legend wrapperStyle={{ display: "none" }} />
              {enabled.revenue ? (
                <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={28} />
              ) : null}
              {enabled.netReceived ? (
                <Line type="monotone" dataKey="netReceived" stroke="#10b981" strokeWidth={2} dot={false} />
              ) : null}
              {enabled.adCost ? (
                <Line type="monotone" dataKey="adCost" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
