import { NextRequest, NextResponse } from "next/server";
import { backendGuestRequest, guestAccessCookie } from "@/lib/bff/guest-auth";

export async function GET(request: NextRequest) {
  const access = request.cookies.get(guestAccessCookie)?.value;
  if (!access) return NextResponse.json({ error: "Guest session required" }, { status: 401 });
  try {
    const backend = await backendGuestRequest("/api/v1/guest-auth/me", { headers: { authorization: `Bearer ${access}` } });
    if (!backend.ok) return NextResponse.json({ error: "Guest session required" }, { status: 401 });
    return NextResponse.json(await backend.json());
  } catch { return NextResponse.json({ error: "Guest session unavailable" }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  const access = request.cookies.get(guestAccessCookie)?.value;
  const response = new NextResponse(null, { status: 204 });
  if (access) {
    try { await backendGuestRequest("/api/v1/guest-auth/logout", { method: "POST", headers: { authorization: `Bearer ${access}` } }); } catch { /* Cookie clearing still terminates the browser session. */ }
  }
  const { clearGuestCookies } = await import("@/lib/bff/guest-auth");
  clearGuestCookies(response);
  return response;
}
