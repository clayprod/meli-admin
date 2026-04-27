"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Calculator,
  ClipboardList,
  LogOut,
  Megaphone,
  Package2,
  PlugZap,
  ReceiptText,
  Store,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/pricing/new", label: "Precificar", icon: Calculator },
  { href: "/products", label: "Produtos", icon: Package2 },
  { href: "/listings", label: "Listings", icon: Store },
  { href: "/promotions", label: "Promoções", icon: ClipboardList },
  { href: "/advertising", label: "Ads", icon: Megaphone },
  { href: "/finance", label: "Financeiro", icon: ReceiptText },
  { href: "/scenarios", label: "Cenários", icon: ClipboardList },
  { href: "/integrations", label: "Integrações", icon: PlugZap },
  { href: "/admin/rates", label: "Tarifas", icon: Boxes },
];

type AppShellProps = {
  currentPath: string;
  title: string;
  description: string;
  userEmail?: string;
  children: React.ReactNode;
};

export function AppShell({ currentPath, title, description, userEmail, children }: AppShellProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-[color:var(--background-subtle)]">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-100 bg-white lg:flex">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6">
          <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500 text-white">
            <BarChart3 className="size-4" />
          </div>
          <span className="text-base font-semibold text-slate-900">Meli Admin</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
          {navigation.map((item) => {
            const isActive = currentPath === item.href || currentPath.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-orange-50 text-orange-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-slate-100 p-3">
          {userEmail && (
            <div className="mb-1 flex items-center gap-2 rounded-xl px-3 py-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <User className="size-3.5 text-slate-500" />
              </div>
              <span className="truncate text-xs text-slate-500">{userEmail}</span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
          >
            <LogOut className="size-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 lg:px-8">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
            <p className="truncate text-xs text-slate-500">{description}</p>
          </div>
          <div className="ml-4 flex shrink-0 items-center gap-3">
            <Button asChild size="sm">
              <Link href="/pricing/new">+ Novo cálculo</Link>
            </Button>
            {userEmail && (
              <div className="hidden items-center gap-2 lg:flex">
                <div className="flex size-8 items-center justify-center rounded-full bg-orange-100">
                  <User className="size-4 text-orange-600" />
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Mobile nav */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 bg-white px-4 py-2 pb-2 lg:hidden">
          {navigation.map((item) => {
            const isActive = currentPath === item.href;
            return (
              <Button key={item.href} asChild variant={isActive ? "default" : "ghost"} size="sm" className="shrink-0">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            );
          })}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
