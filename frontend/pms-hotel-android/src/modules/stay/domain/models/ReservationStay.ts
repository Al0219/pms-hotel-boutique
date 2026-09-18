declare const stayStatusBrand: unique symbol;

/**
 * Valor de estado recibido desde Remote/API. Los valores permitidos requieren
 * un contrato cross-app confirmado antes de exponerse como enum de dominio.
 */
export type StayStatus = string & { readonly [stayStatusBrand]: 'StayStatus' };

export interface StayRoomType {
  id: string;
  name: string;
}

export interface AssignedRoom {
  id: string;
  number: string;
}

export interface ReservationStay {
  id: string;
  reservationId: string;
  roomType: StayRoomType;
  room: AssignedRoom | null;
  arrival: string;
  departure: string;
  status: StayStatus;
}
