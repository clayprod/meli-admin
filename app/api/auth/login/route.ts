import { NextResponse } from "next/server";

import { setSession, verifyPassword } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email?: string; password?: string };

  const expectedEmail = process.env.AUTH_EMAIL ?? "";

  if (!email || !password || email !== expectedEmail || !verifyPassword(password)) {
    return NextResponse.json({ error: "Credenciais invalidas." }, { status: 401 });
  }

  await setSession(email);

  return NextResponse.json({ ok: true });
}
