import { describe, expect, it } from 'vitest';
import { mapStaffBookingQuote, mapStaffBookingReceipt } from './staff-booking.mapper';
const propertyId = '11111111-1111-1111-1111-111111111111', roomTypeId = '22222222-2222-2222-2222-222222222222';
const search = { arrival: '2035-01-01', departure: '2035-01-03', rooms: 2 };
const option = { roomTypeId, roomTypeName: 'Standard', ratePlanId: 'DEMO_STANDARD', availableRooms: 3, nightlyMinor: 65000, totalMinor: 260000 };
const quote = { propertyId, ...search, currency: 'GTQ', nights: 2, options: [option] };
describe('confirmed Staff booking mappings', () => {
  it('keeps exact hotel dates and GTQ cents without inventing capacity', () => {
    expect(mapStaffBookingQuote(quote, propertyId, search)).toEqual(quote);
    expect(mapStaffBookingQuote({ ...quote, options: [] }, propertyId, search).options).toEqual([]);
    expect(mapStaffBookingQuote(quote, propertyId, search).options[0]).not.toHaveProperty('capacity');
  });
  it.each([{ propertyId: roomTypeId }, { rooms: 1 }, { nights: 1 }, { departure: '2035-01-04' }, { currency: 'USD' }])('rejects a mismatched quote %j', patch => {
    expect(() => mapStaffBookingQuote({ ...quote, ...patch }, propertyId, search)).toThrow();
  });
  it.each([{ totalMinor: 130000 }, { nightlyMinor: 0 }, { availableRooms: 1 }, { totalMinor: Number.MAX_SAFE_INTEGER+1 }, { roomTypeId: '' }])('rejects inconsistent prices/inventory %j', patch => {
    expect(() => mapStaffBookingQuote({ ...quote, options: [{ ...option, ...patch }] }, propertyId, search)).toThrow();
  });
  it('rejects duplicate options', () => expect(() => mapStaffBookingQuote({ ...quote, options: [option, option] }, propertyId, search)).toThrow());
  it('projects only the immutable receipt fields', () => {
    const receipt = { propertyId, operationId: roomTypeId, reservationId: '33333333-3333-3333-3333-333333333333', completedAt: '2035-01-01T12:00:00.123456Z' };
    expect(mapStaffBookingReceipt({ ...receipt, accessToken: 'must-not-propagate' }, propertyId)).toEqual(receipt);
    expect(() => mapStaffBookingReceipt({ ...receipt, propertyId: roomTypeId }, propertyId)).toThrow();
    expect(() => mapStaffBookingReceipt({ ...receipt, completedAt: '2035-01-01T12:00:00' }, propertyId)).toThrow();
  });
});
