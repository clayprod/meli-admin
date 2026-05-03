"use client";

const CSRF_COOKIE = "meli_csrf";
const CSRF_HEADER = "x-csrf-token";

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

export function csrfHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  const token = readCsrfCookie();
  if (token) headers.set(CSRF_HEADER, token);
  return headers;
}

export async function fetchWithCsrf(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: csrfHeaders(init.headers),
  });
}
