/** Confirmed Backend contract55. Amounts are integer minor units; dates are hotel calendar days. */
export interface StaffBookingSearchDto { arrival: string; departure: string; rooms: number }
export interface StaffBookingQuoteDto extends StaffBookingSearchDto {
  propertyId: string; nights: number; currency: string;
  options: { roomTypeId: string; roomTypeName: string; ratePlanId: string; availableRooms: number; nightlyMinor: number; totalMinor: number }[];
}
export interface StaffBookingRequestDto extends StaffBookingSearchDto {
  roomTypeId: string; ratePlanId: string; currency: string; clientTotalMinor: number;
  guest: { firstName: string; lastName: string; email: string; phone: string }; notes: string | null;
}
export interface StaffBookingReceiptDto { operationId: string; propertyId: string; reservationId: string; completedAt: string }
