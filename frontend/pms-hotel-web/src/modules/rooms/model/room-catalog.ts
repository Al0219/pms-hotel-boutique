export interface RoomTypeCatalogEntry { id: string; propertyId: string; code: string; name: string; createdAt: Date; updatedAt: Date }
export interface RoomCatalogEntry { id: string; propertyId: string; roomTypeId: string; code: string; createdAt: Date; updatedAt: Date }
export interface RoomCatalogSnapshot { types: RoomTypeCatalogEntry[]; rooms: RoomCatalogEntry[] }
export type RoomCatalogChange =
  | { kind: 'create-type'; code: string; name: string }
  | { kind: 'edit-type'; id: string; code: string; name: string }
  | { kind: 'create-room'; code: string; roomTypeId: string }
  | { kind: 'edit-room'; id: string; code: string };
export function catalogFieldError(value: string, maximum: number): string | undefined {
  return !value.trim() ? 'Este campo es obligatorio.' : value.trim().length > maximum ? `Usa como máximo ${maximum} caracteres.` : undefined;
}
