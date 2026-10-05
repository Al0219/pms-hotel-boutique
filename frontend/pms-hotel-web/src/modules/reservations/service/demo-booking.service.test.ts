import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpStatusError } from '@/lib/http/errors';
import { resetPublicCheckoutFixtures } from '@/data/mocks/public-checkout-handlers';
import { confirmDemoBooking } from '../hooks/confirm-demo-booking';
import { mapDemoBooking } from '../mappers/demo-booking.mapper';
import { createDemoBookingDTO } from './demo-booking.service';
import type { DemoBookingRequest } from '../model/demo-booking';

const input: DemoBookingRequest = { idempotencyKey: 'test-demo-key', propertyId: 'prop_boutique_01', checkIn: '2026-10-10', checkOut: '2026-10-13', adults: 2, children: 0, items: [{ roomTypeId: 'rt_deluxe_king', ratePlanId: 'rp_flexible', quantity: 1 }], totalMinor: 50500, guaranteeMinor: 16833, currency: 'USD', card: { token: 'demo_visa_approved', brand: 'Visa', last4: '4242', holderName: 'Carlos Mendoza' }, bookingGuest: { firstName: 'Carlos', lastName: 'Mendoza', email: 'guest@example.com' } };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true'); resetPublicCheckoutFixtures(); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
const signal = () => new AbortController().signal;
describe('Frontend-only atomic checkout contract', () => {
  it('deduplicates identical submissions and rejects a reused key with another payload', async () => {
    const first = await confirmDemoBooking(input, signal()); const second = await confirmDemoBooking(input, signal());
    expect(second.reservationId).toBe(first.reservationId); expect(second.guarantee.paymentId).toBe(first.guarantee.paymentId); expect(first.stays).toHaveLength(1);
    await expect(confirmDemoBooking({ ...input, adults: 3 }, signal())).rejects.toMatchObject({ status: 409 });
  });
  it('preserves one reservation with multiple stays and validates price/scope/guarantee in mapping', async () => {
    const request = { ...input, items: [{ ...input.items[0], quantity: 2 }], totalMinor: 101000, guaranteeMinor: 33667 };
    const dto = await createDemoBookingDTO(request, signal()); expect(mapDemoBooking(dto, request).stays).toHaveLength(2);
    expect(() => mapDemoBooking({ ...dto, property_id: 'other' }, request)).toThrow('BOOKING_SCOPE_OR_PRICE_MISMATCH');
    expect(() => mapDemoBooking({ ...dto, remaining_minor: 1 }, request)).toThrow('BOOKING_SCOPE_OR_PRICE_MISMATCH');
    expect(() => mapDemoBooking({ ...dto, stays: [dto.stays[0]] }, request)).toThrow('BOOKING_STAYS_MISMATCH');
    expect(() => mapDemoBooking({ ...dto, guarantee: { ...dto.guarantee, status: 'AUTHORIZED' } }, request)).toThrow('GUARANTEE_NOT_CONFIRMED');
  });
  it('rejects decline, provider failure, ATS exhaustion and stale quotes without creating success', async () => {
    await expect(confirmDemoBooking({ ...input, card: { ...input.card, token: 'demo_card_declined', last4: '0002' } }, signal())).rejects.toMatchObject({ status: 422 });
    await expect(confirmDemoBooking({ ...input, card: { ...input.card, token: 'demo_gateway_error' } }, signal())).rejects.toMatchObject({ status: 503 });
    await expect(confirmDemoBooking({ ...input, items: [{ ...input.items[0], quantity: 3 }] }, signal())).rejects.toMatchObject({ status: 409 });
    await expect(confirmDemoBooking({ ...input, totalMinor: 1 }, signal())).rejects.toBeInstanceOf(HttpStatusError);
    const success = await confirmDemoBooking(input, signal()); expect(success.reservationId).toMatch(/-8942$/);
  });
  it('sends only allowed metadata and makes no request with mocks disabled', async () => {
    const spy = vi.spyOn(globalThis, 'fetch'); await confirmDemoBooking(input, signal());
    const [, options] = spy.mock.calls[0]; const body = JSON.parse(options!.body as string);
    expect(body.card_token).toBe('demo_visa_approved'); expect(Object.keys(body)).not.toContain('pan'); expect(Object.keys(body)).not.toContain('cvv');
    expect(new Headers(options!.headers).get('Idempotency-Key')).toBe(input.idempotencyKey);
    spy.mockClear(); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false'); await expect(confirmDemoBooking(input, signal())).rejects.toThrow('CHECKOUT_DEMO_DISABLED'); expect(spy).not.toHaveBeenCalled();
  });
});
