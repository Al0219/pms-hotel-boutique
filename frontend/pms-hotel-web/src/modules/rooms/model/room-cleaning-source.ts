/** Read-only domain port supplied by composition, independent of operational status/occupancy. */
export type RoomCleaningState = 'DIRTY' | 'CLEAN' | 'INSPECTED';
export interface RoomCleaningSource {
  data?: { propertyId: string; rooms: readonly { roomId: string; status: RoomCleaningState | null; updatedAt: string | null }[] };
  isSuccess: boolean;
  isError: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}
export const CLEANING_LABELS = { DIRTY: 'Sucia', CLEAN: 'Limpia · pendiente de inspección', INSPECTED: 'Inspeccionada', UNTRACKED: 'Sin seguimiento', UNKNOWN: 'Limpieza no disponible' };
