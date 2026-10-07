import { describe, expect, it } from 'vitest';
import { mapPublicAvailabilityToDomain } from '@/modules/availability';
import { backendAvailability } from '@/test/public-availability-fixture';
import { resolveSelection } from '@/modules/booking';
import { accommodationQuote } from './accommodation-quote';

const rooms = mapPublicAvailabilityToDomain(backendAvailability).roomTypes;
const selected = (quantity = 1) => resolveSelection([{ roomTypeId: rooms[0].roomTypeId, ratePlanId: 'DEMO_DELUXE', quantity }], rooms);
describe('Backend accommodation quote', () => {
  it('accepts a real GTQ quote without demo fees', () => {
    expect(accommodationQuote(selected())).toEqual({ currency: 'GTQ', accommodationTotalMinor: 170000, totalMinor: 170000 });
  });
  it('sums stay quotes by quantity rather than nightly prices', () => {
    const items = selected(2);
    items[0].rate = { ...items[0].rate!, nightlyRateMinor: 1, totalMinor: 123456 };
    expect(accommodationQuote([...items, ...selected()])?.totalMinor).toBe(416912);
  });
  it('rejects mixed currency, incomplete or unavailable quotes and overflow', () => {
    const other = selected(); other[0].rate = { ...other[0].rate!, currency: 'USD' };
    expect(accommodationQuote([...selected(), ...other])).toBeNull();
    expect(accommodationQuote(selected(3))).toBeNull(); expect(accommodationQuote([])).toBeNull();
    other[0].rate = { ...other[0].rate!, totalMinor: undefined }; expect(accommodationQuote(other)).toBeNull();
    const overflow = selected(2); overflow[0].rate = { ...overflow[0].rate!, totalMinor: Number.MAX_SAFE_INTEGER }; expect(accommodationQuote(overflow)).toBeNull();
  });
});
