import { NextResponse } from "next/server";

const backendBaseUrl = process.env.PMS_BACKEND_INTERNAL_URL?.replace(/\/$/, "");
export const guestAccessCookie = "pms_guest_access";
export const guestRefreshCookie = "pms_guest_refresh";

export type GuestTokens = { accessToken: string; refreshToken: string; accessTokenExpiresInSeconds: number };

export async function backendGuestRequest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!backendBaseUrl) throw new Error("PMS_BACKEND_INTERNAL_URL is required for Guest BFF routes");
  return fetch(`${backendBaseUrl}${path}`, { ...init, cache: "no-store" });
}

export function applyGuestCookies(response: NextResponse, tokens: GuestTokens): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(guestAccessCookie, tokens.accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: tokens.accessTokenExpiresInSeconds });
  response.cookies.set(guestRefreshCookie, tokens.refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/api/auth/guest/refresh", maxAge: 7 * 24 * 60 * 60 });
}

export function clearGuestCookies(response: NextResponse): void {
  response.cookies.set(guestAccessCookie, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(guestRefreshCookie, "", { httpOnly: true, sameSite: "lax", path: "/api/auth/guest/refresh", maxAge: 0 });
}
