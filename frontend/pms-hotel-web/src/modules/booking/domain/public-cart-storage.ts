import { buildSearchQueryParams, readBookingSearchCriteria, validateBookingSearchCriteria } from './booking-search-criteria';
import type { RoomSelection } from './room-catalogue';

export interface PublicCart { scope: string; propertyId?: string; items: RoomSelection[] }
export const emptyCart: PublicCart = { scope: '', items: [] };
export const publicCartStorageKey = (mock: boolean) => `pms:public-cart:v1:${mock ? 'mock' : 'real'}`;
export function cartCriteria(cart: PublicCart) { return readBookingSearchCriteria(new URLSearchParams(cart.scope.slice((cart.propertyId?.length ?? 0) + 1))); }

/** Stored cart is an untrusted selection, never a quote or authorization. No Guest PII. */
export function readStoredCart(raw: string | null, mock: boolean): PublicCart {
  try {
    if (!raw || raw.length > 20000) return emptyCart;
    const value = JSON.parse(raw);
    if (value.version !== 1 || !value.cart || typeof value.cart.propertyId !== 'string' || typeof value.cart.scope !== 'string' || !Array.isArray(value.cart.items) || value.cart.items.length > 100) return emptyCart;
    const cart: PublicCart = value.cart;
    const criteria = cartCriteria(cart);
    if (Object.keys(validateBookingSearchCriteria(criteria)).length || cart.scope !== `${cart.propertyId}:${buildSearchQueryParams(criteria as Parameters<typeof buildSearchQueryParams>[0])}`) return emptyCart;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!mock && !uuid.test(cart.propertyId!)) return emptyCart;
    const seen = new Set<string>();
    const items: RoomSelection[] = [];
    for (const item of cart.items) {
      if (!item || typeof item.roomTypeId !== 'string' || (!mock && !uuid.test(item.roomTypeId)) || typeof item.ratePlanId !== 'string' || !item.ratePlanId.trim() || item.ratePlanId.length > 100 || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || seen.has(item.roomTypeId)) return emptyCart;
      seen.add(item.roomTypeId);
      const selection: RoomSelection = { roomTypeId: item.roomTypeId, ratePlanId: item.ratePlanId, quantity: item.quantity };
      if (!mock && typeof item.roomTypeCode === 'string' && item.currency === 'GTQ' && Number.isSafeInteger(item.nightlyRateMinor) && item.nightlyRateMinor! >= 0 && Number.isSafeInteger(item.totalMinor) && item.totalMinor! >= 0) {
        Object.assign(selection, { roomTypeCode: item.roomTypeCode, currency: item.currency, nightlyRateMinor: item.nightlyRateMinor, totalMinor: item.totalMinor });
        if (typeof item.roomTypeName === 'string' && item.roomTypeName.length <= 200) selection.roomTypeName = item.roomTypeName;
        if (typeof item.ratePlanCode === 'string' && item.ratePlanCode.length <= 100) selection.ratePlanCode = item.ratePlanCode;
        if (Number.isSafeInteger(item.availableUnits) && item.availableUnits! >= 0) selection.availableUnits = item.availableUnits;
      }
      items.push(selection);
    }
    return { scope: cart.scope, propertyId: cart.propertyId, items };
  } catch { return emptyCart; }
}

export function serializeCart(cart: PublicCart): string {
  return JSON.stringify({ version: 1, cart: { propertyId: cart.propertyId, scope: cart.scope, items: cart.items.map(item => ({
    roomTypeId: item.roomTypeId, ratePlanId: item.ratePlanId, quantity: item.quantity,
    roomTypeCode: item.roomTypeCode, currency: item.currency, nightlyRateMinor: item.nightlyRateMinor, totalMinor: item.totalMinor,
    roomTypeName: item.roomTypeName, ratePlanCode: item.ratePlanCode, availableUnits: item.availableUnits,
  })) } });
}
