import type { RoomCatalogEntry, RoomTypeCatalogEntry } from './room-catalog';

/** Approved Inventory 16/17 only. Provisional editorial/operational commands stay separate. */
export type StaffInventoryCommand =
  | { kind: 'create-room'; roomTypeId: string; code: string }
  | { kind: 'edit-room'; id: string; code: string }
  | { kind: 'create-type'; code: string; name: string }
  | { kind: 'edit-type'; id: string; code?: string; name?: string };
export type StaffInventoryResult = { kind: 'room'; entry: RoomCatalogEntry } | { kind: 'type'; entry: RoomTypeCatalogEntry };
export function inventoryTextError(value: string, max: number) {
  return !value.trim() ? 'Este campo es obligatorio.' : value.length > max ? `Usa como máximo ${max} caracteres.` : undefined;
}
