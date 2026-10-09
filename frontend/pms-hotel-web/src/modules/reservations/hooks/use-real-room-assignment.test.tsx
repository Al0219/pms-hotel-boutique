import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoomAssignment } from './use-room-assignment';
const mocks = vi.hoisted(() => ({ preview: vi.fn(), assign: vi.fn() }));
vi.mock('../service/room-assignment.service', () => ({ getRoomAssignmentPreview: mocks.preview, assignStayRoom: mocks.assign }));
const scope = { propertyId: 'property', reservationId: 'reservation', stayId: 'stay', real: true };
const dto = { property_id: 'property', reservation_id: 'reservation', stay_id: 'stay', arrival: '2035-01-01', departure: '2035-01-03',
  room_type_id: 'type', room_type: 'Deluxe', can_assign: true, reason: null,
  rooms: [{ room_id: 'room', number: '203', floor: null, operational_status: 'ACTIVE', selectable: true, reason: null }] };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); mocks.preview.mockReset().mockResolvedValue(dto); mocks.assign.mockReset().mockResolvedValue({ ...dto, room_id: 'room', number: '203' }); });
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
describe('real assignment refresh', () => {
  it('works with mocks disabled and invalidates detail, rooms stays and candidates after success', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRoomAssignment(scope, 'staff', true), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    let assigned;
    await act(async () => { assigned = await result.current.assign('room'); });
    expect(assigned).toMatchObject({ roomId: 'room', roomNumber: '203' });
    expect(mocks.assign).toHaveBeenCalledWith(scope, 'room', expect.any(AbortSignal));
    for (const queryKey of [['reservations', 'property'], ['reservations', 'staff-stays', 'staff', 'property'], ['staff-room-assignment', 'staff', 'property'], ['staff-room-occupancy', 'staff', 'property']]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    }
    client.clear();
  });
  it('never submits without permission or publishes success after failure', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(({ allowed }) => useRoomAssignment(scope, 'staff', allowed), { initialProps: { allowed: false }, wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await act(async () => { expect(await result.current.assign('room')).toBeUndefined(); });
    expect(mocks.assign).not.toHaveBeenCalled();
    rerender({ allowed: true });
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    mocks.assign.mockRejectedValueOnce(new Error('Backend unavailable'));
    await act(async () => { expect(await result.current.assign('room')).toBeUndefined(); });
    expect(result.current.error).toContain('No pudimos asignar');
    client.clear();
  });
});
