import type { DemoCardToken, PaymentGuaranteeResult } from '@/modules/payments';

/** Frontend-only atomic booking/guarantee demonstration, not a confirmed Backend request. */
export interface DemoBookingRequest {
  idempotencyKey: string; propertyId: string; checkIn: string; checkOut: string; adults: number; children: number;
  items: { roomTypeId: string; ratePlanId: string; quantity: number }[];
  totalMinor: number; guaranteeMinor: number; currency: string; card: DemoCardToken;
  bookingGuest: { firstName: string; lastName: string; email: string };
}
export interface DemoBookingConfirmation {
  reservationId: string; propertyId: string; arrival: string; departure: string; confirmedAt: string;
  totalMinor: number; guaranteeMinor: number; remainingMinor: number; currency: string;
  stays: { id: string; roomTypeId: string; ratePlanId: string; roomName: string }[];
  guarantee: PaymentGuaranteeResult;
}
