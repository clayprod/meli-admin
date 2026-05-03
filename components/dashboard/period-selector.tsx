"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";

const PERIODS: Array<{ key: "7d" | "30d" | "90d"; label: string }> = [
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "90d", label: "90 dias" },
];

type Props = { current: "7d" | "30d" | "90d" };

export function PeriodSelector({ current }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  function handleClick(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set("period", key);
    router.push(`/dashboard?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
      {PERIODS.map((p) => (
        <Button
          key={p.key}
          type="button"
          size="sm"
          variant={current === p.key ? "default" : "ghost"}
          onClick={() => handleClick(p.key)}
          className="px-3 py-1"
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}
