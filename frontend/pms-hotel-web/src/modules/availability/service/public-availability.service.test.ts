import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { mockServer } from '@/data/mocks/server';
import { backendAvailability, publicPropertyId } from '@/test/public-availability-fixture';
import { setAuthToken } from '@/lib/http/interceptors';
import { HttpStatusError } from '@/lib/http';
import { fetchBackendAvailabilityDto } from './availability.service';

const query = { propertyId: publicPropertyId, arrival: '2026-11-01', departure: '2026-11-03', rooms: 2 };
afterEach(() => { setAuthToken(null); vi.unstubAllEnvs(); });
describe('Real public availability service', () => {
  it('calls only the same-origin BFF with approved params, AbortSignal and no Staff token', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://spring.invalid:8080');
    setAuthToken('staff-test');
    const requests: Request[] = [];
    mockServer.use(http.get('*/api/v1/public/availability', ({ request }) => { requests.push(request); return HttpResponse.json(backendAvailability); }));
    const abort = new AbortController();
    expect(await fetchBackendAvailabilityDto(query, abort.signal)).toEqual(backendAvailability);
    const request = requests[0]; const url = new URL(request.url);
    expect(url.origin).toBe(window.location.origin);
    expect(Object.fromEntries(url.searchParams)).toEqual({ ...query, rooms: '2' });
    expect(request.headers.has('authorization')).toBe(false);
  });
  it.each([400, 404, 500, 503])('preserves HTTP %s as a typed error without mock fallback', async status => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ error: 'Unavailable' }, { status })));
    await expect(fetchBackendAvailabilityDto(query)).rejects.toMatchObject({ status });
    await expect(fetchBackendAvailabilityDto(query)).rejects.toBeInstanceOf(HttpStatusError);
  });
  it('returns an empty confirmed DTO without using fixtures', async () => {
    mockServer.use(http.get('*/api/v1/public/availability', () => HttpResponse.json({ ...backendAvailability, offers: [] })));
    expect((await fetchBackendAvailabilityDto(query)).offers).toEqual([]);
  });
});
