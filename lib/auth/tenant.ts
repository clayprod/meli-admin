import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import type { UserRole } from "@prisma/client";

export type TenantContext = {
  userId: string;
  orgId: string;
  email: string;
  role: UserRole;
};

const storage = new AsyncLocalStorage<TenantContext>();

export function runWithTenant<T>(context: TenantContext, fn: () => Promise<T> | T): Promise<T> | T {
  return storage.run(context, fn);
}

export function getTenant(): TenantContext | null {
  return storage.getStore() ?? null;
}

export function requireTenant(): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) {
    throw new Error("Tenant context ausente. Verifique se a rota está protegida por requireSession().");
  }
  return ctx;
}
