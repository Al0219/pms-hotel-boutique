import { NextRequest, NextResponse } from "next/server";
import { applyGuestCookies, backendGuestRequest, guestRefreshCookie, type GuestTokens } from "@/lib/bff/guest-auth";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(guestRefreshCookie)?.value;
  if (!refresh) return NextResponse.json({ error: "Guest session expired" }, { status: 401 });
  try {
    const backend = await backendGuestRequest("/api/v1/guest-auth/refresh", { method: "POST", headers: { cookie: `${guestRefreshCookie}=${encodeURIComponent(refresh)}` } });
    if (!backend.ok) return NextResponse.json({ error: "Guest session expired" }, { status: 401 });
    const tokens = await backend.json() as GuestTokens;
    const response = NextResponse.json({ refreshed: true });
    applyGuestCookies(response, tokens);
    return response;
  } catch { return NextResponse.json({ error: "Guest session unavailable" }, { status: 503 }); }
}
