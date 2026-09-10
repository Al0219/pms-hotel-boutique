export interface StayRoomTypeDto {
  id: string | null | undefined;
  name: string | null | undefined;
}

export interface AssignedRoomDto {
  id: string | null | undefined;
  number: string | null | undefined;
}

/**
 * Forma exclusiva de fixtures/mocks durante Sprint 1. No constituye un
 * contrato de API ni autoriza un endpoint hasta que Backend lo confirme.
 */
export interface ReservationStayDto {
  id: string | null | undefined;
  reservationId: string | null | undefined;
  roomType: StayRoomTypeDto | null | undefined;
  room: AssignedRoomDto | null | undefined;
  arrival: string | null | undefined;
  departure: string | null | undefined;
  status: string | null | undefined;
}
