import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { COOKIE_NAME, createToken, sessionDurationSeconds, verifyToken, type SessionPayload } from "./token";

export type Session = SessionPayload;

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function requireSessionForPage(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function setSession(payload: Session): Promise<void> {
  (await cookies()).set(COOKIE_NAME, createToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds(),
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
