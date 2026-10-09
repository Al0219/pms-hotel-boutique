import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';

const headers = { 'cache-control': 'private, no-store' };
const uuidPattern = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function text(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('INVALID_INVENTORY');
  return value;
}
function uuid(value: unknown): string {
  const result = text(value);
  if (!uuidPattern.test(result)) throw new Error('INVALID_INVENTORY');
  return result;
}
function timestamp(value: unknown): string {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}T.*Z$/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error('INVALID_INVENTORY');
  return result;
}

function projectInventory(value: unknown, propertyId: string, resource: 'rooms' | 'room-types') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_INVENTORY');
  const r = value as Record<string, unknown>;
  if (r.propertyId !== propertyId) throw new Error('INVALID_INVENTORY_SCOPE');
  const createdAt = timestamp(r.createdAt), updatedAt = timestamp(r.updatedAt);
  if (Date.parse(updatedAt) < Date.parse(createdAt)) throw new Error('INVALID_INVENTORY');
  const common = { id: uuid(r.id), propertyId, code: text(r.code), createdAt, updatedAt };
  return resource === 'rooms' ? { ...common, roomTypeId: uuid(r.roomTypeId) } : { ...common, name: text(r.name) };
}

/** Only the approved C/R/U fields; no operation, classification changes or deletion. */
export async function mutateStaffInventory(request: NextRequest, resource: 'rooms' | 'room-types', id?: string) {
  const failure = (status: number) => NextResponse.json({ error: 'Inventory write unavailable' }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return failure(401);
  const publicOrigin = new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin;
  if (request.headers.get('origin') !== publicOrigin) return failure(403);
  const propertyId = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  if (!propertyId || !uuidPattern.test(propertyId) || request.nextUrl.searchParams.size !== 1
    || (id !== undefined && !uuidPattern.test(id)) || !['POST', 'PATCH'].includes(request.method)
    || (request.method === 'PATCH') !== (id !== undefined)) return failure(400);
  let body: Record<string, unknown>;
  try {
    if (!request.headers.get('content-type')?.startsWith('application/json')) return failure(400);
    const value: unknown = await request.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return failure(400);
    body = value as Record<string, unknown>;
    const allowed = resource === 'rooms' ? id ? ['code'] : ['code', 'roomTypeId'] : ['code', 'name'];
    const keys = Object.keys(body);
    if (!keys.length || keys.some(key => !allowed.includes(key))) return failure(400);
    if (!id && allowed.some(key => !(key in body))) return failure(400);
    if (resource === 'rooms' && id && !('code' in body)) return failure(400);
    for (const key of keys) {
      if (key === 'roomTypeId') uuid(body[key]);
      else if (text(body[key]).length > (key === 'name' ? 160 : 64)) return failure(400);
    }
  } catch { return failure(400); }
  try {
    const upstream = await backendStaffRequest(`/api/v1/properties/${propertyId}/${resource}${id ? `/${id}` : ''}`, {
      method: request.method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: request.signal,
    });
    if (!upstream.ok) return failure([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503);
    if (upstream.status !== (id ? 200 : 201)) return failure(503);
    const result = projectInventory(await upstream.json(), propertyId, resource);
    if (id && result.id !== id) return failure(503);
    return NextResponse.json(result, { status: id ? 200 : 201, headers });
  } catch { return failure(503); }
}

/** Read-only allowlist of the existing Inventory contracts; authorization remains in Backend. */
export async function proxyStaffInventory(request: NextRequest, resource: 'rooms' | 'room-types') {
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return NextResponse.json({ error: 'Staff session required' }, { status: 401, headers });
  const params = request.nextUrl.searchParams;
  const propertyId = params.get('propertyId')?.toLowerCase();
  if (!propertyId || !uuidPattern.test(propertyId) || params.size !== 1)
    return NextResponse.json({ error: 'Invalid inventory parameters' }, { status: 400, headers });
  try {
    const upstream = await backendStaffRequest(`/api/v1/properties/${propertyId}/${resource}`, {
      method: 'GET', headers: { authorization: `Bearer ${token}` }, signal: request.signal,
    });
    if (!upstream.ok) {
      const status = [400, 401, 403, 404].includes(upstream.status) ? upstream.status : 503;
      return NextResponse.json({ error: 'Inventory read unavailable' }, { status, headers });
    }
    const data: unknown = await upstream.json();
    if (!Array.isArray(data)) throw new Error('INVALID_INVENTORY');
    const ids = new Set<string>();
    const projected = data.map((item: unknown) => {
      const result = projectInventory(item, propertyId, resource);
      if (ids.has(result.id)) throw new Error('DUPLICATE_INVENTORY');
      ids.add(result.id);
      return result;
    });
    return NextResponse.json(projected, { headers });
  } catch {
    return NextResponse.json({ error: 'Inventory read unavailable' }, { status: 503, headers });
  }
}
