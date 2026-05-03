import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Trend = {
  label: string;
  direction: "up" | "down" | "neutral";
};

type MetricCardProps = {
  title: string;
  value: string;
  helper: string;
  trend?: Trend;
  tone?: "neutral" | "success" | "warning" | "critical" | "info" | "orange";
  icon: LucideIcon;
};

export function MetricCard({ title, value, helper, trend, tone = "neutral", icon: Icon }: MetricCardProps) {
  const iconBg =
    tone === "orange" || tone === "neutral"
      ? "bg-orange-50 text-orange-600"
      : tone === "success"
      ? "bg-green-50 text-green-600"
      : tone === "warning"
      ? "bg-amber-50 text-amber-600"
      : tone === "critical"
      ? "bg-red-50 text-red-600"
      : "bg-sky-50 text-sky-600";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
        </div>
        <div className={cn("rounded-2xl p-3", iconBg)}>
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-500">{helper}</p>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend.direction === "up" ? "text-green-600" : trend.direction === "down" ? "text-red-600" : "text-slate-500",
            )}
          >
            {trend.direction === "up" && <TrendingUp className="size-3" />}
            {trend.direction === "down" && <TrendingDown className="size-3" />}
            {trend.label}
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
