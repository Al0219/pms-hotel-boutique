import { NextRequest, NextResponse } from 'next/server';
import { backendGuestRequest, guestAccessCookie } from '@/lib/bff/guest-auth';

const headers = { 'Cache-Control': 'no-store' };

/** Anonymous booking remains unchanged; an optional Guest cookie only authorizes post-confirmation reconciliation. */
export async function POST(request: Request) {
  const guestToken = new NextRequest(request.url, { headers: request.headers }).cookies.get(guestAccessCookie)?.value;
  const upstreamHeaders = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
  const key = request.headers.get('Idempotency-Key');
  if (key !== null) upstreamHeaders.set('Idempotency-Key', key);
  let body: string;
  try { body = await request.text(); }
  catch { return NextResponse.json({ code: 'INVALID_REQUEST' }, { status: 400, headers }); }
  try {
    // Preserve the payload verbatim, including invalid fields for J6 to reject.
    const upstream = await backendGuestRequest('/api/v1/public/bookings', { method: 'POST', headers: upstreamHeaders, body, signal: request.signal });
    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json({ code: data.code }, { status: upstream.status, headers });
    }
    const confirmed = NextResponse.json({
      reservationId: data.reservationId, confirmationCode: data.confirmationCode, status: data.status,
      currency: data.currency, totalMinor: data.totalMinor,
      payment: { provider: data.payment.provider, status: data.payment.status, reference: data.payment.reference },
      stays: data.stays.map((stay: Record<string, unknown>) => ({
        reservationStayId: stay.reservationStayId, roomTypeId: stay.roomTypeId, roomId: stay.roomId,
        arrival: stay.arrival, departure: stay.departure,
      })),
    }, { status: upstream.status, headers });
    if (guestToken) {
      try {
        // Independent operation: no browser IDs, no new booking/payment, and never replace a confirmed 201 with a link error.
        await backendGuestRequest('/api/v1/guest-auth/account/reservations/reconcile', {
          method: 'POST', headers: { authorization: `Bearer ${guestToken}` }, signal: AbortSignal.timeout(5000),
        });
      } catch { /* The authenticated reservations query can safely recover this later. */ }
    }
    return confirmed;
  } catch {
    // The Backend may already have committed. Never report this as BOOKING_FAILED.
    return NextResponse.json({ code: 'UPSTREAM_RESULT_UNKNOWN' }, { status: 502, headers });
  }
}
