export const roomServiceCategories = ['Desayunos', 'Almuerzos', 'Cenas', 'Bebidas'] as const;

export type RoomServiceCategory = typeof roomServiceCategories[number];
export type RoomServicePeriod = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'BEVERAGES';

export const roomServiceCategoryPeriod: Readonly<Record<RoomServiceCategory, RoomServicePeriod>> = {
  Desayunos: 'BREAKFAST',
  Almuerzos: 'LUNCH',
  Cenas: 'DINNER',
  Bebidas: 'BEVERAGES',
};

export interface RoomServiceAvailabilityWindow { startTime: string; endTime: string; }

/** Frontend mock menu item. fixtureKey is not a Backend product ID. */
export interface RoomServiceMenuItem {
  fixtureKey: string;
  /** One product can be offered in several periods; category remains legacy mock compatibility only. */
  periods?: readonly RoomServicePeriod[];
  category?: RoomServiceCategory;
  name: string;
  priceAmount: number;
}

export interface RoomServiceMenu {
  items: readonly RoomServiceMenuItem[];
}
