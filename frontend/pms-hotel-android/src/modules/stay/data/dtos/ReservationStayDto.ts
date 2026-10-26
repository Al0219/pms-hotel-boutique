export interface StayRoomTypeDto {
  id: string | null | undefined;
  name: string | null | undefined;
}

export interface AssignedRoomDto {
  id: string | null | undefined;
  number: string | null | undefined;
}

/**
 * DTO normalizado de Stay. Fixtures y el adapter HTTP Guest lo producen;
 * el contrato de wire real está en GuestStayDto y Backend contrato56.
 */
export interface ReservationStayDto {
  confirmationCode?: string | null;
  id: string | null | undefined;
  reservationId: string | null | undefined;
  roomType: StayRoomTypeDto | null | undefined;
  room: AssignedRoomDto | null | undefined;
  arrival: string | null | undefined;
  departure: string | null | undefined;
  status: string | null | undefined;
}
