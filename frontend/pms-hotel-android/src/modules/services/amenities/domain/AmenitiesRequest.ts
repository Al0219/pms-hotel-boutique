export interface AmenityCatalogItem {
  fixtureKey: string;
  name: string;
}

export interface AmenitiesRequestItem {
  itemFixtureKey: string;
  quantity: number;
}

/** Frontend/mock quantity bounds per requested amenity line. */
export const AMENITIES_MIN_ITEM_QUANTITY = 1;
export const AMENITIES_MAX_ITEM_QUANTITY = 5;

export function areAmenitiesRequestItemsValid(items: readonly AmenitiesRequestItem[]): boolean {
  return items.length > 0 && items.every((item) => (
    item.quantity >= AMENITIES_MIN_ITEM_QUANTITY
    && item.quantity <= AMENITIES_MAX_ITEM_QUANTITY
  ));
}

/** Frontend/session request shape; it intentionally has no backend identifiers or financial fields. */
export interface AmenitiesRequest {
  serviceDate: string;
  deliveryTime: string;
  items: readonly AmenitiesRequestItem[];
  notes?: string;
}
