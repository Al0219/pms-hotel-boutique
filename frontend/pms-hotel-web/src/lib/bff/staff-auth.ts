import "server-only";

import type { NextResponse } from "next/server";

const backendBaseUrl = process.env.PMS_BACKEND_INTERNAL_URL?.replace(/\/$/, "");

export const staffAccessCookie = "pms_staff_access";
export const staffRefreshCookie = "pms_staff_refresh";
export type StaffTokens = { accessToken: string; refreshToken: string; accessTokenExpiresInSeconds: number };

export async function backendStaffRequest(path: string, init: RequestInit = {}): Promise<Response> {
  if (!backendBaseUrl) throw new Error("PMS_BACKEND_INTERNAL_URL is required for Staff BFF routes");
  return fetch(`${backendBaseUrl}${path}`, { ...init, cache: "no-store" });
}

export function applyStaffCookies(response: NextResponse, tokens: StaffTokens): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(staffAccessCookie, tokens.accessToken, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: tokens.accessTokenExpiresInSeconds });
  response.cookies.set(staffRefreshCookie, tokens.refreshToken, { httpOnly: true, sameSite: "lax", secure, path: "/api/auth/staff/refresh", maxAge: 7 * 24 * 60 * 60 });
}

export function clearStaffCookies(response: NextResponse): void {
  response.cookies.set(staffAccessCookie, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(staffRefreshCookie, "", { httpOnly: true, sameSite: "lax", path: "/api/auth/staff/refresh", maxAge: 0 });
}
