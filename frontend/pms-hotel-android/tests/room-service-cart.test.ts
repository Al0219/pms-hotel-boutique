import {
  calculateRoomServiceTotal,
  initialRoomServiceCart,
  isRoomServiceCartValid,
  ROOM_SERVICE_MAX_ITEM_QUANTITY,
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

  it('enforces the frontend/mock maximum of five per line in reducer state', () => {
    let cart = initialRoomServiceCart;
    for (let index = 0; index < ROOM_SERVICE_MAX_ITEM_QUANTITY + 2; index += 1) {
      cart = roomServiceCartReducer(cart, { type: index === 0 ? 'ADD_ITEM' : 'INCREMENT_ITEM', itemFixtureKey: 'coffee' });
    }
    expect(cart.items).toEqual([{ itemFixtureKey: 'coffee', quantity: ROOM_SERVICE_MAX_ITEM_QUANTITY }]);
    expect(isRoomServiceCartValid(cart)).toBe(true);
    expect(isRoomServiceCartValid({ items: [{ itemFixtureKey: 'coffee', quantity: ROOM_SERVICE_MAX_ITEM_QUANTITY + 1 }] })).toBe(false);
  });
});
