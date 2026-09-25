import type { StatusBadgeVariant } from "@/shared/components";

import type { RoomCleaningStatus } from "../model/room-cleaning";

/** Etiquetas y variantes compartidas del estado base de limpieza (hallazgo H-2). */
export const CLEANING_STATUS_LABELS: Record<RoomCleaningStatus, string> = {
  DIRTY: "Sucia",
  CLEAN: "Limpia",
  INSPECTED: "Inspeccionada",
};

export const CLEANING_STATUS_VARIANTS: Record<RoomCleaningStatus, StatusBadgeVariant> = {
  DIRTY: "warning",
  CLEAN: "info",
  INSPECTED: "success",
};
