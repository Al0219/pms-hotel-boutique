import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { mapStaffBookingQuote, mapStaffBookingReceipt } from '@/modules/reservations';

const headers = { 'cache-control': 'private, no-store' };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const day = (v: unknown): v is string => typeof v === 'string' && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)
  && Number.isFinite(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10) === v;
const positive = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('INVALID_BOOKING');
  return v as Record<string, unknown>;
};
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && Object.keys(v).every(key => keys.includes(key));
const conflicts = new Set(['NO_AVAILABILITY', 'PRICE_CHANGED', 'RATE_CONFIGURATION_UNAVAILABLE', 'IDEMPOTENCY_KEY_REUSED']);

export async function proxyStaffBooking(request: NextRequest, quote: boolean) {
  const fail = (status: number, code?: string) => NextResponse.json({ error: 'Staff booking unavailable', ...(code ? { code } : {}) }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  const params = request.nextUrl.searchParams;
  const propertyId = params.get('propertyId')?.toLowerCase();
  const keys = quote ? ['propertyId', 'arrival', 'departure', 'rooms'] : ['propertyId'];
  if (!uuid(propertyId) || params.size !== keys.length || keys.some(key => params.getAll(key).length !== 1)
    || request.method !== (quote ? 'GET' : 'POST')) return fail(400);
  let body: Record<string, unknown> | undefined;
  const key = request.headers.get('idempotency-key');
  const search = { arrival: params.get('arrival') ?? '', departure: params.get('departure') ?? '', rooms: Number(params.get('rooms')) };
  if (quote) {
    if (!day(search.arrival) || !day(search.departure) || search.departure <= search.arrival || !positive(search.rooms)) return fail(400);
  } else {
    if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
    if (!key || Array.from(key).length < 8 || Array.from(key).length > 128 || /\p{Cc}/u.test(key)
      || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return fail(400);
    try {
      body = object(await request.json());
      const guest = object(body.guest);
      if (!exact(body, ['arrival','departure','rooms','roomTypeId','ratePlanId','currency','clientTotalMinor','guest','notes'])
        || !exact(guest, ['firstName','lastName','email','phone'])
        || !day(body.arrival) || !day(body.departure) || body.departure <= body.arrival || !positive(body.rooms)
        || !uuid(body.roomTypeId) || typeof body.ratePlanId !== 'string' || !body.ratePlanId.trim() || body.ratePlanId.length > 64
        || body.currency !== 'GTQ' || !positive(body.clientTotalMinor)
        || !['firstName','lastName'].every(k => typeof guest[k] === 'string' && guest[k].trim() && guest[k].length <= 80)
        || typeof guest.email !== 'string' || guest.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email)
        || typeof guest.phone !== 'string' || !/^\+?[0-9 ()-]{7,32}$/.test(guest.phone) || guest.phone.replace(/\D/g, '').length < 7
        || !(body.notes === null || typeof body.notes === 'string' && body.notes.length <= 300)
        || Object.values(guest).some(value => typeof value === 'string' && value.includes('\0'))
        || typeof body.notes === 'string' && body.notes.includes('\0')) return fail(400);
    } catch { return fail(400); }
  }
  try {
    const query = quote ? new URLSearchParams({ propertyId, arrival: search.arrival, departure: search.departure, rooms: String(search.rooms) }) : new URLSearchParams({ propertyId });
    const upstream = await backendStaffRequest(`/api/v1/reservations${quote ? '/creation-options' : ''}?${query}`, {
      method: quote ? 'GET' : 'POST', headers: { authorization: `Bearer ${token}`, ...(!quote ? { 'content-type': 'application/json', 'idempotency-key': key! } : {}) },
      ...(!quote ? { body: JSON.stringify(body) } : {}), signal: request.signal,
    });
    if (upstream.status !== (quote ? 200 : 201)) {
      let code: string | undefined;
      if (upstream.status === 409) {
        try { const p = object(await upstream.json()); if (typeof p.code === 'string' && conflicts.has(p.code)) code = p.code; } catch { /* sanitized conflict */ }
      }
      return fail([400,401,403,404,409].includes(upstream.status) ? upstream.status : 503, code);
    }
    if (upstream.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return fail(503);
    const value: unknown = await upstream.json();
    const projected = quote ? mapStaffBookingQuote(value, propertyId, search) : mapStaffBookingReceipt(value, propertyId);
    return NextResponse.json(projected, { status: quote ? 200 : 201, headers });
  } catch { return fail(503); }
}
