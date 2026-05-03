import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type AuditEntry = {
  orgId: string;
  userId?: string | null;
  ipAddress?: string | null;
  entity: string;
  entityId: string;
  action: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
};

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        orgId: entry.orgId,
        userId: entry.userId ?? null,
        ipAddress: entry.ipAddress ?? null,
        entity: entry.entity,
        entityId: entry.entityId,
        action: entry.action,
        beforeJson: entry.before ?? undefined,
        afterJson: entry.after ?? undefined,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write entry", { entry, error });
  }
}
