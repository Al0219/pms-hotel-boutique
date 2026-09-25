import type { StatusBadgeVariant } from "@/shared/components";

import type { RoomStatus } from "../model/room";

/** Etiquetas y variantes compartidas del estado físico de habitación. */
export const ROOM_STATUS_LABELS: Record<RoomStatus, string> = {
  ACTIVE: "Activa",
  OOO: "Fuera de orden",
  OOS: "Fuera de servicio",
};

export const ROOM_STATUS_VARIANTS: Record<RoomStatus, StatusBadgeVariant> = {
  ACTIVE: "success",
  OOO: "warning",
  OOS: "error",
};
