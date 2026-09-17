import { type ReservationStayDto } from '@/modules/stay/data/dtos/ReservationStayDto';

/**
 * Remote-shaped fixture reused by approved Stay UI mocks. It is not an API
 * contract and it intentionally passes through the stay mapper.
 */
export const currentStayFixture: ReservationStayDto = {
  id: 'stay-2026-004281',
  reservationId: 'HB-2026-004281',
  roomType: {
    id: 'deluxe-king',
    name: 'Deluxe King',
  },
  room: {
    id: 'room-204',
    number: '204',
  },
  arrival: '2026-08-28',
  departure: '2026-09-18',
  status: 'REMOTE_STATUS',
};
