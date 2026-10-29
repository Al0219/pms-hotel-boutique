export interface RoomServiceProductDto {
  id: string; code: string; name: string; periods: string[]; unitPriceMinor: number; currency: string; available: boolean;
}
export interface RoomServiceOrderDto {
  id: string; reservationId: string; stayId: string; propertyId: string; confirmationCode: string; roomCode: string | null;
  serviceDate: string; deliveryTime: string; currency: string; totalMinor: number; notes: string | null;
  status: string; createdAt: string; updatedAt: string; modifiableUntil: string;
  items: { productId: string; productName: string; mealPeriod: string; quantity: number; unitPriceMinor: number; lineTotalMinor: number }[];
}
