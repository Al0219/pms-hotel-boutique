import { getRoomServiceCartAvailabilityWindows, hasIncompatibleRoomServiceCartPeriods, isRoomServiceCartAvailableAt, isRoomServiceItemAvailable, isRoomServicePeriodAvailableAt, roomServiceMenuFixture } from '@/modules/services/room-service';

describe('Room Service availability policy', () => {
  const breakfast = roomServiceMenuFixture.items.find((item) => item.fixtureKey === 'continental-breakfast')!;
  const lunch = roomServiceMenuFixture.items.find((item) => item.fixtureKey === 'club-sandwich')!;
  const dinner = roomServiceMenuFixture.items.find((item) => item.fixtureKey === 'house-burger')!;
  const coffee = roomServiceMenuFixture.items.find((item) => item.fixtureKey === 'coffee')!;
  const date = '2026-09-12';

  it.each([['06:29', false], ['06:30', true], ['11:29', true], ['11:30', false]])('applies breakfast boundary %s', (time, expected) => expect(isRoomServicePeriodAvailableAt('BREAKFAST', date, time)).toBe(expected));
  it.each([['11:29', false], ['11:30', true], ['16:59', true], ['17:00', false]])('applies lunch boundary %s', (time, expected) => expect(isRoomServicePeriodAvailableAt('LUNCH', date, time)).toBe(expected));
  it.each([['16:59', false], ['17:00', true], ['21:59', true], ['22:00', false]])('applies dinner boundary %s', (time, expected) => expect(isRoomServicePeriodAvailableAt('DINNER', date, time)).toBe(expected));
  it.each([['06:29', false], ['06:30', true], ['23:00', true], ['23:01', false]])('applies beverage boundary %s', (time, expected) => expect(isRoomServicePeriodAvailableAt('BEVERAGES', date, time)).toBe(expected));

  it('intersects beverage windows with a meal and blocks incompatible meals', () => {
    const breakfastCoffee = { items: [{ itemFixtureKey: breakfast.fixtureKey, quantity: 1 }, { itemFixtureKey: coffee.fixtureKey, quantity: 1 }] };
    const lunchCoffee = { items: [{ itemFixtureKey: lunch.fixtureKey, quantity: 1 }, { itemFixtureKey: coffee.fixtureKey, quantity: 1 }] };
    const incompatible = { items: [{ itemFixtureKey: breakfast.fixtureKey, quantity: 1 }, { itemFixtureKey: dinner.fixtureKey, quantity: 1 }] };
    expect(isRoomServiceCartAvailableAt(roomServiceMenuFixture, breakfastCoffee, date, '10:00')).toBe(true);
    expect(isRoomServiceCartAvailableAt(roomServiceMenuFixture, lunchCoffee, date, '13:00')).toBe(true);
    expect(hasIncompatibleRoomServiceCartPeriods(roomServiceMenuFixture, incompatible)).toBe(true);
    expect(getRoomServiceCartAvailabilityWindows(roomServiceMenuFixture, incompatible)).toEqual([]);
  });
  it('applies the departure-day food override without changing beverages', () => {
    const withoutLate = { departure: '2026-09-18', hasActiveLateCheckout: false };
    const withLate = { departure: '2026-09-18', hasActiveLateCheckout: true };
    expect(isRoomServiceItemAvailable(breakfast, '2026-09-18', '11:29', withoutLate)).toBe(true);
    expect(isRoomServiceItemAvailable(lunch, '2026-09-18', '11:30', withoutLate)).toBe(false);
    expect(isRoomServiceItemAvailable(dinner, '2026-09-18', '17:00', withoutLate)).toBe(false);
    expect(isRoomServiceItemAvailable(coffee, '2026-09-18', '11:30', withoutLate)).toBe(true);
    expect(isRoomServiceItemAvailable(lunch, '2026-09-18', '13:29', withLate)).toBe(true);
    expect(isRoomServiceItemAvailable(lunch, '2026-09-18', '13:30', withLate)).toBe(true);
    expect(isRoomServiceItemAvailable(lunch, '2026-09-18', '13:31', withLate)).toBe(false);
    expect(isRoomServiceItemAvailable(dinner, '2026-09-18', '17:00', withLate)).toBe(false);
  });
  it('does not apply the departure-day override to an intermediate stay date', () => {
    const context = { departure: '2026-09-18', hasActiveLateCheckout: false };
    expect(isRoomServiceItemAvailable(lunch, '2026-09-17', '11:30', context)).toBe(true);
    expect(isRoomServiceItemAvailable(dinner, '2026-09-17', '17:00', context)).toBe(true);
  });
});
