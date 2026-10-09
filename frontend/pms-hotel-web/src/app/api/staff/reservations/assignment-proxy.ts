import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';

const headers = { 'cache-control': 'private, no-store' };
const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_ASSIGNMENT');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_ASSIGNMENT');
  return value;
}
function uuid(value: unknown): string {
  const result = text(value);
  if (!uuidPattern.test(result)) throw new Error('INVALID_ASSIGNMENT');
  return result;
}

export async function proxyRoomAssignment(request: NextRequest, reservationId: string, stayId: string) {
  const fail = (status: number) => NextResponse.json({ error: 'Room assignment unavailable' }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  const write = request.method === 'PUT';
  if (write && request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
  const propertyId = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  reservationId = reservationId.toLowerCase(); stayId = stayId.toLowerCase();
  if (!propertyId || ![propertyId, reservationId, stayId].every(id => uuidPattern.test(id))
    || request.nextUrl.searchParams.size !== 1 || !['GET', 'PUT'].includes(request.method)) return fail(400);
  let roomId: string | undefined;
  if (write) {
    try {
      if (!request.headers.get('content-type')?.startsWith('application/json')) return fail(400);
      const body = object(await request.json());
      if (Object.keys(body).length !== 1) return fail(400);
      roomId = uuid(body.room_id).toLowerCase();
    } catch { return fail(400); }
  }
  try {
    const upstream = await backendStaffRequest(`/api/v1/reservations/${reservationId}/stays/${stayId}/room-assignment?${new URLSearchParams({ propertyId })}`, {
      method: request.method, headers: { authorization: `Bearer ${token}`, ...(write ? { 'content-type': 'application/json' } : {}) },
      ...(write ? { body: JSON.stringify({ room_id: roomId }) } : {}), signal: request.signal,
    });
    if (upstream.status !== 200) return fail([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503);
    const r = object(await upstream.json());
    if (r.property_id !== propertyId || r.reservation_id !== reservationId || r.stay_id !== stayId) throw new Error('INVALID_SCOPE');
    const scope = { property_id: propertyId, reservation_id: reservationId, stay_id: stayId };
    if (write) {
      if (r.room_id !== roomId) throw new Error('INVALID_ROOM');
      return NextResponse.json({ ...scope, room_id: uuid(r.room_id), number: text(r.number) }, { headers });
    }
    if (typeof r.can_assign !== 'boolean' || !Array.isArray(r.rooms)
      || !/^\d{4}-\d{2}-\d{2}$/.test(text(r.arrival)) || !/^\d{4}-\d{2}-\d{2}$/.test(text(r.departure))
      || text(r.arrival) >= text(r.departure)) throw new Error('INVALID_PREVIEW');
    const ids = new Set<string>();
    const rooms = r.rooms.map(value => {
      const room = object(value), id = uuid(room.room_id);
      if (!r.can_assign || room.operational_status !== 'ACTIVE' || room.selectable !== true || ids.has(id)) throw new Error('INVALID_CANDIDATE');
      ids.add(id);
      return { room_id: id, number: text(room.number), floor: null, operational_status: 'ACTIVE', selectable: true, reason: null };
    });
    return NextResponse.json({ ...scope, arrival: r.arrival, departure: r.departure, room_type_id: uuid(r.room_type_id),
      room_type: text(r.room_type), can_assign: r.can_assign, reason: r.reason === null ? null : text(r.reason), rooms }, { headers });
  } catch { return fail(503); }
}
