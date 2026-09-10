import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { mapReservationStayDto, MockStayService, type ReservationStayDto } from '@/modules/stay';

const stayDto: ReservationStayDto = {
  id: 'stay-1',
  reservationId: 'reservation-1',
  roomType: {
    id: 'room-type-1',
    name: 'Deluxe King',
  },
  room: {
    id: 'room-101',
    number: '101',
  },
  arrival: '2026-09-10',
  departure: '2026-09-12',
  status: 'REMOTE_STATUS',
};

describe('Stay contracts', () => {
  it('maps a mock DTO into a ReservationStay domain model without defaults', () => {
    const stay = mapReservationStayDto(stayDto);

    expect(stay).toMatchObject({
      id: 'stay-1',
      reservationId: 'reservation-1',
      roomType: { id: 'room-type-1', name: 'Deluxe King' },
      room: { id: 'room-101', number: '101' },
      arrival: '2026-09-10',
      departure: '2026-09-12',
    });
    expect(stay.status).toBe('REMOTE_STATUS');
  });

  it('preserves an unassigned room and rejects invalid required DTO fields', () => {
    expect(mapReservationStayDto({ ...stayDto, room: null }).room).toBeNull();
    expect(() => mapReservationStayDto({ ...stayDto, arrival: ' ' })).toThrow(DomainMappingError);
  });

  it('keeps the mock at the service boundary without an endpoint', async () => {
    await expect(new MockStayService({ kind: 'success', dto: stayDto }).getCurrentStay()).resolves.toBe(stayDto);
    await expect(
      new MockStayService({ kind: 'error', error: new Error('remote failure') }).getCurrentStay(),
    ).rejects.toThrow('remote failure');
  });
});
