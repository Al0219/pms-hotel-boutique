import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { inventoryPropertyId, staffInventoryFixture } from '@/test/staff-inventory-fixture';
import { readStaffInventory } from './staff-inventory-read.service';
const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'http://untrusted.example/api'); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Inventory same-origin transport', () => {
  it.each(['false', 'true'])('uses authenticated native BFF paths regardless of base URL with mocks=%s', async mock => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', mock);
    const fixture = staffInventoryFixture(), signal = new AbortController().signal;
    fetchMock.mockImplementation(async input => Response.json(String(input).includes('/room-types?') ? fixture.types : fixture.rooms));
    expect(await readStaffInventory(inventoryPropertyId, signal)).toEqual(fixture);
    expect(fetchMock.mock.calls.map(([input]) => new URL(String(input)).pathname)).toEqual(['/api/staff/rooms', '/api/staff/room-types']);
    for (const [input, options] of fetchMock.mock.calls) {
      expect(new URL(String(input)).origin).toBe(window.location.origin);
      expect(new URL(String(input)).searchParams.get('propertyId')).toBe(inventoryPropertyId);
      expect(options?.signal).toBe(signal); expect(options?.method).toBe('GET');
      expect(new Headers(options?.headers).get('authorization')).toBeNull();
    }
  });
  it('shares one Staff refresh across simultaneous expired reads and retries once', async () => {
    const fixture = staffInventoryFixture(); const calls = new Map<string, number>();
    fetchMock.mockImplementation(async input => {
      const path = new URL(String(input)).pathname;
      if (path === '/api/auth/staff/refresh') return Response.json({ refreshed: true });
      const count = (calls.get(path) ?? 0) + 1; calls.set(path, count);
      return count === 1 ? new Response(null, { status: 401 }) : Response.json(path.endsWith('/rooms') ? fixture.rooms : fixture.types);
    });
    expect(await readStaffInventory(inventoryPropertyId)).toEqual(fixture);
    expect(fetchMock.mock.calls.filter(([input]) => String(input).includes('/refresh'))).toHaveLength(1);
    expect([...calls.values()]).toEqual([2, 2]);
  });
  it('does not refresh a forbidden read or substitute a mock catalog', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 403 }));
    await expect(readStaffInventory(inventoryPropertyId)).rejects.toMatchObject({ status: 403 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
