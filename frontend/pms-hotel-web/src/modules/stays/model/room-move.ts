export interface RoomMoveCandidate {
  roomId: string;
  roomLabel: string;
  /** Tipo de habitación, ej. "Deluxe King". */
  roomType: string;
  /** Decisión de Backend: solo el candidato compatible y disponible es asignable. */
  isCompatible: boolean;
  compatibilityNote: string | null;
  /** Estado revalidado de disponibilidad, ej. "AVAILABLE". */
  availabilityState: string;
  availabilityNote: string | null;
}

export interface RoomMovePreview {
  reservationId: string;
  stayId: string;
  guestName: string;
  currentRoom: {
    roomId: string;
    roomLabel: string;
    roomType: string;
  };
  /** Candidatos revalidados; la revalidación se repite al confirmar. */
  candidates: RoomMoveCandidate[];
  financeSummary: {
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    currency: string;
    paidCount: number;
    totalCount: number;
  };
  /** Impacto operativo: transición de Housekeeping al mover. */
  hkImpact: {
    fromRoomState: string;
    toRoomState: string;
    note: string;
  };
  folioNote: string;
  /** El UI nunca habilita la acción si Backend no lo permite. */
  canMove: boolean;
  reason: string | null;
}

export interface RoomMoveResult {
  reservationId: string;
  stayId: string;
  status: "ROOM_MOVED";
  fromRoomId: string;
  toRoomId: string;
  movedAt: Date;
  hkTransition: string;
  auditSummary: string;
  message: string;
}