import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backendAvailability, publicPropertyId } from '@/test/public-availability-fixture';

const query = `propertyId=${publicPropertyId}&arrival=2026-11-01&departure=2026-11-03&rooms=2`;
beforeEach(() => { vi.resetModules(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubEnv('PMS_BACKEND_INTERNAL_URL', 'http://backend:8080/'); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function call(search = query) {
  const { GET } = await import('./route');
  return GET(new Request(`http://localhost/api/v1/public/availability?${search}`, {
    headers: { authorization: 'Bearer staff-test', cookie: 'pms_staff_access=staff-test; pms_guest_access=guest-test' },
  }));
}

describe('Public availability BFF', () => {
  it('forwards the real query to the configured Backend without credentials and whitelists the DTO', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ...backendAvailability, staffOnly: 'private',
      offers: backendAvailability.offers.map(offer => ({ ...offer, internalField: 'private' })) }));
    const response = await call(`${query}&extra=ignore&property_id=ignore`);
    expect(fetch).toHaveBeenCalledWith(`http://backend:8080/api/v1/public/availability?${query}`, expect.objectContaining({ method: 'GET', cache: 'no-store' }));
    const init = fetch.mock.calls[0][1]!;
    expect(new Headers(init.headers).has('authorization')).toBe(false);
    expect(new Headers(init.headers).has('cookie')).toBe(false);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(backendAvailability);
  });
  it('keeps empty availability as a normal 200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ ...backendAvailability, offers: [] }));
    const response = await call(); expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ...backendAvailability, offers: [] });
  });
  it.each([400, 404, 500, 503])('preserves Backend %s without exposing internal errors or fixtures', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ detail: 'internal Backend details' }, { status }));
    const response = await call(); expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: 'Public availability is unavailable' });
  });
  it('maps network failure to a recoverable 503', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network failed'));
    expect((await call()).status).toBe(503);
  });
  it('requires Backend configuration without inventing a fallback', async () => {
    vi.stubEnv('PMS_BACKEND_INTERNAL_URL', '');
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect((await call()).status).toBe(503); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects an unreadable upstream contract as 503', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ offers: null }));
    expect((await call()).status).toBe(503);
  });
  it('preserves the existing explicit mock route without calling Backend', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true');
    const fetch = vi.spyOn(globalThis, 'fetch');
    const response = await call('check_in_date=2026-11-01&check_out_date=2026-11-03&adults=2&children=0&rooms_count=1');
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ check_in_date: '2026-11-01', check_out_date: '2026-11-03', total_nights: 2 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
