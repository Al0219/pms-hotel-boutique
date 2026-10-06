import { NextRequest, NextResponse } from "next/server";
import { applyStaffCookies, backendStaffRequest, clearStaffCookies, staffAccessCookie, type StaffTokens } from "@/lib/bff/staff-auth";

function validCredentials(value: unknown): value is { username: string; password: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.username === "string" && candidate.username.trim().length > 0
    && typeof candidate.password === "string" && candidate.password.length > 0;
}

export async function POST(request: NextRequest) {
  let credentials: unknown;
  try { credentials = await request.json(); } catch { return NextResponse.json({ error: "Invalid Staff credentials" }, { status: 400 }); }
  if (!validCredentials(credentials)) return NextResponse.json({ error: "Invalid Staff credentials" }, { status: 400 });
  try {
    const backend = await backendStaffRequest("/api/v1/staff-auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: credentials.username.trim(), password: credentials.password }),
    });
    if (!backend.ok) return NextResponse.json({ error: "Invalid Staff credentials" }, { status: 401 });
    const tokens = await backend.json() as StaffTokens;
    if (!tokens.accessToken || !tokens.refreshToken || !tokens.accessTokenExpiresInSeconds) return NextResponse.json({ error: "Staff authentication is unavailable" }, { status: 503 });
    const response = NextResponse.json({ authenticated: true }, { status: 201 });
    applyStaffCookies(response, tokens);
    return response;
  } catch { return NextResponse.json({ error: "Staff authentication is unavailable" }, { status: 503 }); }
}

export async function GET(request: NextRequest) {
  const access = request.cookies.get(staffAccessCookie)?.value;
  if (!access) return NextResponse.json({ error: "Staff session required" }, { status: 401 });
  try {
    const backend = await backendStaffRequest("/api/v1/staff-auth/me", { headers: { authorization: `Bearer ${access}` } });
    if (!backend.ok) return NextResponse.json({ error: "Staff session required" }, { status: 401 });
    return NextResponse.json(await backend.json());
  } catch { return NextResponse.json({ error: "Staff session unavailable" }, { status: 503 }); }
}

export async function DELETE(request: NextRequest) {
  const access = request.cookies.get(staffAccessCookie)?.value;
  const response = new NextResponse(null, { status: 204 });
  if (access) {
    try { await backendStaffRequest("/api/v1/staff-auth/logout", { method: "POST", headers: { authorization: `Bearer ${access}` } }); }
    catch { /* Cookie clearing still terminates the browser session. */ }
  }
  clearStaffCookies(response);
  return response;
}
