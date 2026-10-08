import { type RoomServiceCartState } from '@/modules/services/room-service/domain/models/RoomServiceCart';
import { roomServiceCategoryPeriod, type RoomServiceAvailabilityWindow, type RoomServiceMenu, type RoomServiceMenuItem, type RoomServicePeriod } from '@/modules/services/room-service/domain/models/RoomServiceMenu';

export const roomServicePeriodWindows: Readonly<Record<RoomServicePeriod, readonly RoomServiceAvailabilityWindow[]>> = {
  BREAKFAST: [{ startTime: '06:30', endTime: '11:30' }],
  LUNCH: [{ startTime: '11:30', endTime: '17:00' }],
  DINNER: [{ startTime: '17:00', endTime: '22:00' }],
  BEVERAGES: [{ startTime: '06:30', endTime: '23:00' }],
};

/** Approved departure-day cap. It is intentionally independent from effective checkout. */
export const checkoutDayLateLunchMaxTime = '13:30';
export interface RoomServiceCheckoutDayContext { departure: string; hasActiveLateCheckout: boolean; }

export function getRoomServicePeriodWindows(period: RoomServicePeriod): readonly RoomServiceAvailabilityWindow[] {
  return roomServicePeriodWindows[period];
}

function getItemPeriods(item: RoomServiceMenuItem, selectedMealPeriod?: RoomServicePeriod): readonly RoomServicePeriod[] {
  if (selectedMealPeriod && (item.periods ?? []).includes(selectedMealPeriod)) return [selectedMealPeriod];
  return item.periods ?? (item.category ? [roomServiceCategoryPeriod[item.category]] : []);
}

export function isRoomServiceTimeInWindow(time: string, window: RoomServiceAvailabilityWindow): boolean {
  return /^\d{2}:\d{2}$/.test(time) && time >= window.startTime && (window.endTime === '23:00' ? time <= window.endTime : time < window.endTime);
}

/** Food only has explicit departure-day restrictions; beverages retain their normal policy. */
export function isRoomServicePeriodAvailableOnDate(period: RoomServicePeriod, serviceDate: string, deliveryTime: string, context?: RoomServiceCheckoutDayContext): boolean {
  if (!context || serviceDate !== context.departure || period === 'BEVERAGES') return true;
  if (period === 'BREAKFAST') return true;
  if (period === 'LUNCH') return context.hasActiveLateCheckout && deliveryTime <= checkoutDayLateLunchMaxTime;
  return false;
}

export function isRoomServicePeriodAvailableAt(period: RoomServicePeriod, serviceDate: string, deliveryTime: string, context?: RoomServiceCheckoutDayContext): boolean {
  return isRoomServicePeriodAvailableOnDate(period, serviceDate, deliveryTime, context) && getRoomServicePeriodWindows(period).some((window) => isRoomServiceTimeInWindow(deliveryTime, window));
}

export function isRoomServiceItemAvailable(item: RoomServiceMenuItem, serviceDate: string, deliveryTime: string, context?: RoomServiceCheckoutDayContext): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(serviceDate) && getItemPeriods(item).some((period) => isRoomServicePeriodAvailableAt(period, serviceDate, deliveryTime, context));
}

function intersectWindows(left: RoomServiceAvailabilityWindow, right: RoomServiceAvailabilityWindow): RoomServiceAvailabilityWindow | null {
  const startTime = left.startTime > right.startTime ? left.startTime : right.startTime;
  const endTime = left.endTime < right.endTime ? left.endTime : right.endTime;
  return startTime < endTime ? { startTime, endTime } : null;
}

export function getRoomServiceCartAvailabilityWindows(menu: RoomServiceMenu, cart: RoomServiceCartState): readonly RoomServiceAvailabilityWindow[] {
  const selected = cart.items.flatMap((line) => {
    const item = menu.items.find((candidate) => candidate.fixtureKey === line.itemFixtureKey);
    return item ? [{ item, mealPeriod: line.mealPeriod }] : [];
  });
  if (selected.length !== cart.items.length || selected.length === 0) return [];
  return selected.slice(1).reduce<readonly RoomServiceAvailabilityWindow[]>((windows, line) => windows.flatMap((current) => getItemPeriods(line.item, line.mealPeriod).flatMap((period) => getRoomServicePeriodWindows(period).map((candidate) => intersectWindows(current, candidate)).filter((value): value is RoomServiceAvailabilityWindow => value !== null))), getItemPeriods(selected[0].item, selected[0].mealPeriod).flatMap(getRoomServicePeriodWindows));
}

export function hasIncompatibleRoomServiceCartPeriods(menu: RoomServiceMenu, cart: RoomServiceCartState): boolean {
  return cart.items.length > 0 && getRoomServiceCartAvailabilityWindows(menu, cart).length === 0;
}

export function isRoomServiceCartAvailableAt(menu: RoomServiceMenu, cart: RoomServiceCartState, serviceDate: string, deliveryTime: string, context?: RoomServiceCheckoutDayContext): boolean {
  return getRoomServiceCartAvailabilityWindows(menu, cart).some((window) => isRoomServiceTimeInWindow(deliveryTime, window)) && cart.items.every((line) => {
    const item = menu.items.find((candidate) => candidate.fixtureKey === line.itemFixtureKey);
    return item ? getItemPeriods(item, line.mealPeriod).some((period) => isRoomServicePeriodAvailableAt(period, serviceDate, deliveryTime, context)) : false;
  });
}
