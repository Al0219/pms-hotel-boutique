import { NextRequest, NextResponse } from "next/server";
import { applyStaffCookies, backendStaffRequest, staffRefreshCookie, type StaffTokens } from "@/lib/bff/staff-auth";

export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(staffRefreshCookie)?.value;
  if (!refresh) return NextResponse.json({ error: "Staff session expired" }, { status: 401 });
  try {
    const backend = await backendStaffRequest("/api/v1/staff-auth/refresh", {
      method: "POST",
      headers: { cookie: `${staffRefreshCookie}=${encodeURIComponent(refresh)}` },
    });
    if (!backend.ok) return NextResponse.json({ error: "Staff session expired" }, { status: 401 });
    const tokens = await backend.json() as StaffTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) return NextResponse.json({ error: "Staff session unavailable" }, { status: 503 });
    const response = NextResponse.json({ refreshed: true });
    applyStaffCookies(response, tokens);
    return response;
  } catch { return NextResponse.json({ error: "Staff session unavailable" }, { status: 503 }); }
}
