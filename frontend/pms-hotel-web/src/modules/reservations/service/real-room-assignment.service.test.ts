import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assignStayRoom, getRoomAssignmentPreview } from './room-assignment.service';
const fetchMock = vi.fn<typeof fetch>();
const scope = { propertyId: 'property', reservationId: 'reservation', stayId: 'stay', real: true };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); vi.stubGlobal('fetch', fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('real assignment transport', () => {
  it.each(['true', 'false'])('uses BFF independently of mock flag %s', async flag => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', flag); fetchMock.mockImplementation(async () => Response.json({}));
    await getRoomAssignmentPreview(scope);
    await assignStayRoom(scope, 'room');
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/staff/reservations/reservation/stays/stay/room-assignment?propertyId=property');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ room_id: 'room' }) });
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).has('authorization')).toBe(false);
  });
  it('refreshes Staff once on 401 then retries the exact command', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(Response.json({ refreshed: true })).mockResolvedValueOnce(Response.json({ room_id: 'room' }));
    expect(await assignStayRoom(scope, 'room')).toEqual({ room_id: 'room' });
    expect(fetchMock.mock.calls[1][0]).toContain('/api/auth/staff/refresh');
    expect(fetchMock.mock.calls[2]).toEqual(fetchMock.mock.calls[0]);
  });
  it.each([403, 409, 503])('never retries or refreshes status %i', async status => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await expect(assignStayRoom(scope, 'room')).rejects.toMatchObject({ status });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
