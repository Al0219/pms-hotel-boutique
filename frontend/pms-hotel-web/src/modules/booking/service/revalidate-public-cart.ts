import { getPublicAvailability, type AvailabilitySearchResult } from '@/modules/availability';
import { buildSearchQueryParams, validateBookingSearchCriteria, type BookingSearchCriteria } from '../domain/booking-search-criteria';
import { roomSelection } from '../domain/room-catalogue';
import type { PublicCart } from '../domain/public-cart-storage';

type Result = { success: true; cart: PublicCart; availability: AvailabilitySearchResult; priceChanged: boolean }
  | { success: false; message: string };
export const searchVerificationFailed = 'No pudimos verificar la disponibilidad para las nuevas fechas. Tu selección anterior se conservó.';

/** Read-only until the caller commits the complete result. Never mutates input. */
export async function revalidateCartForSearchCriteria(cart: PublicCart, criteria: BookingSearchCriteria, signal?: AbortSignal): Promise<Result> {
  if (Object.keys(validateBookingSearchCriteria(criteria)).length) return { success: false, message: 'Revisa las fechas y huéspedes antes de continuar.' };
  try {
    const availability = await getPublicAvailability({ propertyId: cart.propertyId, checkInDate: criteria.checkIn, checkOutDate: criteria.checkOut, adults: criteria.adults, children: criteria.children, roomsCount: criteria.roomsCount }, signal);
    const refreshed = [];
    let priceChanged = false;
    for (const item of cart.items) {
      const room = availability.roomTypes.find(room => room.roomTypeId === item.roomTypeId);
      const rate = room?.ratePlans.find(rate => rate.ratePlanId === item.ratePlanId && (!item.ratePlanCode || rate.ratePlanCode === item.ratePlanCode));
      if (!room || !rate || room.availableRoomsCount < item.quantity) {
        const name = room?.name ?? item.roomTypeName ?? item.roomTypeCode ?? 'Una habitación de tu carrito';
        const units = room ? ` Hay ${room.availableRoomsCount} unidades disponibles y seleccionaste ${item.quantity}.` : '';
        return { success: false, message: `${name} ya no tiene disponibilidad suficiente para las fechas seleccionadas.${units} Tu búsqueda y carrito anteriores se conservaron.` };
      }
      priceChanged ||= item.totalMinor !== undefined && (item.totalMinor !== rate.totalMinor || item.nightlyRateMinor !== rate.nightlyRateMinor || item.currency !== rate.currency);
      refreshed.push(roomSelection(room, rate, item.quantity));
    }
    return { success: true, cart: { propertyId: availability.propertyId, scope: `${availability.propertyId}:${buildSearchQueryParams(criteria)}`, items: refreshed }, availability, priceChanged };
  } catch { return { success: false, message: searchVerificationFailed }; }
}
