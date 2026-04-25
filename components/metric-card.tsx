import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type MetricCardProps = {
  title: string;
  value: string;
  helper: string;
  tone?: "neutral" | "success" | "warning" | "critical" | "info";
  icon: LucideIcon;
};

export function MetricCard({ title, value, helper, tone = "neutral", icon: Icon }: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-500">{helper}</p>
        <Badge tone={tone}>{tone === "success" ? "Bom" : tone === "warning" ? "Atencao" : tone === "critical" ? "Risco" : "Info"}</Badge>
      </CardContent>
    </Card>
  );
}
