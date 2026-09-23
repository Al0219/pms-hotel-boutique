export const roomServiceCategories = ['Desayunos', 'Comidas', 'Bebidas'] as const;

export type RoomServiceCategory = typeof roomServiceCategories[number];

/** Frontend mock menu item. fixtureKey is not a Backend product ID. */
export interface RoomServiceMenuItem {
  fixtureKey: string;
  category: RoomServiceCategory;
  name: string;
  priceAmount: number;
}

export interface RoomServiceMenu {
  items: readonly RoomServiceMenuItem[];
}
