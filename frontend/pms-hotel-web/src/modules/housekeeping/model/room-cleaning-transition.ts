import type { RoomCleaningStatus } from "./room-cleaning";

/**
 * Pipeline de limpieza Staff. Sin saltos: DIRTY -> CLEAN -> INSPECTED.
 * Volver a DIRTY (rechazo de inspección o re-trabajo) exige motivo.
 */
const ALLOWED_TRANSITIONS: Record<RoomCleaningStatus, ReadonlyArray<RoomCleaningStatus>> = {
  DIRTY: ["CLEAN"],
  CLEAN: ["INSPECTED", "DIRTY"],
  INSPECTED: ["DIRTY"],
};

export function allowedCleaningTransitions(from: RoomCleaningStatus): ReadonlyArray<RoomCleaningStatus> {
  return ALLOWED_TRANSITIONS[from];
}

export function canTransitionCleaning(from: RoomCleaningStatus, to: RoomCleaningStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Rechazos y re-trabajos (destino DIRTY) exigen motivo para auditoría. */
export function cleaningTransitionRequiresReason(to: RoomCleaningStatus): boolean {
  return to === "DIRTY";
}

export interface CleaningTransitionResult {
  roomId: string;
  propertyId: string;
  status: RoomCleaningStatus;
}

export interface DiscrepancyResolution {
  roomId: string;
  reason: string;
  resolvedAt: Date;
}
