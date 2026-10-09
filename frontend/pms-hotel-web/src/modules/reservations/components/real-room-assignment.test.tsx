import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockServer } from '@/data/mocks/server';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { useStaffReservationStays } from '../hooks/use-staff-reservation-stays';
import { ReservationDetail } from './reservation-detail';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
describe('real detail assignment journey', () => {
  it('assigns one of N stays through BFF and refreshes detail plus the real Rooms read projection', async () => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    const dto = staffReservationFixture(), first = dto.stays[0];
    const second = { ...structuredClone(first), stayId: '66666666-6666-6666-6666-666666666666' };
    dto.stays.push(second);
    const roomId = '77777777-7777-7777-7777-777777777777';
    const root = `http://localhost:3000/api/staff/reservations`;
    let commands = 0;
    mockServer.use(
      http.get(`${root}/${dto.reservationId}`, () => HttpResponse.json(dto)),
      http.get(root, () => HttpResponse.json([dto])),
      http.get(`${root}/${dto.reservationId}/stays/${first.stayId}/room-assignment`, () => HttpResponse.json({
        property_id: dto.propertyId, reservation_id: dto.reservationId, stay_id: first.stayId, arrival: first.arrival, departure: first.departure,
        room_type_id: first.roomType.roomTypeId, room_type: first.roomType.name, can_assign: first.room === null, reason: null,
        rooms: first.room ? [] : [{ room_id: roomId, number: '203', floor: null, operational_status: 'ACTIVE', selectable: true, reason: null }],
      })),
      http.put(`${root}/${dto.reservationId}/stays/${first.stayId}/room-assignment`, async ({ request }) => {
        expect(await request.json()).toEqual({ room_id: roomId }); commands++;
        first.room = { roomId, code: '203' };
        return HttpResponse.json({ property_id: dto.propertyId, reservation_id: dto.reservationId, stay_id: first.stayId, room_id: roomId, number: '203' });
      }),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    function RoomsProjection() {
      const stays = useStaffReservationStays(dto.propertyId, 'staff');
      return <output aria-label="Estadías de Habitaciones">{stays.data?.map(stay => stay.roomId ?? 'sin-room').join(',')}</output>;
    }
    render(<QueryClientProvider client={client}><ReservationDetail propertyId={dto.propertyId} reservationId={dto.reservationId}
      endpoint="/api/staff/reservations" sessionId="staff" canManage /><RoomsProjection /></QueryClientProvider>);
    expect(await screen.findAllByRole('button', { name: 'Asignar habitación' })).toHaveLength(2);
    fireEvent.click(within(screen.getByRole('group', { name: `Estadía ${first.stayId}` })).getByRole('button', { name: 'Asignar habitación' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Habitación 203/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText(/Habitación 203 asignada a la estadía/)).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: `Estadía ${first.stayId}` })).getByText('203 · Deluxe')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Asignar habitación' })).toHaveLength(1);
    await waitFor(() => expect(screen.getByLabelText('Estadías de Habitaciones')).toHaveTextContent(roomId));
    expect(screen.getByText('Confirmada', { selector: 'span' })).toBeInTheDocument();
    expect(second.room).toBeNull(); expect(dto.status).toBe('CONFIRMED'); expect(first.status).toBe('RESERVED'); expect(commands).toBe(1);
    const secondRoomId = '88888888-8888-8888-8888-888888888888';
    mockServer.use(
      http.get(`${root}/${dto.reservationId}/stays/${second.stayId}/room-assignment`, () => HttpResponse.json({
        property_id: dto.propertyId, reservation_id: dto.reservationId, stay_id: second.stayId, arrival: second.arrival, departure: second.departure,
        room_type_id: second.roomType.roomTypeId, room_type: second.roomType.name, can_assign: second.room === null, reason: null,
        rooms: second.room ? [] : [{ room_id: secondRoomId, number: '204', floor: null, operational_status: 'ACTIVE', selectable: true, reason: null }],
      })),
      http.put(`${root}/${dto.reservationId}/stays/${second.stayId}/room-assignment`, async ({ request }) => {
        expect(await request.json()).toEqual({ room_id: secondRoomId }); commands++;
        second.room = { roomId: secondRoomId, code: '204' };
        return HttpResponse.json({ property_id: dto.propertyId, reservation_id: dto.reservationId, stay_id: second.stayId, room_id: secondRoomId, number: '204' });
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Asignar habitación' }));
    fireEvent.click(await screen.findByRole('radio', { name: /Habitación 204/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar asignación' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Asignada', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Asignar habitación' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Estadías de Habitaciones')).toHaveTextContent(secondRoomId));
    expect(dto.status).toBe('CONFIRMED'); expect(dto.stays.map(stay => stay.status)).toEqual(['RESERVED', 'RESERVED']);
    expect(commands).toBe(2);
    client.clear();
  });
});
