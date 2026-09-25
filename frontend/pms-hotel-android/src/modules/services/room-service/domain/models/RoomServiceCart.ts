import { type RoomServiceMenu, type RoomServicePeriod } from '@/modules/services/room-service/domain/models/RoomServiceMenu';

export interface RoomServiceCartLine {
  itemFixtureKey: string;
  quantity: number;
  /** Food added from a dual-period category keeps that category's meal period. */
  mealPeriod?: RoomServicePeriod;
}

export interface RoomServiceCartState {
  items: readonly RoomServiceCartLine[];
}

/** Frontend/mock business rule; it is not inventory or Backend stock. */
export const ROOM_SERVICE_MIN_ITEM_QUANTITY = 1;
export const ROOM_SERVICE_MAX_ITEM_QUANTITY = 5;

export function isRoomServiceCartValid(cart: RoomServiceCartState): boolean {
  return cart.items.every((line) => line.quantity >= ROOM_SERVICE_MIN_ITEM_QUANTITY && line.quantity <= ROOM_SERVICE_MAX_ITEM_QUANTITY);
}

export type RoomServiceCartAction =
  | { type: 'ADD_ITEM'; itemFixtureKey: string; mealPeriod?: RoomServicePeriod }
  | { type: 'INCREMENT_ITEM'; itemFixtureKey: string }
  | { type: 'DECREMENT_ITEM'; itemFixtureKey: string }
  | { type: 'REMOVE_ITEM'; itemFixtureKey: string }
  | { type: 'SET_ITEMS'; items: readonly RoomServiceCartLine[] }
  | { type: 'CLEAR' };

export const initialRoomServiceCart: RoomServiceCartState = { items: [] };

/** Local UI cart only. Totals are derived from this state and the menu. */
export function roomServiceCartReducer(
  state: RoomServiceCartState,
  action: RoomServiceCartAction,
): RoomServiceCartState {
  if (action.type === 'CLEAR') return initialRoomServiceCart;
  if (action.type === 'SET_ITEMS') {
    const next = { items: action.items };
    return isRoomServiceCartValid(next) ? next : state;
  }

  const line = state.items.find((item) => item.itemFixtureKey === action.itemFixtureKey);

  if (action.type === 'ADD_ITEM' || action.type === 'INCREMENT_ITEM') {
    if (line && line.quantity >= ROOM_SERVICE_MAX_ITEM_QUANTITY) return state;
    return {
      items: line
        ? state.items.map((item) => item.itemFixtureKey === action.itemFixtureKey
          ? { ...item, quantity: item.quantity + 1 }
          : item)
        : [...state.items, { itemFixtureKey: action.itemFixtureKey, quantity: 1, ...(action.type === 'ADD_ITEM' && action.mealPeriod ? { mealPeriod: action.mealPeriod } : {}) }],
    };
  }

  if (action.type === 'REMOVE_ITEM') {
    return { items: state.items.filter((item) => item.itemFixtureKey !== action.itemFixtureKey) };
  }

  if (!line) return state;

  if (line.quantity === 1) {
    return { items: state.items.filter((item) => item.itemFixtureKey !== action.itemFixtureKey) };
  }

  return {
    items: state.items.map((item) => item.itemFixtureKey === action.itemFixtureKey
      ? { ...item, quantity: item.quantity - 1 }
      : item),
  };
}

export function calculateRoomServiceTotal(menu: RoomServiceMenu, cart: RoomServiceCartState): number {
  return cart.items.reduce((total, line) => {
    const item = menu.items.find((menuItem) => menuItem.fixtureKey === line.itemFixtureKey);
    return total + (item ? item.priceAmount * line.quantity : 0);
  }, 0);
}
