import { NextRequest, NextResponse } from 'next/server';
import { backendStaffRequest, staffAccessCookie } from '@/lib/bff/staff-auth';
import { isUtcInstant } from '@/lib/utc-instant';

const headers = { 'cache-control': 'private, no-store' };
const policy = 'STAFF_PRE_ARRIVAL_TEN_PERCENT_V1';
const conflicts = new Set(['ALREADY_CANCELLED', 'STAY_NOT_RESERVED', 'UNSUPPORTED_RESERVATION',
  'FINANCIAL_REVIEW_REQUIRED', 'STALE_PREVIEW', 'IDEMPOTENCY_KEY_REUSED']);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('INVALID_CANCELLATION_RESPONSE');
  return v as Record<string, unknown>;
}
function assert(v: unknown): asserts v { if (!v) throw new Error('INVALID_CANCELLATION_RESPONSE'); }
function financial(value: unknown) {
  const f = object(value);
  const fields = ['accommodationMinor', 'paidMinor', 'penaltyMinor', 'balanceAfterMinor', 'dueMinor', 'creditMinor'] as const;
  assert(uuid(f.folioId) && typeof f.currency === 'string' && /^[A-Z]{3}$/.test(f.currency)
    && fields.every(k => Number.isSafeInteger(f[k])));
  const a = f.accommodationMinor as number, paid = f.paidMinor as number, penalty = f.penaltyMinor as number;
  const balance = f.balanceAfterMinor as number;
  assert(a > 0 && paid >= 0 && penalty >= 0 && penalty <= a && balance === penalty - paid
    && f.dueMinor === Math.max(0, balance) && f.creditMinor === Math.max(0, -balance));
  return { folioId: f.folioId, currency: f.currency, accommodationMinor: a, paidMinor: paid, penaltyMinor: penalty,
    balanceAfterMinor: balance, dueMinor: f.dueMinor, creditMinor: f.creditMinor };
}
function receipt(value: unknown, propertyId: string, reservationId: string) {
  const r = object(value);
  assert(r.propertyId === propertyId && r.reservationId === reservationId && uuid(r.operationId)
    && r.status === 'CANCELLED' && r.policyCode === policy && isUtcInstant(r.completedAt)
    && Number.isSafeInteger(r.staysCancelled) && (r.staysCancelled as number) > 0
    && typeof r.reason === 'string' && r.reason.trim().length > 0 && r.reason.length <= 255 && !r.reason.includes('\0'));
  return { operationId: r.operationId, propertyId, reservationId, status: 'CANCELLED', policyCode: policy,
    completedAt: r.completedAt, staysCancelled: r.staysCancelled, financial: financial(r.financial), reason: r.reason };
}
function preview(value: unknown, propertyId: string, reservationId: string) {
  const p = object(value);
  assert(p.propertyId === propertyId && p.reservationId === reservationId && p.policyCode === policy && p.penaltyPercent === 10
    && typeof p.canCancel === 'boolean' && typeof p.confirmationCode === 'string' && p.confirmationCode.length > 0
    && Number.isSafeInteger(p.stayCount) && (p.stayCount as number) >= 0);
  assert(p.canCancel ? (p.stayCount as number) > 0 && p.blockingCode === null
    && typeof p.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(p.fingerprint) && p.financial !== null && p.completed === null
    : typeof p.blockingCode === 'string' && conflicts.has(p.blockingCode) && p.fingerprint === null && p.financial === null);
  assert(p.completed === null || !p.canCancel && p.blockingCode === 'ALREADY_CANCELLED');
  return { propertyId, reservationId, confirmationCode: p.confirmationCode, policyCode: policy, penaltyPercent: 10,
    canCancel: p.canCancel, blockingCode: p.blockingCode, fingerprint: p.fingerprint, stayCount: p.stayCount,
    financial: p.financial === null ? null : financial(p.financial), completed: p.completed === null ? null : receipt(p.completed, propertyId, reservationId) };
}
async function boundedBody(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('EMPTY_BODY');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const chunk = await reader.read(); if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > 4096) { await reader.cancel(); throw new Error('BODY_TOO_LARGE'); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return object(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
}

/** Only the Staff cookie can authenticate this fixed transport. No browser-supplied actor or financial amounts. */
export async function proxyCancellation(request: NextRequest, reservationId: string, action: 'cancellation-preview' | 'cancellation') {
  const fail = (status: number, code?: string) => NextResponse.json({ error: 'Cancellation unavailable', ...(code ? { code } : {}) }, { status, headers });
  const token = request.cookies.get(staffAccessCookie)?.value;
  if (!token) return fail(401);
  const post = action === 'cancellation';
  if (post && request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
  const propertyId = request.nextUrl.searchParams.get('propertyId')?.toLowerCase();
  reservationId = reservationId.toLowerCase();
  if (request.method !== (post ? 'POST' : 'GET') || !uuid(propertyId) || !uuid(reservationId) || request.nextUrl.searchParams.size !== 1) return fail(400);
  const key = request.headers.get('idempotency-key');
  let body: { expectedFingerprint: string; reason: string } | undefined;
  if (post) {
    if (!key || key.length < 8 || key.length > 128 || key.trim() !== key || /\p{Cc}/u.test(key)
      || !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) return fail(400);
    try {
      const b = await boundedBody(request);
      if (Object.keys(b).length !== 2 || Object.keys(b).some(k => !['expectedFingerprint', 'reason'].includes(k))
        || typeof b.expectedFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(b.expectedFingerprint)
        || typeof b.reason !== 'string' || !b.reason.trim() || b.reason.length > 255 || b.reason.includes('\0')) return fail(400);
      body = { expectedFingerprint: b.expectedFingerprint, reason: b.reason.trim() };
    } catch { return fail(400); }
  }
  try {
    const upstream = await backendStaffRequest(`/api/v1/reservations/${reservationId}/${action}?${new URLSearchParams({ propertyId })}`, {
      method: post ? 'POST' : 'GET', signal: request.signal,
      headers: { authorization: `Bearer ${token}`, ...(post ? { 'content-type': 'application/json', 'idempotency-key': key! } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (upstream.status !== 200) {
      let code: string | undefined;
      if (upstream.status === 409) {
        try { const problem = object(await upstream.json()); if (typeof problem.code === 'string' && conflicts.has(problem.code)) code = problem.code; } catch { /* sanitized */ }
      }
      return fail([400, 401, 403, 404, 409].includes(upstream.status) ? upstream.status : 503, code);
    }
    const value: unknown = await upstream.json();
    return NextResponse.json(post ? receipt(value, propertyId, reservationId) : preview(value, propertyId, reservationId), { headers });
  } catch { return fail(503); }
}
