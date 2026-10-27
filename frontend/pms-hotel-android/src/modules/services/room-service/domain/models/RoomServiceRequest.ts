/** Cart input has no prices or Guest/Stay authority. The real adapter selects its authorized route context. */
import type { RoomServicePeriod } from './RoomServiceMenu';
export interface RoomServiceRequest {
  items: readonly {
    itemFixtureKey: string;
    quantity: number;
    mealPeriod?: RoomServicePeriod;
  }[];
  deliveryTime: string;
  serviceDate: string;
  notes?: string;
}
