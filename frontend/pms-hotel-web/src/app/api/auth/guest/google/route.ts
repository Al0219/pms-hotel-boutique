import { NextResponse } from "next/server";
import { backendGuestRequest } from "@/lib/bff/guest-auth";

export async function GET() {
  try {
    const response = await backendGuestRequest("/api/v1/guest-auth/google/start", { method: "POST" });
    if (!response.ok) return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });
    const payload = await response.json() as { authorizationUrl?: string };
    if (!payload.authorizationUrl) return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });
    return NextResponse.redirect(payload.authorizationUrl);
  } catch {
    return NextResponse.json({ error: "Guest authentication is unavailable" }, { status: 503 });
  }
}
