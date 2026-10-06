import { getPublicEnvironment } from '@/lib/env';
import { httpRequest } from '@/lib/http/client';
import type { DemoBookingRequest } from '../model/demo-booking';
import type { DemoBookingConfirmationDTO } from '../dtos/demo-booking.dto';

export function createDemoBookingDTO(request: DemoBookingRequest, signal: AbortSignal) {
  if (!getPublicEnvironment().useMockApi) return Promise.reject(new Error('CHECKOUT_DEMO_DISABLED'));
  return httpRequest<DemoBookingConfirmationDTO>({ path: 'http://pms.test/__mock/checkout/confirmations', method: 'POST', signal, headers: { 'Content-Type': 'application/json', 'Idempotency-Key': request.idempotencyKey }, body: JSON.stringify({
    property_id: request.propertyId, arrival: request.checkIn, departure: request.checkOut, adults: request.adults, children: request.children,
    stays: request.items.map(item => ({ room_type_id: item.roomTypeId, rate_plan_id: item.ratePlanId, quantity: item.quantity })),
    total_minor: request.totalMinor, guarantee_minor: request.guaranteeMinor, currency: request.currency,
    card_token: request.card.token, last4: request.card.last4, card_brand: request.card.brand, card_holder_name: request.card.holderName,
    booking_guest: { first_name: request.bookingGuest.firstName, last_name: request.bookingGuest.lastName, email: request.bookingGuest.email },
  }) });
}
