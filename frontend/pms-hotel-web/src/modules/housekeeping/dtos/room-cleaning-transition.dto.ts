/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 * Transición de estado de limpieza de una habitación + resoluciones de
 * discrepancias Front Office vs Housekeeping.
 */
export interface CleaningTransitionRequestDto {
  room_id: string;
  /** Uno de DIRTY | CLEAN | INSPECTED. */
  to_status: string;
  /** Obligatorio cuando to_status es DIRTY (rechazo o re-trabajo). */
  reason: string | null;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface CleaningTransitionResultDto {
  room_id: string;
  property_id: string;
  /** Uno de DIRTY | CLEAN | INSPECTED. */
  cleaning_status: string;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface DiscrepancyResolutionDto {
  room_id: string;
  reason: string;
  resolved_at: string;
}

/**
 * PROVISIONAL API CONTRACT
 * Must be validated with Backend before this contract is marked CONFIRMED.
 */
export interface DiscrepancyResolutionListDto {
  resolutions: DiscrepancyResolutionDto[];
}
