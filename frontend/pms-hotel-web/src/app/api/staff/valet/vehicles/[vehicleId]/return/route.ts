import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { projectPersistedVehicles } from '@/modules/parking-valet';

const headers = { 'cache-control': 'private, no-store' };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export async function POST(request: NextRequest, context: { params: Promise<{ vehicleId: string }> }) {
  const fail = (status: number) => NextResponse.json({ error: 'Valet transition unavailable' }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
  const property = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  const id = (await context.params).vehicleId.toLowerCase();
  if (!property || !uuid.test(property) || !uuid.test(id) || request.nextUrl.searchParams.size !== 1) return fail(400);
  try {
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return fail(400);
    let body: unknown;
    try { body = await request.json(); } catch { return fail(400); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400);
    const row = body as Record<string, unknown>;
    if (Object.keys(row).length !== 1 || Object.keys(row).some(k => !['expectedUpdatedAt'].includes(k))
      || typeof row.expectedUpdatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(row.expectedUpdatedAt) || !Number.isFinite(Date.parse(row.expectedUpdatedAt))) return fail(400);
    const upstream = await backendStaffRequest(`/api/v1/properties/${property}/valet-vehicles/${id}/return`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expectedUpdatedAt: row.expectedUpdatedAt }), signal: request.signal,
    });
    if (upstream.status !== 200) return fail([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503);
    const saved=projectPersistedVehicles([await upstream.json()],property)[0];
    if(saved.id!==id||saved.location!=='PARKED')return fail(503);
    return NextResponse.json(saved,{headers});
  } catch { return fail(503); }
}
