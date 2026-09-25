import type { Room } from "@/modules/rooms";

import type { RoomCleaning, RoomCleaningStatus } from "./room-cleaning";

export const DISCREPANCY_KINDS = ["NOT_READY_FOR_SALE", "READY_BUT_BLOCKED"] as const;

export type DiscrepancyKind = (typeof DISCREPANCY_KINDS)[number];

export interface HousekeepingDiscrepancy {
  roomId: string;
  roomLabel: string;
  kind: DiscrepancyKind;
  frontOffice: string;
  housekeeping: RoomCleaningStatus;
}

/**
 * Compara Front Office (rooms: ACTIVE/OOO/OOS) contra Housekeeping (DIRTY/CLEAN/INSPECTED).
 * - Vendible en FO pero sucia en HK => NOT_READY_FOR_SALE.
 * - Bloqueada en FO (OOO/OOS) pero lista en HK => READY_BUT_BLOCKED.
 * - Habitaciones ya resueltas (mock/auditoría) se excluyen.
 * Habitaciones de HK sin contraparte en FO se ignoran: sin dato FO no hay comparación.
 */
export function buildDiscrepancies(
  rooms: ReadonlyArray<Room>,
  cleaning: ReadonlyArray<RoomCleaning>,
  resolvedRoomIds: ReadonlySet<string>,
): HousekeepingDiscrepancy[] {
  const cleaningByRoomId = new Map(cleaning.map((entry) => [entry.id, entry]));
  const discrepancies: HousekeepingDiscrepancy[] = [];

  for (const room of rooms) {
    if (resolvedRoomIds.has(room.id)) {
      continue;
    }
    const entry = cleaningByRoomId.get(room.id);
    if (!entry) {
      continue;
    }

    if (room.status === "ACTIVE" && entry.status === "DIRTY") {
      discrepancies.push({
        roomId: room.id,
        roomLabel: entry.roomLabel,
        kind: "NOT_READY_FOR_SALE",
        frontOffice: "Vendible",
        housekeeping: entry.status,
      });
    } else if (room.status !== "ACTIVE" && (entry.status === "CLEAN" || entry.status === "INSPECTED")) {
      discrepancies.push({
        roomId: room.id,
        roomLabel: entry.roomLabel,
        kind: "READY_BUT_BLOCKED",
        frontOffice: room.status === "OOO" ? "Fuera de orden" : "Fuera de servicio",
        housekeeping: entry.status,
      });
    }
  }

  return discrepancies;
}
