import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { mapStaffHousekeepingBoard, mapStaffHousekeepingRoom } from '@/modules/housekeeping';

const headers = { 'cache-control': 'private, no-store' };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;
type Action = 'tracking' | 'status' | 'dnd';
export async function proxyHousekeeping(request: NextRequest, roomId?: string, action?: Action) {
  const fail = (status: number) => NextResponse.json({ error: 'Housekeeping unavailable' }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  const write = action !== undefined;
  if (write && request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
  const propertyId = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  roomId = roomId?.toLowerCase();
  if (!propertyId || !uuid.test(propertyId) || request.nextUrl.searchParams.size !== 1 || (roomId !== undefined && !uuid.test(roomId))
    || (write ? !roomId || request.method !== (action === 'tracking' ? 'POST' : 'PUT') : request.method !== 'GET')) return fail(400);
  let body: Record<string, unknown> | undefined;
  if (write) {
    try {
      if (!request.headers.get('content-type')?.split(';')[0].trim().toLowerCase().match(/^application\/json$/)) return fail(400);
      const value: unknown = await request.json();
      if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(400);
      body = value as Record<string, unknown>;
      const expectedKeys = action === 'tracking' ? [] : action === 'dnd' ? ['expectedUpdatedAt','dnd'] : ['expectedStatus','expectedUpdatedAt','toStatus','reason'];
      if (Object.keys(body).length !== expectedKeys.length || Object.keys(body).some(key => !expectedKeys.includes(key))) return fail(400);
      if (action !== 'tracking' && (typeof body.expectedUpdatedAt !== 'string' || !timestamp.test(body.expectedUpdatedAt) || !Number.isFinite(Date.parse(body.expectedUpdatedAt)))) return fail(400);
      if (action === 'dnd' && typeof body.dnd !== 'boolean') return fail(400);
      if (action === 'status') {
        if (![body.expectedStatus,body.toStatus].every(status => ['DIRTY','CLEAN','INSPECTED'].includes(String(status)))) return fail(400);
        if (body.toStatus === 'DIRTY' ? typeof body.reason !== 'string' || !body.reason.trim() || body.reason.length > 280 : body.reason !== null) return fail(400);
      }
    } catch { return fail(400); }
  }
  try {
    const upstream = await backendStaffRequest(`/api/v1/properties/${propertyId}/housekeeping/rooms${roomId ? `/${roomId}` : ''}${action ? `/${action}` : ''}`, {
      method: request.method, headers: { authorization: `Bearer ${token}`, ...(write ? { 'content-type': 'application/json' } : {}) },
      ...(write ? { body: JSON.stringify(body) } : {}), signal: request.signal,
    });
    if (upstream.status !== 200) return fail([400,401,403,404,409].includes(upstream.status) ? upstream.status : 503);
    const result: unknown = await upstream.json();
    if (!roomId) return NextResponse.json(mapStaffHousekeepingBoard(result, propertyId), { headers });
    const room = mapStaffHousekeepingRoom(result, propertyId, roomId);
    if (write && (!room.tracked || (action === 'status' && room.status !== body?.toStatus)
      || (action === 'dnd' && room.dnd !== body?.dnd))) return fail(503);
    return NextResponse.json(room, { headers });
  } catch { return fail(503); }
}
