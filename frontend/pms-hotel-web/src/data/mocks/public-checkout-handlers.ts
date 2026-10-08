import { delay, http, HttpResponse } from 'msw';
import { demoCardOptions } from '@/modules/payments/model/demo-card';
import type { DemoBookingConfirmationDTO } from '@/modules/reservations/dtos/demo-booking.dto';
import { publicCatalogueFixture } from './public-catalogue';
import { buildPublicAvailabilityMock } from './public-availability';

const confirmations = new Map<string, { fingerprint: string; response: DemoBookingConfirmationDTO }>();
export function resetPublicCheckoutFixtures() { confirmations.clear(); }

/** Atomic MSW simulation only: no provider, inventory mutation, email or persistent reservation. */
export const publicCheckoutHandlers = [http.post('http://pms.test/__mock/checkout/confirmations', async ({ request }) => {
  const input = await request.json() as Record<string, unknown>;
  const key = request.headers.get('Idempotency-Key');
  const reject = (code: string, status = 400) => HttpResponse.json({ code }, { status });
  if (!key || key.length > 80 || Object.keys(input).some(field => !['property_id','arrival','departure','adults','children','stays','total_minor','guarantee_minor','currency','card_token','last4','card_brand','card_holder_name','booking_guest'].includes(field))) return reject('INVALID_DEMO_INPUT');
  const fingerprint = JSON.stringify(input);
  await delay(800);
  if (request.signal.aborted) return reject('REQUEST_CANCELLED', 409);
  const previous = confirmations.get(key);
  if (previous) return previous.fingerprint === fingerprint ? HttpResponse.json(previous.response) : reject('IDEMPOTENCY_CONFLICT', 409);
  if (input.property_id !== publicCatalogueFixture.property_id || !Array.isArray(input.stays) || !input.stays.length) return reject('INVALID_DEMO_SELECTION');
  const card = demoCardOptions.find(item => item.token === input.card_token && item.brand === input.card_brand && item.last4 === input.last4);
  const booker = input.booking_guest as Record<string, unknown> | undefined;
  if (!card || typeof input.card_holder_name !== 'string' || !input.card_holder_name.trim() || !booker || typeof booker.first_name !== 'string' || !booker.first_name.trim() || typeof booker.last_name !== 'string' || !booker.last_name.trim() || typeof booker.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booker.email)) return reject('INVALID_DEMO_CONTACT_OR_TOKEN');
  const items = input.stays as { room_type_id: string; rate_plan_id: string; quantity: number }[];
  if (items.some(item => !item || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) || new Set(items.map(item => item.room_type_id)).size !== items.length) return reject('INVALID_DEMO_SELECTION');
  const query = new URLSearchParams({ check_in_date: String(input.arrival), check_out_date: String(input.departure), adults: String(input.adults), children: String(input.children), rooms_count: String(items.reduce((total, item) => total + item.quantity, 0)) });
  const quote = buildPublicAvailabilityMock(query, publicCatalogueFixture);
  if (!quote) return reject('INVALID_DEMO_DATES');
  let total = 0;
  for (const item of items) {
    const room = quote.available_room_types.find(room => room.room_type_id === item.room_type_id);
    const rate = room?.rate_plans.find(rate => rate.rate_plan_id === item.rate_plan_id);
    if (!room || !rate?.stay_price_breakdown || room.available_rooms_count < item.quantity) return reject('INVENTORY_CHANGED', 409);
    if (rate.currency !== input.currency) return reject('QUOTE_CHANGED', 409);
    total += Math.round(Number(rate.stay_price_breakdown.estimated_total) * 100) * item.quantity;
  }
  const minimum = Math.round(total / quote.total_nights);
  const guarantee = input.guarantee_minor as number;
  if (total !== input.total_minor) return reject('QUOTE_CHANGED', 409);
  if (!Number.isSafeInteger(guarantee) || guarantee < minimum || guarantee > total) return reject('INVALID_DEMO_DEPOSIT');
  if (input.card_token === 'demo_card_declined') return reject('DEMO_CARD_DECLINED', 422);
  if (input.card_token === 'demo_gateway_error') return reject('DEMO_GATEWAY_UNAVAILABLE', 503);
  const reservationId = `HB-${new Date().getUTCFullYear()}-${8942 + confirmations.size}`;
  const response: DemoBookingConfirmationDTO = {
    reservation_id: reservationId, property_id: quote.property_id, arrival: quote.check_in_date, departure: quote.check_out_date, status: 'CONFIRMED', confirmed_at: new Date().toISOString(),
    total_minor: total, guarantee_minor: guarantee, remaining_minor: total - guarantee, currency: String(input.currency),
    stays: items.flatMap(item => Array.from({ length: item.quantity }, (_, index) => ({ stay_id: `${reservationId}-ST-${item.room_type_id}-${index + 1}`, room_type_id: item.room_type_id, rate_plan_id: item.rate_plan_id, room_name: quote.available_room_types.find(room => room.room_type_id === item.room_type_id)!.name }))),
    guarantee: { payment_id: `DEMO-PAY-${reservationId}`, status: 'CAPTURED', amount: (guarantee / 100).toFixed(2), currency: String(input.currency), provider_reference: `DEMO-PSP-${reservationId}`, last4: card.last4, card_brand: card.brand, created_at: new Date().toISOString(), failure_reason: null },
  };
  confirmations.set(key, { fingerprint, response });
  return HttpResponse.json(response, { status: 201 });
})];
