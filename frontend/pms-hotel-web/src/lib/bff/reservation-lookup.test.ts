import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
let api: typeof import('./reservation-lookup');
const upstream = vi.fn<typeof fetch>();
const id = '11111111-1111-4111-8111-111111111111', stayId = '22222222-2222-4222-8222-222222222222';
beforeAll(async () => { vi.resetModules(); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080'); api = await import('./reservation-lookup'); });
beforeEach(() => { vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); vi.stubGlobal('fetch', upstream); upstream.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
function req(value: unknown, origin = 'http://localhost:3001') {
  return new NextRequest('http://localhost:3001/api/public/reservation-lookup/search', { method: 'POST',
    headers: { origin, 'Content-Type': 'application/json', cookie: 'pms_staff_access=staff-only; pms_guest_access=guest-only; pms_reservation_lookup_access=old-grant' },
    body: typeof value === 'string' ? value : JSON.stringify(value) });
}
const input = { email: ' guest@example.test ', confirmationCode: ' HB-2026-08421 ' };
const payload = {
  stays: [{ reservationId: id, stayId, confirmationCode: 'HB-2026-08421', propertyName: 'Hotel', reservationStatus: 'CONFIRMED', arrival: '2036-01-01', departure: '2036-01-03', roomCode: null, status: 'RESERVED', notes: 'secret' }],
  details: [{ id: stayId, reservationId: id, roomType: { id, name: 'Deluxe' }, room: null, arrival: '2036-01-01', departure: '2036-01-03', status: 'RESERVED', document: 'never' }],
  overview: { createdAt: '2026-10-28T12:00:00Z', source: 'WEB_DIRECTA', currency: 'GTQ', confirmedTotalMinor: 65000, notes: 'secret' },
  accommodations: [{ stayId, roomTypeCode: 'CLASSIC', timezone: 'America/Guatemala', guestName: 'never' }],
  accessToken: 'private-token',
};
it('sends both credentials together in POST, without Guest/Staff tokens, query strings or OTP', async () => {
  upstream.mockResolvedValue(Response.json(payload));
  const response = await api.searchLookup(req(input));
  expect(response.status).toBe(200);
  const [url, init] = upstream.mock.calls[0];
  expect(url).toBe('http://backend:8080/api/v1/public/reservation-lookup/search');
  expect(init?.method).toBe('POST'); expect(init?.cache).toBe('no-store');
  expect(JSON.parse(init?.body as string)).toEqual({ email: input.email.trim(), confirmationCode: input.confirmationCode.trim() });
  expect(new Headers(init?.headers).get('authorization')).toBeNull();
  expect(new Headers(init?.headers).get('cookie')).toBeNull();
});
it('allowlists public fields and retires only obsolete lookup cookies', async () => {
  upstream.mockResolvedValue(Response.json(payload));
  const response = await api.searchLookup(req(input));
  expect(await response.text()).not.toMatch(/secret|never|private-token|document|notes|accessToken/);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(response.cookies.getAll().map(cookie => cookie.name)).toEqual(['pms_reservation_lookup_access', 'pms_reservation_lookup_pending']);
  expect(response.cookies.getAll().every(cookie => cookie.maxAge === 0)).toBe(true);
});
it('rejects incomplete, invalid, oversized and extra-field input before calling Backend', async () => {
  for (const body of [{}, [], null, { email: 'x@example.test' }, { confirmationCode: 'ABC123' },
    { ...input, email: 'bad' }, { ...input, confirmationCode: 'bad/' }, { ...input, accountId: id }, ' '.repeat(2049)]) {
    expect((await api.searchLookup(req(body))).status).toBe(400);
  }
  expect(upstream).not.toHaveBeenCalled();
});
it('rejects foreign origins even when account cookies exist', async () => {
  expect((await api.searchLookup(req(input, 'https://attacker.test'))).status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();
});
it('keeps missing pairs and exhausted budgets generic and preserves account cookies', async () => {
  for (const status of [404, 429, 503]) {
    upstream.mockResolvedValue(Response.json({ detail: 'private reason' }, { status }));
    const response = await api.searchLookup(req(input));
    expect(response.status).toBe(status); expect(await response.text()).not.toContain('private');
    expect(response.cookies.getAll()).toEqual([]);
  }
});
it('fails safely on malformed upstream payloads, unexpected status and network failure', async () => {
  upstream.mockResolvedValue(Response.json({ stays: [] }));
  expect((await api.searchLookup(req(input))).status).toBe(503);
  upstream.mockResolvedValue(Response.json({}, { status: 500 }));
  expect((await api.searchLookup(req(input))).status).toBe(503);
  upstream.mockRejectedValue(new Error('private upstream exception'));
  const failure = await api.searchLookup(req(input));
  expect(failure.status).toBe(503); expect(await failure.text()).not.toContain('private');
});
