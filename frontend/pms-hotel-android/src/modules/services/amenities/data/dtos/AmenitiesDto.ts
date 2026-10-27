export interface AmenityCatalogDto { id: string; code: string; name: string; }
export interface AmenitiesRequestDto {
  id: string; reservationId: string; stayId: string; propertyId: string; confirmationCode: string; roomCode: string | null;
  serviceDate: string; deliveryTime: string; notes: string | null; status: string;
  createdAt: string; updatedAt: string; modifiableUntil: string;
  items: { itemId: string; itemName: string; quantity: number }[];
}
