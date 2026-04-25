import { NextResponse } from "next/server";

import { hasDatabaseUrl, prisma } from "@/lib/db/prisma";

export async function GET() {
  if (!hasDatabaseUrl()) {
    return NextResponse.json({ status: "ok", database: "not-configured" });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ status: "ok", database: "connected" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Database healthcheck failed.",
      },
      { status: 503 },
    );
  }
}
