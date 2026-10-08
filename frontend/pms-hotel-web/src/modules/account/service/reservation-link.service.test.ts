import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { initializeAccountFixture, peekAccountFixture, resetAccountFixtures } from '@/data/mocks/account-fixtures';
import { requestDemoReservationLink, verifyDemoReservationLink } from './reservation-link.service';
import { HttpStatusError } from '@/lib/http/errors';
beforeEach(() => { resetAccountFixtures(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); initializeAccountFixture('guest-demo-google', 'guest.google@example.com'); });
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });
const signal = () => new AbortController().signal;
describe('Frontend-only reservation link transport', () => {
  it('makes no HTTP request with mocks disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(requestDemoReservationLink('guest-demo-google', 'HB-2026-10420', signal())).rejects.toThrow('DEMO_DISABLED');
    await expect(verifyDemoReservationLink('guest-demo-google', 'request', '12345678', signal())).rejects.toThrow('DEMO_DISABLED');
    expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
  });
  it('reveals no booking data for unknown references and rejects verification', async () => {
    const request = await requestDemoReservationLink('guest-demo-google', 'UNKNOWN', signal());
    expect(Object.keys(request).sort()).toEqual(['account_id', 'expires_at', 'request_id']);
    await expect(verifyDemoReservationLink('guest-demo-google', request.request_id, '12345678', signal())).rejects.toMatchObject({ status: 422 });
    expect(peekAccountFixture('guest-demo-google')?.reservations).toHaveLength(0);
  });
  it('requires matching account and booking email and never transfers a challenge', async () => {
    initializeAccountFixture('guest-demo-empty', 'other@example.com');
    const request = await requestDemoReservationLink('guest-demo-google', 'HB-2026-10420', signal());
    await expect(verifyDemoReservationLink('guest-demo-empty', request.request_id, '12345678', signal())).rejects.toMatchObject({ status: 422 });
    const other = await requestDemoReservationLink('guest-demo-empty', 'HB-2026-10420', signal());
    await expect(verifyDemoReservationLink('guest-demo-empty', other.request_id, '12345678', signal())).rejects.toMatchObject({ status: 422 });
  });
  it('consumes verified challenges once and limits incorrect attempts', async () => {
    const request = await requestDemoReservationLink('guest-demo-google', 'HB-2026-10420', signal());
    for (let attempt = 0; attempt < 5; attempt++) await expect(verifyDemoReservationLink('guest-demo-google', request.request_id, '00000000', signal())).rejects.toMatchObject({ status: 422 });
    await expect(verifyDemoReservationLink('guest-demo-google', request.request_id, '12345678', signal())).rejects.toMatchObject({ status: 429 });
    const fresh = await requestDemoReservationLink('guest-demo-google', 'HB-2026-10420', signal());
    expect(await verifyDemoReservationLink('guest-demo-google', fresh.request_id, '12345678', signal())).toHaveProperty('reservation_id', 'HB-2026-10420');
    await expect(verifyDemoReservationLink('guest-demo-google', fresh.request_id, '12345678', signal())).rejects.toBeInstanceOf(HttpStatusError);
    expect(peekAccountFixture('guest-demo-google')?.reservations).toHaveLength(1);
  });
});
