import { NextRequest, NextResponse } from "next/server";
import { applyGuestCookies, backendGuestRequest, type GuestTokens } from "@/lib/bff/guest-auth";

function getBaseUrl(request?: NextRequest): string {
  if (request) {
    const host = request.headers.get("x-forwarded-host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  }
  return process.env.PMS_WEB_PUBLIC_URL ?? "http://162.35.114.4";
}

function redirectToApp(path: string, request?: NextRequest) {
  return NextResponse.redirect(new URL(path, getBaseUrl(request)));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state) return redirectToApp("/acceso?error=google", request);
  try {
    const host = request.headers.get("x-forwarded-host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      headers["X-Forwarded-Host"] = host;
      headers["X-Forwarded-Proto"] = proto;
    }
    const exchange = await backendGuestRequest("/api/v1/guest-auth/google/exchange", { method: "POST", headers, body: JSON.stringify({ code, state }) });
    if (!exchange.ok) return redirectToApp("/acceso?error=google", request);
    const tokens = await exchange.json() as GuestTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) return redirectToApp("/acceso?error=google", request);
    const response = redirectToApp("/acceso", request);
    applyGuestCookies(response, tokens);
    return response;
  } catch {
    return redirectToApp("/acceso?error=google", request);
  }
}
