import type { RoomStatus } from "./room";

/**
 * Transiciones OOO/OOS. La habitación nunca se elimina: solo se bloquea
 * (ACTIVE -> OOO/OOS), se mueve entre bloqueos o se libera (-> ACTIVE).
 */
const ALLOWED_STATUS_CHANGES: Record<RoomStatus, ReadonlyArray<RoomStatus>> = {
  ACTIVE: ["OOO", "OOS"],
  OOO: ["ACTIVE", "OOS"],
  OOS: ["ACTIVE", "OOO"],
};

export function allowedRoomStatusChanges(from: RoomStatus): ReadonlyArray<RoomStatus> {
  return ALLOWED_STATUS_CHANGES[from];
}

export function canChangeRoomStatus(from: RoomStatus, to: RoomStatus): boolean {
  return ALLOWED_STATUS_CHANGES[from].includes(to);
}

/** Bloquear (OOO/OOS) exige periodo; liberar solo exige motivo. */
export function roomStatusChangeRequiresPeriod(to: RoomStatus): boolean {
  return to === "OOO" || to === "OOS";
}

/** Periodo válido: fechas YYYY-MM-DD con fin estrictamente posterior al inicio. */
export function isValidBlockPeriod(startDate: string, endDate: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return false;
  }
  return startDate < endDate;
}

export interface RoomStatusChangeResult {
  roomId: string;
  propertyId: string;
  status: RoomStatus;
  blockedFrom: Date | null;
  blockedTo: Date | null;
}
