import { describe, expect, it } from 'vitest';
import { resolveSelection } from '@/modules/booking';
import type { AvailableRoomType } from '@/modules/availability';
import { paymentEstimate } from './payment-estimate';

function items(total = 505, quantity = 1) {
  const rooms: AvailableRoomType[] = [{ roomTypeId: 'room', name: 'Room', code: 'R', description: null, maxOccupancy: 2, availableRoomsCount: 3, images: [], ratePlans: [{ ratePlanId: 'rate', name: 'Rate', description: null, baseNightlyRate: 145, totalAmount: 435, currency: 'USD', cancellationPolicy: 'Example', mealsIncluded: null, priceBreakdown: { serviceCharge: 22, estimatedTaxes: 48, estimatedTotal: total } }] }];
  return resolveSelection([{ roomTypeId: 'room', ratePlanId: 'rate', quantity }], rooms);
}
describe('Illustrative guarantee in minor units', () => {
  it('rounds one night and assigns the exact remaining cents', () => {
    expect(paymentEstimate(items(), 3)).toEqual({ currency: 'USD', totalMinor: 50500, guaranteeMinor: 16833, remainingMinor: 33667 });
    expect(paymentEstimate(items(), 1)?.remainingMinor).toBe(0);
    const multiple = paymentEstimate(items(505, 2), 3)!;
    expect(multiple.totalMinor).toBe(101000); expect(multiple.guaranteeMinor + multiple.remainingMinor).toBe(multiple.totalMinor);
  });
  it('rejects incomplete, invalid or mixed-currency quotes', () => {
    expect(paymentEstimate(items(), 0)).toBeNull(); expect(paymentEstimate([], 3)).toBeNull(); expect(paymentEstimate(items(505, 4), 3)).toBeNull();
    const unknown = items(); delete unknown[0].rate!.priceBreakdown; expect(paymentEstimate(unknown, 3)).toBeNull();
    const mixed = items(); mixed[0].rate = { ...mixed[0].rate!, currency: 'GTQ' }; expect(paymentEstimate([...items(), ...mixed], 3)).toBeNull();
  });
});
