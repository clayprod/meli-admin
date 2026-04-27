import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  var __prisma__: PrismaClient | undefined;
}

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function isDatabaseConnectionError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001") {
    return true;
  }

  return error instanceof Error && error.message.includes("Can't reach database server");
}

export const prisma =
  global.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma__ = prisma;
}
