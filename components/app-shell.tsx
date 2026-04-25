import Link from "next/link";
import { BarChart3, Boxes, Calculator, ClipboardList, Package2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pricing/new", label: "Precificar", icon: Calculator },
  { href: "/products", label: "Produtos", icon: Package2 },
  { href: "/scenarios", label: "Cenarios", icon: ClipboardList },
  { href: "/admin/rates", label: "Tarifas", icon: Boxes },
];

type AppShellProps = {
  currentPath: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ currentPath, title, description, children }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-[color:var(--background)] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(248,250,252,0.98))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] gap-6 px-4 py-4 lg:px-6 lg:py-6">
        <aside className="hidden w-72 shrink-0 flex-col rounded-[32px] border border-white/70 bg-slate-950 px-6 py-8 text-white shadow-[0_28px_80px_-35px_rgba(2,6,23,0.8)] lg:flex">
          <div className="space-y-4">
            <Badge className="w-fit bg-white/10 text-sky-100 ring-white/10" tone="neutral">
              MVP local em construcao
            </Badge>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Meli Admin</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Precificacao, margem, ROI e historico dos produtos do Mercado Livre.
              </p>
            </div>
          </div>

          <nav className="mt-10 space-y-2">
            {navigation.map((item) => {
              const isActive = currentPath === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    isActive
                      ? "bg-white text-slate-950 shadow-lg"
                      : "text-slate-300 hover:bg-white/8 hover:text-white",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-medium text-white">Proximo passo</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Persistir produtos, cenarios e resultados com Prisma + PostgreSQL e preparar o container.
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_18px_55px_-35px_rgba(15,23,42,0.55)] backdrop-blur lg:px-7 lg:py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Mercado Livre Pricing Suite
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="info">Tarifas seed 2026</Badge>
                <Button asChild variant="secondary">
                  <Link href="/pricing/new">Novo calculo</Link>
                </Button>
              </div>
            </div>
          </header>

          <div className="flex gap-3 overflow-x-auto pb-1 lg:hidden">
            {navigation.map((item) => {
              const isActive = currentPath === item.href;

              return (
                <Button key={item.href} asChild variant={isActive ? "default" : "outline"} size="sm">
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </div>

          <main className="pb-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
