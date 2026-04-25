"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type CostBreakdownChartProps = {
  data: Array<{ name: string; value: number; color: string }>;
};

export function CostBreakdownChart({ data }: CostBreakdownChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Breakdown do preco</CardTitle>
        <CardDescription>Distribuicao inicial do custo e da margem esperada no lote atual.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div className="flex justify-center">
          <PieChart width={320} height={280}>
            <Pie data={data} dataKey="value" innerRadius={65} outerRadius={105} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
          </PieChart>
        </div>

        <div className="space-y-3">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-sm font-medium text-slate-700">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold text-slate-950">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
