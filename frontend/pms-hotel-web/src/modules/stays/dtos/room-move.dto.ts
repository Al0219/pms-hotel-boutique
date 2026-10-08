/**
 * PROVISIONAL API CONTRACT
 * Debe validarse contra Backend antes de marcar CONFIRMED.
 * Contrato del flujo de cambio de habitación (V3 - 01 Reservation Engine, Room Move).
 * El payload de apply viaja con stayId/targetRoomId para que Backend revalide
 * disponibilidad y compatibilidad en el momento de confirmar.
 */

/** Candidato a destino dentro del preview de cambio de habitación. */
export interface RoomMoveCandidateDto {
  room_id: string;
  room_label: string;
  /** Tipo de habitación, ej. "Deluxe King". */
  room_type: string;
  /** Decisión de Backend: mismo room type y capacidad; PASS solo si true. */
  is_compatible: boolean;
  /** Detalle de compatibilidad, ej. "mismo room type y capacidad". */
  compatibility_note: string | null;
  /** Estado revalidado de disponibilidad, ej. "AVAILABLE" / "OCCUPIED". */
  availability_state: string;
  /** Nota operativa del estado, ej. "limpia y verificada". */
  availability_note: string | null;
}

/** Proyección del cambio de habitación antes de confirmar. */
export interface RoomMovePreviewDto {
  reservation_id: string;
  stay_id: string;
  guest_name: string;
  current_room: {
    room_id: string;
    room_label: string;
    room_type: string;
  };
  /** Candidatos revalidados; la revalidación se repite al confirmar. */
  candidates: RoomMoveCandidateDto[];
  finance_summary: {
    total_amount: string;
    paid_amount: string;
    balance_amount: string;
    currency: string;
    paid_count: number;
    total_count: number;
  };
  /** Impacto operativo: transición de Housekeeping al mover. */
  hk_impact: {
    from_room_state: string;
    to_room_state: string;
    note: string;
  };
  /** Evidencia de que el folio y los cargos se conservan. */
  folio_note: string;
  /** Decisión de Backend: solo se habilita la acción si es true. */
  can_move: boolean;
  /** Motivo de rechazo cuando can_move=false. */
  reason: string | null;
}

/** Resultado del cambio de habitación confirmado. */
export interface RoomMoveApplyDto {
  reservation_id: string;
  stay_id: string;
  status: "ROOM_MOVED";
  from_room_id: string;
  to_room_id: string;
  /** ISO datetime. */
  moved_at: string;
  /** Transición de Housekeeping, ej. "203 → POR LIMPIAR · 101 → OCUPADA". */
  hk_transition: string;
  /** Evidencia de auditoría, ej. "ROOM_MOVED 203→101 · ReservationStay actualizado". */
  audit_summary: string;
  message: string;
}