/** Catalog projection matches the confirmed RoomView/RoomTypeView fields.
 * The combined envelope and local transport are frontend MSW only, not a Backend endpoint. */
export interface RoomTypeCatalogDto { id: string; propertyId: string; code: string; name: string; createdAt: string; updatedAt: string }
export interface RoomCatalogDto { id: string; propertyId: string; roomTypeId: string; code: string; createdAt: string; updatedAt: string }
export interface RoomCatalogSnapshotDto { types: RoomTypeCatalogDto[]; rooms: RoomCatalogDto[] }
