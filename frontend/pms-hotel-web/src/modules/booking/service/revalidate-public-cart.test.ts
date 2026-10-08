import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPublicAvailability, mapPublicAvailabilityToDomain } from '@/modules/availability';
import { sixRoomAvailability } from '@/test/public-six-room-fixture';
import { buildSearchQueryParams } from '../domain/booking-search-criteria';
import { roomSelection } from '../domain/room-catalogue';
import { revalidateCartForSearchCriteria } from './revalidate-public-cart';

vi.mock('@/modules/availability', async original => ({ ...await original<typeof import('@/modules/availability')>(), getPublicAvailability: vi.fn() }));
const criteria = { checkIn: '2026-11-01', checkOut: '2026-11-03', adults: 2, children: 0, roomsCount: 1 };
const next = { ...criteria, checkOut: '2026-11-05', adults: 3, children: 1, roomsCount: 2 };
const initial = mapPublicAvailabilityToDomain(sixRoomAvailability);
const cart = { scope: `${initial.propertyId}:${buildSearchQueryParams(criteria)}`, propertyId: initial.propertyId,
  items: [roomSelection(initial.roomTypes[0], initial.roomTypes[0].ratePlans[0], 2), roomSelection(initial.roomTypes[5], initial.roomTypes[5].ratePlans[0])] };
const refreshed = () => mapPublicAvailabilityToDomain({ ...sixRoomAvailability, departure: next.checkOut, offers: sixRoomAvailability.offers.map(offer => ({ ...offer, availableUnits: 3, nightlyRateMinor: offer.nightlyRateMinor + 100, totalMinor: offer.totalMinor + 99999 })) });
beforeEach(() => { vi.mocked(getPublicAvailability).mockReset(); vi.mocked(getPublicAvailability).mockResolvedValue(refreshed()); });
describe('Atomic cart/search revalidation', () => {
  it('refreshes all lines from Backend, preserving real IDs and quantities without mutating the old cart', async () => {
    const before = JSON.stringify(cart);
    const result = await revalidateCartForSearchCriteria(cart, next);
    expect(getPublicAvailability).toHaveBeenCalledWith({ propertyId: cart.propertyId, checkInDate: next.checkIn, checkOutDate: next.checkOut, adults: 3, children: 1, roomsCount: 2 }, undefined);
    expect(result.success).toBe(true);
    if (!result.success) throw Error('Expected successful validation');
    expect(result.cart.scope).toBe(`${cart.propertyId}:${buildSearchQueryParams(next)}`);
    expect(result.cart.items.map(item => item.quantity)).toEqual([2, 1]);
    result.cart.items.forEach((item, i) => expect(item).toMatchObject({ roomTypeId: cart.items[i].roomTypeId, ratePlanId: cart.items[i].ratePlanId, ratePlanCode: cart.items[i].ratePlanCode, availableUnits: 3, currency: 'GTQ', nightlyRateMinor: cart.items[i].nightlyRateMinor! + 100, totalMinor: cart.items[i].totalMinor! + 99999 }));
    expect(result.priceChanged).toBe(true); expect(JSON.stringify(cart)).toBe(before);
  });
  it.each(['missing', 'ats', 'plan', 'plan-code'])('rejects %s on one line without mutating any line or accepting new criteria', async reason => {
    const response = refreshed();
    const room = response.roomTypes[5];
    if (reason === 'missing') response.roomTypes = response.roomTypes.filter(value => value !== room);
    if (reason === 'ats') room.availableRoomsCount = 0;
    if (reason === 'plan') room.ratePlans[0].ratePlanId = 'DEMO_OTHER';
    if (reason === 'plan-code') room.ratePlans[0].ratePlanCode = 'DEMO_OTHER';
    vi.mocked(getPublicAvailability).mockResolvedValue(response);
    const before = JSON.stringify(cart); const result = await revalidateCartForSearchCriteria(cart, next);
    expect(result).toMatchObject({ success: false, message: expect.stringContaining('Suite') });
    expect(result).not.toHaveProperty('cart'); expect(JSON.stringify(cart)).toBe(before);
  });
  it('reports the actual new ATS when quantity exceeds it', async () => {
    const response = refreshed(); response.roomTypes[0].availableRoomsCount = 1;
    vi.mocked(getPublicAvailability).mockResolvedValue(response);
    expect(await revalidateCartForSearchCriteria(cart, next)).toMatchObject({ success: false, message: expect.stringContaining('Hay 1 unidades disponibles y seleccionaste 2') });
  });
  it('keeps all old criteria/prices/items on a network or Backend failure', async () => {
    const before = JSON.stringify(cart); vi.mocked(getPublicAvailability).mockRejectedValue(Error('network'));
    expect(await revalidateCartForSearchCriteria(cart, next)).toMatchObject({ success: false, message: 'No pudimos verificar la disponibilidad para las nuevas fechas. Tu selección anterior se conservó.' });
    expect(JSON.stringify(cart)).toBe(before);
  });
  it('rejects invalid criteria without making a request', async () => {
    expect(await revalidateCartForSearchCriteria(cart, { ...next, checkOut: next.checkIn })).toMatchObject({ success: false });
    expect(getPublicAvailability).not.toHaveBeenCalled();
  });
  it('accepts an empty cart with no offers as a normal search result', async () => {
    vi.mocked(getPublicAvailability).mockResolvedValue({ ...refreshed(), roomTypes: [] });
    expect(await revalidateCartForSearchCriteria({ ...cart, items: [] }, next)).toMatchObject({ success: true, cart: { items: [] }, priceChanged: false });
  });
});
