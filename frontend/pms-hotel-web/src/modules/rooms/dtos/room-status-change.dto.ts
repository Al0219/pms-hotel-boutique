/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * Bloqueo/liberación OOO-OOS de una habitación física con motivo y periodo.
 */
export interface RoomStatusChangeRequestDto {
  room_id: string;
  /** Uno de ACTIVE | OOO | OOS. */
  to_status: string;
  /** Siempre obligatorio (auditoría). */
  reason: string;
  /** Exigido cuando to_status es OOO u OOS. Formato YYYY-MM-DD. */
  start_date: string | null;
  /** Exigido cuando to_status es OOO u OOS. Formato YYYY-MM-DD. */
  end_date: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface RoomStatusChangeResultDto {
  room_id: string;
  property_id: string;
  /** Uno de ACTIVE | OOO | OOS. */
  status: string;
  /** Periodo de bloqueo. Null al liberar a ACTIVE. Formato YYYY-MM-DD. */
  blocked_from: string | null;
  /** Periodo de bloqueo. Null al liberar a ACTIVE. Formato YYYY-MM-DD. */
  blocked_to: string | null;
}
