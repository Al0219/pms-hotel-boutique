import { NextRequest, NextResponse } from "next/server";
import { backendGuestRequest } from "@/lib/bff/guest-auth";

function isValidCallbackUrl(url: string): boolean {
  if (url.startsWith("hotelboutique://")) return true;
  if (url.startsWith("/")) return true;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    const headers: Record<string, string> = {};
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      headers["X-Forwarded-Host"] = host;
      headers["X-Forwarded-Proto"] = proto;
    }
    const response = await backendGuestRequest("/api/v1/guest-auth/google/start", { method: "POST", headers });
    if (!response.ok) return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });
    const payload = await response.json() as { authorizationUrl?: string };
    if (!payload.authorizationUrl) return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });

    const redirectResponse = NextResponse.redirect(payload.authorizationUrl);
    if (callbackUrl && isValidCallbackUrl(callbackUrl)) {
      redirectResponse.cookies.set("pms_oauth_callback_url", callbackUrl, {
        httpOnly: true,
        secure: proto === "https" || process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      });
    }
    return redirectResponse;
  } catch {
    return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });
  }
}
