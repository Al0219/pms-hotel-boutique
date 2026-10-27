export interface PersistedAmenitiesRequest {
  id: string; reservationId: string; stayId: string; confirmationCode: string;
  serviceDate: string; deliveryTime: string; notes: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'; createdAt: string; updatedAt: string; modifiableUntil: string;
  items: { itemId: string; itemName: string; quantity: number }[];
}
