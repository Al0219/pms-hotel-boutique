import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyStaffFolio } from './folio-proxy';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/lib/bff/staff-auth', () => ({ backendStaffRequest: mocks.backend, staffAccessCookie: 'pms_staff_access' }));
const propertyId = '11111111-1111-4111-8111-111111111111', folioId = '33333333-3333-4333-8333-333333333333';
const reservationId = '22222222-2222-4222-8222-222222222222';
const body = { amount: { amount: '25.50', currency: 'GTQ' }, description: 'Efectivo recibido' };
const receipt = { operationId: reservationId, propertyId, folioId, movementId: propertyId, amount: body.amount, completedAt: '2026-10-26T18:01:00Z' };
function request(options: { body?: unknown; cookie?: string; origin?: string; query?: string; raw?: string; type?: string; key?: string } = {}) {
  return new NextRequest(`http://localhost:3001/api/staff/folios/${folioId}/payments?${options.query ?? `propertyId=${propertyId}`}`, {
    method: 'POST', headers: { cookie: options.cookie ?? 'pms_staff_access=staff; pms_guest_access=guest', origin: options.origin ?? 'http://localhost:3001',
      'content-type': options.type ?? 'application/json', 'idempotency-key': options.key ?? 'ledger-key-0001', authorization: 'Bearer browser-untrusted' },
    body: options.raw ?? JSON.stringify(options.body ?? body),
  });
}
beforeEach(() => { mocks.backend.mockReset(); vi.stubEnv('PMS_WEB_PUBLIC_URL', 'http://localhost:3001'); });
afterEach(() => vi.unstubAllEnvs());
describe('Staff folio BFF', () => {
  it('forwards only Staff cookie/key/closed payload and sanitizes the immutable receipt', async () => {
    mocks.backend.mockResolvedValue(Response.json({ ...receipt, secret: 'hidden' }, { status: 201 }));
    const response = await proxyStaffFolio(request(), 'payments', folioId);
    expect(response.status).toBe(201); expect(await response.json()).toEqual(receipt);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.backend).toHaveBeenCalledWith(`/api/v1/properties/${propertyId}/folios/${folioId}/payments`, expect.objectContaining({
      method: 'POST', headers: { authorization: 'Bearer staff', 'content-type': 'application/json', 'idempotency-key': 'ledger-key-0001' }, body: JSON.stringify(body),
    }));
  });
  it('rejects Guest-only, foreign origin, extra fields, duplicate scope and oversized body before transport', async () => {
    for (const [options, status] of [
      [{ cookie: 'pms_guest_access=guest' }, 401], [{ origin: 'https://foreign.test' }, 403],
      [{ query: `propertyId=${propertyId}&propertyId=${propertyId}` }, 400], [{ query: 'propertyId=ALL_PROPERTIES' }, 400],
      [{ body: { ...body, actorId: reservationId } }, 400], [{ body: { ...body, amount: { ...body.amount, cvv: 'hidden' } } }, 400],
      [{ body: { ...body, amount: { amount: 25.5, currency: 'GTQ' } } }, 400], [{ type: 'text/plain' }, 400],
      [{ key: 'short' }, 400], [{ raw: '{broken' }, 400], [{ raw: ' '.repeat(2049) }, 400],
    ] as const) expect((await proxyStaffFolio(request(options), 'payments', folioId)).status).toBe(status);
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 409, 500])('sanitizes upstream %i without leaking messages', async status => {
    mocks.backend.mockResolvedValue(Response.json({ detail: 'private', code: 'UNSAFE' }, { status }));
    const response = await proxyStaffFolio(request(), 'payments', folioId);
    expect(response.status).toBe(status === 500 ? 503 : status); expect(await response.json()).toEqual({ error: 'Folio operation unavailable' });
  });
  it('preserves approved conflict codes and fails closed on malformed success', async () => {
    mocks.backend.mockResolvedValueOnce(Response.json({ code: 'PAYMENT_EXCEEDS_BALANCE', detail: 'private' }, { status: 409 }));
    expect(await (await proxyStaffFolio(request(), 'payments', folioId)).json()).toEqual({ error: 'Folio operation unavailable', code: 'PAYMENT_EXCEEDS_BALANCE' });
    for (const dto of [{ ...receipt, propertyId: reservationId }, { ...receipt, amount: { amount: '-25.50', currency: 'GTQ' } }, { ...receipt, completedAt: 'wrong' }]) {
      mocks.backend.mockResolvedValueOnce(Response.json(dto, { status: 201 }));
      expect((await proxyStaffFolio(request(), 'payments', folioId)).status).toBe(503);
    }
  });
  it('list requires a reservation and strips arbitrary upstream fields', async () => {
    const url = `http://localhost:3001/api/staff/folios?propertyId=${propertyId}&reservationId=${reservationId}`;
    const page = { propertyId, reservationId, items: [], nextCursor: null };
    mocks.backend.mockResolvedValue(Response.json({ ...page, otherProperty: 'private' }));
    expect(await (await proxyStaffFolio(new NextRequest(url, { headers: { cookie: 'pms_staff_access=staff' } }), 'list')).json()).toEqual(page);
    expect((await proxyStaffFolio(new NextRequest(url.replace(`&reservationId=${reservationId}`, ''), { headers: { cookie: 'pms_staff_access=staff' } }), 'list')).status).toBe(400);
  });
});
