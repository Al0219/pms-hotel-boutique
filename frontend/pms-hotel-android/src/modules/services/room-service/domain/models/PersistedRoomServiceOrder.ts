import type { RoomServicePeriod } from './RoomServiceMenu';
export interface PersistedRoomServiceOrder {
  id: string; reservationId: string; stayId: string; confirmationCode: string;
  serviceDate: string; deliveryTime: string; totalMinor: number; notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; createdAt: string; updatedAt: string; modifiableUntil: string;
  items: { productId: string; productName: string; mealPeriod: RoomServicePeriod; quantity: number; unitPriceMinor: number; lineTotalMinor: number }[];
}
