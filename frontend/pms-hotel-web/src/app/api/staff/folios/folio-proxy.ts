import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { isFolioUuid, mapStaffFolioPage, mapStaffFolioDetail, mapStaffMovementPage, mapStaffPaymentReceipt } from '@/modules/folio';

const headers = { 'cache-control': 'private, no-store' };
const codes = new Set(['FOLIO_NOT_PAYABLE', 'FOLIO_NOT_OPEN', 'BALANCE_UNVERIFIABLE', 'PAYMENT_EXCEEDS_BALANCE', 'IDEMPOTENCY_KEY_REUSED']);
type Action = 'list' | 'detail' | 'movements' | 'payments';
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_FOLIO');
  return value as Record<string, unknown>;
}
async function boundedJson(request: NextRequest): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader(); if (!reader) throw new Error('EMPTY_BODY');
  let bytes = 0, text = ''; const decoder = new TextDecoder('utf-8', { fatal: true });
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 2048) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return object(JSON.parse(text + decoder.decode()));
  } finally { reader.releaseLock(); }
}

/** Fixed Staff cookie transport; no Guest fallback, bank processing or upstream details. */
export async function proxyStaffFolio(request: NextRequest, action: Action, rawFolioId?: string) {
  const fail = (status: number, code?: string) => NextResponse.json({ error: 'Folio operation unavailable', ...(code ? { code } : {}) }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  const params = request.nextUrl.searchParams, propertyId = params.get('propertyId')?.toLowerCase();
  const folioId = rawFolioId?.toLowerCase(), reservationId = params.get('reservationId')?.toLowerCase();
  const allowed = action === 'list' ? ['propertyId', 'reservationId', 'limit', 'cursor'] : action === 'movements' ? ['propertyId', 'limit', 'cursor'] : ['propertyId'];
  if (!isFolioUuid(propertyId) || (action === 'list' ? !isFolioUuid(reservationId) : !isFolioUuid(folioId))
    || [...params.keys()].some(key => !allowed.includes(key) || params.getAll(key).length !== 1 || !params.get(key))) return fail(400);
  if (params.has('limit') && !/^(?:[1-9]\d?|100)$/.test(params.get('limit')!)) return fail(400);
  const cursor = params.get('cursor');
  if (cursor && (cursor.length > 512 || !/^[\w-]+$/.test(cursor))) return fail(400);
  const query = new URLSearchParams();
  for (const name of ['reservationId', 'limit', 'cursor']) { const value = params.get(name); if (value !== null) query.set(name, value); }
  let body: Record<string, unknown> | undefined, key: string | null = null;
  if (action === 'payments') {
    if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
    key = request.headers.get('idempotency-key');
    if (request.method !== 'POST' || !request.headers.get('content-type')?.startsWith('application/json')
      || !key || [...key].length < 8 || [...key].length > 128 || /[\p{Cc}\p{Cs}]/u.test(key)) return fail(400);
    try {
      const raw = await boundedJson(request), amount = object(raw.amount);
      if (Object.keys(raw).length !== 2 || Object.keys(raw).some(k => !['amount', 'description'].includes(k))
        || Object.keys(amount).length !== 2 || Object.keys(amount).some(k => !['amount', 'currency'].includes(k))
        || typeof amount.amount !== 'string' || !/^[0-9]{1,19}(\.\d{1,3})?$/.test(amount.amount)
        || typeof amount.currency !== 'string' || !/^[A-Z]{3}$/.test(amount.currency)
        || typeof raw.description !== 'string' || !raw.description.trim() || raw.description.length > 255) return fail(400);
      body = { amount: { amount: amount.amount, currency: amount.currency }, description: raw.description };
    } catch { return fail(400); }
  } else if (request.method !== 'GET') return fail(405);
  const suffix = action === 'list' ? '' : `/${folioId}${action === 'detail' ? '' : `/${action}`}`;
  try {
    const upstream = await backendStaffRequest(`/api/v1/properties/${propertyId}/folios${suffix}${query.size ? `?${query}` : ''}`, {
      method: action === 'payments' ? 'POST' : 'GET', signal: request.signal,
      headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json', 'idempotency-key': key! } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (upstream.status !== (action === 'payments' ? 201 : 200)) {
      let code: string | undefined;
      if (upstream.status === 409) {
        try { const problem = object(await upstream.json()); if (typeof problem.code === 'string' && codes.has(problem.code)) code = problem.code; } catch { /* sanitized conflict */ }
      }
      return fail([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503, code);
    }
    const dto = object(await upstream.json());
    const result = action === 'list' ? mapStaffFolioPage(dto, propertyId, reservationId!)
      : action === 'detail' ? mapStaffFolioDetail(dto, propertyId, folioId!)
        : action === 'movements' ? mapStaffMovementPage(dto, propertyId, folioId!)
          : mapStaffPaymentReceipt(dto, propertyId, folioId!);
    return NextResponse.json(result, { status: action === 'payments' ? 201 : 200, headers });
  } catch { return fail(503); }
}
