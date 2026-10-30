import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { isUtcInstant } from '@/lib/utc-instant';

const headers = { 'cache-control': 'private, no-store' };
const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const conflicts = new Set(['STALE_STAY', 'RESERVATION_NOT_CONFIRMED', 'OUTSIDE_ARRIVAL_DATES',
  'ROOM_NOT_ASSIGNED', 'ROOM_TYPE_MISMATCH', 'ROOM_UNAVAILABLE', 'ROOM_BLOCKED',
  'ROOM_NOT_INSPECTED', 'OUTSTANDING_BALANCE', 'BALANCE_UNVERIFIABLE', 'PENDING_BILLABLE_ORDERS', 'UNSUPPORTED_FINANCIAL_SCENARIO', 'IDEMPOTENCY_KEY_REUSED']);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_LIFECYCLE');
  return value as Record<string, unknown>;
}

/** Fixed Staff transport; upstream messages and arbitrary fields never reach the browser. */
export async function proxyStayLifecycle(request: NextRequest, reservationId: string, stayId: string, action: 'check-in' | 'check-out') {
  const fail = (status: number, code?: string) => NextResponse.json({ error: 'Stay operation unavailable', ...(code ? { code } : {}) }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
  const propertyId = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  reservationId = reservationId.toLowerCase(); stayId = stayId.toLowerCase();
  const key = request.headers.get('idempotency-key');
  if (request.method !== 'POST' || !uuid(propertyId) || !uuid(reservationId) || !uuid(stayId)
    || request.nextUrl.searchParams.size !== 1 || !key || key.length < 8 || key.length > 128 || /[\p{Cc}]/u.test(key)
    || !request.headers.get('content-type')?.startsWith('application/json')) return fail(400);
  let body: Record<string, unknown>;
  try {
    body = object(await request.json());
    if (Object.keys(body).some(k => !['expectedStatus', 'expectedUpdatedAt', 'expectedRoomId'].includes(k))
      || body.expectedStatus !== (action === 'check-in' ? 'RESERVED' : 'IN_HOUSE') || !isUtcInstant(body.expectedUpdatedAt)
      || !(body.expectedRoomId === undefined || body.expectedRoomId === null || uuid(body.expectedRoomId))) return fail(400);
  } catch { return fail(400); }
  try {
    const upstream = await backendStaffRequest(`/api/v1/reservations/${reservationId}/stays/${stayId}/${action}?${new URLSearchParams({ propertyId })}`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify(body), signal: request.signal,
    });
    if (upstream.status !== 200) {
      let code: string | undefined;
      if (upstream.status === 409) {
        try { const problem = object(await upstream.json()); if (typeof problem.code === 'string' && conflicts.has(problem.code)) code = problem.code; } catch { /* sanitized generic conflict */ }
      }
      return fail([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503, code);
    }
    const r = object(await upstream.json());
    if (r.propertyId !== propertyId || r.reservationId !== reservationId || r.stayId !== stayId
      || !uuid(r.operationId) || !isUtcInstant(r.completedAt)
      || r.status !== (action === 'check-in' ? 'IN_HOUSE' : 'CHECKED_OUT')) return fail(503);
    return NextResponse.json({ operationId: r.operationId, propertyId, reservationId, stayId,
      status: r.status, completedAt: r.completedAt }, { headers });
  } catch { return fail(503); }
}
