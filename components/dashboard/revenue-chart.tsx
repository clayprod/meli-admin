"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

type Props = {
  data: { weekLabel: string; gmv: number; net: number; fees: number }[];
};

export function RevenueChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="flex items-center justify-center p-10">
        <p className="text-sm text-slate-400">Nenhum dado de receita disponível. Sincronize os pagamentos do Mercado Pago.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Receita semanal</CardTitle>
        <CardDescription>GMV e valor líquido recebido nas últimas semanas</CardDescription>
      </CardHeader>
      <CardContent className="pr-4">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip
              formatter={(value, name) => [
                formatCurrency(typeof value === "number" ? value : 0),
                name === "gmv" ? "GMV" : name === "net" ? "Líquido" : "Taxas",
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 12, border: "1px solid #f1f5f9" }}
            />
            <Line type="monotone" dataKey="gmv" stroke="#f97316" strokeWidth={2} dot={false} name="gmv" />
            <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={false} name="net" />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
