import { NextRequest, NextResponse } from "next/server";
import { backendGuestRequest } from "@/lib/bff/guest-auth";

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.redirect(payload.authorizationUrl);
  } catch {
    return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });
  }
}
