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
  const callbackUrl = request.cookies.get("pms_oauth_callback_url")?.value;

  if (!code || !state) {
    if (callbackUrl && callbackUrl.startsWith("hotelboutique://")) {
      const errorUrl = new URL(callbackUrl);
      errorUrl.searchParams.set("error", "google");
      const res = NextResponse.redirect(errorUrl.toString());
      res.cookies.delete("pms_oauth_callback_url");
      return res;
    }
    return redirectToApp("/acceso?error=google", request);
  }

  try {
    const host = request.headers.get("x-forwarded-host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      headers["X-Forwarded-Host"] = host;
      headers["X-Forwarded-Proto"] = proto;
    }
    const exchange = await backendGuestRequest("/api/v1/guest-auth/google/exchange", { method: "POST", headers, body: JSON.stringify({ code, state }) });
    if (!exchange.ok) {
      if (callbackUrl && callbackUrl.startsWith("hotelboutique://")) {
        const errorUrl = new URL(callbackUrl);
        errorUrl.searchParams.set("error", "google");
        const res = NextResponse.redirect(errorUrl.toString());
        res.cookies.delete("pms_oauth_callback_url");
        return res;
      }
      return redirectToApp("/acceso?error=google", request);
    }
    const tokens = await exchange.json() as GuestTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) {
      if (callbackUrl && callbackUrl.startsWith("hotelboutique://")) {
        const errorUrl = new URL(callbackUrl);
        errorUrl.searchParams.set("error", "google");
        const res = NextResponse.redirect(errorUrl.toString());
        res.cookies.delete("pms_oauth_callback_url");
        return res;
      }
      return redirectToApp("/acceso?error=google", request);
    }

    if (callbackUrl && callbackUrl.startsWith("hotelboutique://")) {
      const redirectUrl = new URL(callbackUrl);
      redirectUrl.searchParams.set("token", tokens.accessToken);
      redirectUrl.searchParams.set("refreshToken", tokens.refreshToken);
      redirectUrl.searchParams.set("expiresIn", tokens.accessTokenExpiresInSeconds.toString());
      const response = NextResponse.redirect(redirectUrl.toString());
      response.cookies.delete("pms_oauth_callback_url");
      return response;
    }

    const target = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/acceso";
    const response = redirectToApp(target, request);
    if (callbackUrl) {
      response.cookies.delete("pms_oauth_callback_url");
    }
    applyGuestCookies(response, tokens);
    return response;
  } catch {
    if (callbackUrl && callbackUrl.startsWith("hotelboutique://")) {
      const errorUrl = new URL(callbackUrl);
      errorUrl.searchParams.set("error", "google");
      const res = NextResponse.redirect(errorUrl.toString());
      res.cookies.delete("pms_oauth_callback_url");
      return res;
    }
    return redirectToApp("/acceso?error=google", request);
  }
}
