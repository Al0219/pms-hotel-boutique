import {
  calculateRoomServiceTotal,
  initialRoomServiceCart,
  roomServiceCartReducer,
  roomServiceMenuFixture,
} from '@/modules/services/room-service';

describe('Room Service cart reducer', () => {
  it('adds, increments, decrements, removes, and derives the total without storing it', () => {
    const withBreakfast = roomServiceCartReducer(initialRoomServiceCart, { type: 'ADD_ITEM', itemFixtureKey: 'continental-breakfast' });
    const incremented = roomServiceCartReducer(withBreakfast, { type: 'INCREMENT_ITEM', itemFixtureKey: 'continental-breakfast' });
    const withCoffee = roomServiceCartReducer(incremented, { type: 'ADD_ITEM', itemFixtureKey: 'coffee' });

    expect(withCoffee.items).toEqual([
      { itemFixtureKey: 'continental-breakfast', quantity: 2 },
      { itemFixtureKey: 'coffee', quantity: 1 },
    ]);
    expect(calculateRoomServiceTotal(roomServiceMenuFixture, withCoffee)).toBe(170);

    const decremented = roomServiceCartReducer(withCoffee, { type: 'DECREMENT_ITEM', itemFixtureKey: 'continental-breakfast' });
    const removedAtOne = roomServiceCartReducer(decremented, { type: 'DECREMENT_ITEM', itemFixtureKey: 'continental-breakfast' });
    expect(removedAtOne.items).toEqual([{ itemFixtureKey: 'coffee', quantity: 1 }]);
    expect(roomServiceCartReducer(removedAtOne, { type: 'REMOVE_ITEM', itemFixtureKey: 'coffee' })).toEqual(initialRoomServiceCart);
  });
});
