import { NextRequest, NextResponse } from 'next/server';
import { backendGuestRequest, guestAccessCookie } from './guest-auth';
const headers = { 'Cache-Control': 'private, no-store' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim());
function failed(status: number) { return NextResponse.json({ error: status === 401 ? 'Guest session required' : 'Guest reservations unavailable' }, { status, headers }); }
/** Allowlist persisted Guest projections, never identities, credentials or internal fields. */
export async function guestReservationsRequest(request: NextRequest, kind: 'list' | 'reconcile' | 'stay', ids?: { reservationId: string; stayId: string }) {
  const token = request.cookies.get(guestAccessCookie)?.value;
  if (!token) return failed(401);
  if (kind === 'reconcile' && request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return failed(403);
  if (kind === 'stay' && (!ids || !uuid.test(ids.reservationId) || !uuid.test(ids.stayId))) return failed(400);
  const suffix = kind === 'reconcile' ? '/reconcile' : kind === 'stay' ? `/${ids!.reservationId}/stays/${ids!.stayId}` : '';
  try {
    const upstream = await backendGuestRequest('/api/v1/guest-auth/account/reservations' + suffix, {
      method: kind === 'reconcile' ? 'POST' : 'GET', headers: { authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: request.signal,
    });
    if (!upstream.ok) return failed([401,404].includes(upstream.status) ? upstream.status : 503);
    if (kind === 'reconcile') return upstream.status === 204 ? new NextResponse(null, { status: 204, headers }) : failed(503);
    const data = await upstream.json();
    if (kind === 'list') {
      if (!Array.isArray(data)) return failed(503);
      const rows = data.map(row => {
        if (!row || !['reservationId','stayId','confirmationCode','propertyName','reservationStatus','arrival','departure','status'].every(key => text(row[key]))
          || !(row.roomCode === null || text(row.roomCode))) throw new Error('INVALID_GUEST_STAY');
        return { reservationId: row.reservationId, stayId: row.stayId, confirmationCode: row.confirmationCode,
          propertyName: row.propertyName, reservationStatus: row.reservationStatus, arrival: row.arrival, departure: row.departure, roomCode: row.roomCode, status: row.status };
      });
      return NextResponse.json(rows, { headers });
    }
    if (!data || data.id !== ids!.stayId || data.reservationId !== ids!.reservationId || !text(data.roomType?.id) || !text(data.roomType?.name)
      || !text(data.arrival) || !text(data.departure) || !text(data.status)
      || !(data.room === null || (text(data.room?.id) && text(data.room?.code)))) return failed(503);
    return NextResponse.json({ id: data.id, reservationId: data.reservationId, roomType: { id: data.roomType.id, name: data.roomType.name },
      room: data.room === null ? null : { id: data.room.id, code: data.room.code }, arrival: data.arrival, departure: data.departure, status: data.status }, { headers });
  } catch { return failed(503); }
}
