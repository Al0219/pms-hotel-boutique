import { NextRequest, NextResponse } from 'next/server';
import { backendGuestRequest, guestAccessCookie } from '@/lib/bff/guest-auth';
import { isGuestReservationUuid, mapRealLinkChallenge } from '@/modules/account';
const headers = { 'cache-control': 'private, no-store' };
async function boundedBody(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.body) throw new Error('INVALID_JSON');
  const reader = request.body.getReader(), parts: Uint8Array[] = []; let length = 0;
  try {
    for (;;) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; if (length > 2048) { await reader.cancel(); throw new Error('INVALID_JSON'); } parts.push(part.value); }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_JSON');
  return value as Record<string, unknown>;
}
export async function guestReservationLink(request: NextRequest, verify: boolean) {
  const fail = (status: number) => NextResponse.json({ error: 'Guest reservation link unavailable' }, { status, headers });
  const token = request.cookies.get(guestAccessCookie)?.value;
  if (!token) return fail(401);
  if (request.headers.get('origin') !== new URL(process.env.PMS_WEB_PUBLIC_URL ?? 'http://localhost:3001').origin) return fail(403);
  if (request.nextUrl.searchParams.size || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return fail(400);
  let input: Record<string, unknown>;
  try {
    input = await boundedBody(request);
    const keys = verify ? ['requestId', 'otp'] : ['confirmationCode'];
    if (Object.keys(input).length !== keys.length || Object.keys(input).some(k => !keys.includes(k))) return fail(400);
    if (verify ? !isGuestReservationUuid(input.requestId) || typeof input.otp !== 'string' || !/^[0-9]{8}$/.test(input.otp)
      : typeof input.confirmationCode !== 'string' || !input.confirmationCode.trim() || input.confirmationCode.length > 16 || /\p{Cc}/u.test(input.confirmationCode)) return fail(400);
  } catch { return fail(400); }
  try {
    const upstream = await backendGuestRequest('/api/v1/guest-auth/reservation-links/' + (verify ? 'verify' : 'challenges'), {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(input), signal: request.signal,
    });
    if (upstream.status !== (verify ? 204 : 202)) return fail([400,401,403,422,429].includes(upstream.status) ? upstream.status : 503);
    if (verify) return new NextResponse(null, { status: 204, headers });
    const challenge = mapRealLinkChallenge(await upstream.json());
    return NextResponse.json({ requestId: challenge.id }, { status: 202, headers });
  } catch { return fail(503); }
}
