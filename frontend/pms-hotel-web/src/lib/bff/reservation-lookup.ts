import { NextRequest, NextResponse } from 'next/server';
import { backendGuestRequest } from './guest-auth';

function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'private, no-store' } });
}
function failure(status: number) { return json({ error: 'RESERVATION_LOOKUP_UNAVAILABLE' }, status); }

async function body(request: NextRequest): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader || !request.headers.get('content-type')?.startsWith('application/json')) throw new Error('INVALID_BODY');
  let size = 0; const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const result = await reader.read(); if (result.done) break;
      size += result.value.byteLength;
      if (size > 2048) { await reader.cancel(); throw new Error('INVALID_BODY'); }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  const keys = ['email', 'confirmationCode'];
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(k => !keys.includes(k)) || keys.some(k => !(k in value))) throw new Error('INVALID_BODY');
  return value as Record<string, unknown>;
}

export async function searchLookup(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL || 'http://localhost:3001').origin) return failure(403);
  let input;
  try { input = await body(request); } catch { return failure(400); }
  if (typeof input.email !== 'string' || input.email.trim().length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()) ||
      typeof input.confirmationCode !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]{5,39}$/.test(input.confirmationCode.trim())) return failure(400);
  try {
    const upstream = await backendGuestRequest('/api/v1/public/reservation-lookup/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: input.email.trim(), confirmationCode: input.confirmationCode.trim() }),
    });
    if (upstream.status !== 200) return failure([400, 404, 429, 503].includes(upstream.status) ? upstream.status : 503);
    const data = await upstream.json();
    if (!Array.isArray(data.stays) || !Array.isArray(data.details) || !Array.isArray(data.accommodations) || !data.overview) return failure(503);
    // A bounded public summary; no PII, ledger, payment references or internal notes.
    const response = json({
      overview: { createdAt: data.overview.createdAt, source: data.overview.source, currency: data.overview.currency, confirmedTotalMinor: data.overview.confirmedTotalMinor },
      accommodations: data.accommodations.map((row: { stayId: string; roomTypeCode: string; timezone: string }) => ({ stayId: row.stayId, roomTypeCode: row.roomTypeCode, timezone: row.timezone })),
      stays: data.stays.map((row: Record<string, unknown>) => ({
        reservationId: row.reservationId, stayId: row.stayId, confirmationCode: row.confirmationCode,
        propertyName: row.propertyName, reservationStatus: row.reservationStatus,
        arrival: row.arrival, departure: row.departure, roomCode: row.roomCode, status: row.status,
      })),
      details: data.details.map((row: { id: string; reservationId: string; roomType?: { id: string; name: string }; room: null | { id: string; code: string }; arrival: string; departure: string; status: string }) => ({
        id: row.id, reservationId: row.reservationId, roomType: { id: row.roomType?.id, name: row.roomType?.name },
        room: row.room === null ? null : { id: row.room?.id, code: row.room?.code },
        arrival: row.arrival, departure: row.departure, status: row.status,
      })),
    });
    // Retire only the previous lookup cookies, never Guest/Staff credentials.
    for (const name of ['pms_reservation_lookup_access', 'pms_reservation_lookup_pending']) {
      response.cookies.set(name, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    }
    return response;
  } catch { return failure(503); }
}
