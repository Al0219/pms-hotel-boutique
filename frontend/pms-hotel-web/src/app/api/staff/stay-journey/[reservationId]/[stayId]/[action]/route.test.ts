import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';
import { context, receipt, summary } from '@/test/stay-journey-fixture';
const mocks = vi.hoisted(() => ({ backend: vi.fn() }));
vi.mock('@/lib/bff/staff-auth', () => ({ staffAccessCookie: 'pms_staff_access', backendStaffRequest: mocks.backend }));
function route(action: string) { return { params: Promise.resolve({ reservationId: context.reservationId, stayId: context.stayId, action }) }; }
function request(action: string, body?: unknown, cookie = 'pms_staff_access=staff', origin = 'http://localhost:3001', query = `propertyId=${context.propertyId}`) {
  return new NextRequest(`http://localhost:3001/api/staff/stay-journey/${context.reservationId}/${context.stayId}/${action}?${query}`, { method: body ? 'POST' : 'GET', headers: { cookie, origin, 'content-type': 'application/json', 'idempotency-key': 'synthetic-key-00001' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}
const input = { amount: '30.00', currency: 'GTQ', instrumentToken: 'demo_visa_approved' };
beforeEach(() => mocks.backend.mockReset());
describe('Staff journey BFF', () => {
  it('uses Staff cookie and forwards only synthetic token/money with a sanitized receipt', async () => {
    mocks.backend.mockResolvedValue(Response.json({ ...receipt(), secret: 'hidden' })); const response = await POST(request('payments', input), route('payments'));
    expect(response.status).toBe(200); expect(await response.json()).toEqual(receipt()); expect(mocks.backend.mock.calls[0][1]).toMatchObject({ headers: { authorization: 'Bearer staff' }, body: JSON.stringify(input) });
  });
  it('rejects Guest cookie, foreign origin, PAN/CVV, forged token and numeric money before upstream', async () => {
    expect((await POST(request('payments', input, 'pms_guest_access=guest'), route('payments'))).status).toBe(401);
    expect((await POST(request('payments', input, undefined, 'https://foreign.example'), route('payments'))).status).toBe(403);
    for (const body of [{ ...input, pan: 'forbidden' }, { ...input, cvv: 'forbidden' }, { ...input, instrumentToken: 'bank' }, { ...input, amount: 30 }]) expect((await POST(request('payments', body), route('payments'))).status).toBe(400);
    expect(mocks.backend).not.toHaveBeenCalled();
  });
  it('validates scope of persisted summaries and keeps reconciliation explicit', async () => {
    mocks.backend.mockImplementation(() => Promise.resolve(Response.json(summary()))); expect((await GET(request('summary'), route('summary'))).status).toBe(200);
    expect((await POST(request('reconcile', {}), route('reconcile'))).status).toBe(200); expect((await POST(request('reconcile', { actorId: context.stayId }), route('reconcile'))).status).toBe(400);
    mocks.backend.mockResolvedValue(Response.json({ ...summary(), stay: { ...summary().stay, stayId: context.propertyId } })); expect((await GET(request('summary'), route('summary'))).status).toBe(503);
  });
  it.each([400, 401, 403, 404, 409, 500])('sanitizes backend %s', async status => {
    mocks.backend.mockResolvedValue(Response.json({ detail: 'secret' }, { status })); const response = await POST(request('payments', input), route('payments')); expect(response.status).toBe(status === 500 ? 503 : status); expect(await response.json()).toEqual({ error: 'Stay operation unavailable' });
  });
});
