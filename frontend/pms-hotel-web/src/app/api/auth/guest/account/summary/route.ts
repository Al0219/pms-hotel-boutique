import { NextRequest, NextResponse } from "next/server";
import { backendGuestRequest, guestAccessCookie } from "@/lib/bff/guest-auth";

function text(value: unknown): boolean { return typeof value === "string" && Boolean(value.trim()); }

/** Own-account read only; ignore all client identifiers and keep credentials server-side. */
export async function GET(request: NextRequest) {
  const headers = { "cache-control": "private, no-store" };
  const token = request.cookies.get(guestAccessCookie)?.value;
  if (!token) return NextResponse.json({ error: "Guest session required" }, { status: 401, headers });
  try {
    const upstream = await backendGuestRequest("/api/v1/guest-auth/account/summary", {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
    });
    if (upstream.status === 401) return NextResponse.json({ error: "Guest session required" }, { status: 401, headers });
    if (!upstream.ok) return NextResponse.json({ error: "Account summary is unavailable" }, { status: 503, headers });
    const data = await upstream.json();
    if (!data || !text(data.guestAccountId) || !text(data.email) || typeof data.active !== "boolean"
        || !Array.isArray(data.profiles) || !Number.isSafeInteger(data.linkedReservationsCount)
        || data.linkedReservationsCount < 0 || data.upcomingStay === undefined) throw new Error("INVALID_ACCOUNT_SUMMARY");
    // Whitelist the approved response, including nested fields, rather than forwarding arbitrary JSON.
    const profiles = data.profiles.map((p: Record<string, unknown>) => {
      if (!p || !text(p.profileId) || !text(p.firstName) || !text(p.lastName)
          || !["ACTIVE", "INACTIVE"].includes(p.status as string)
          || (p.preferredLanguage !== null && typeof p.preferredLanguage !== "string")) throw new Error("INVALID_ACCOUNT_PROFILE");
      return { profileId: p.profileId, firstName: p.firstName, lastName: p.lastName,
        preferredLanguage: p.preferredLanguage, status: p.status };
    });
    const stay = data.upcomingStay;
    if (stay !== null && (!text(stay.reservationId) || !text(stay.stayId) || !text(stay.confirmationCode)
        || !text(stay.arrival) || !text(stay.departure))) throw new Error("INVALID_UPCOMING_STAY");
    return NextResponse.json({ guestAccountId: data.guestAccountId, email: data.email, active: data.active,
      profiles, linkedReservationsCount: data.linkedReservationsCount,
      upcomingStay: stay === null ? null : { reservationId: stay.reservationId, stayId: stay.stayId,
        confirmationCode: stay.confirmationCode, arrival: stay.arrival, departure: stay.departure },
    }, { headers });
  } catch {
    return NextResponse.json({ error: "Account summary is unavailable" }, { status: 503, headers });
  }
}
