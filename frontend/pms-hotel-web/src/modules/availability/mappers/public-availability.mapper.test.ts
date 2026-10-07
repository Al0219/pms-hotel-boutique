import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { backendAvailability, publicRoomTypeId } from '@/test/public-availability-fixture';
import { mapPublicAvailabilityToDomain } from './public-availability.mapper';

const mapOffer = (offer: object) => mapPublicAvailabilityToDomain({ ...backendAvailability, offers: [{ ...backendAvailability.offers[0], ...offer }] });
describe('Confirmed public availability mapper', () => {
  it('preserves real IDs, name, code, ATS, currency and integer quotes', () => {
    const result = mapPublicAvailabilityToDomain(backendAvailability);
    expect(result.totalNights).toBe(2);
    expect(result.roomTypes[0]).toMatchObject({ roomTypeId: publicRoomTypeId, code: 'DLX', name: 'Deluxe real', availableRoomsCount: 2,
      maxOccupancy: null, images: expect.any(Array), ratePlans: [{ ratePlanId: 'DEMO_DELUXE', ratePlanCode: 'DEMO_DELUXE',
        currency: 'GTQ', nightlyRateMinor: 85000, totalMinor: 170000, baseNightlyRate: 850, totalAmount: 1700,
        cancellationPolicy: null, mealsIncluded: null }] });
    expect(result.roomTypes[0].ratePlans[0].priceBreakdown).toBeUndefined();
  });
  it('uses the exact Backend total rather than recalculating or applying a demo price', () => {
    expect(mapOffer({ nightlyRateMinor: 77777, totalMinor: 123456 }).roomTypes[0].ratePlans[0]).toMatchObject({ baseNightlyRate: 777.77, totalAmount: 1234.56, totalMinor: 123456 });
  });
  it('joins editorial metadata by exact code without changing Backend authority', () => {
    const room = mapOffer({ roomTypeCode: 'DLX-KNG' }).roomTypes[0];
    expect(room.images).toHaveLength(3); expect(room.description).toBeTruthy();
    expect(room).toMatchObject({ roomTypeId: publicRoomTypeId, name: 'Deluxe real', code: 'DLX-KNG', availableRoomsCount: 2, maxOccupancy: null });
    expect(room.ratePlans[0]).toMatchObject({ ratePlanId: 'DEMO_DELUXE', baseNightlyRate: 850, totalAmount: 1700 });
  });
  it('does not infer metadata for unknown codes or from a name', () => {
    const room = mapOffer({ roomTypeCode: 'UNKNOWN', roomTypeName: 'Deluxe King' }).roomTypes[0];
    expect(room.images).toEqual([]); expect(room.description).toBeNull(); expect(room.maxOccupancy).toBeNull();
  });
  it('keeps offers=[] empty', () => { expect(mapPublicAvailabilityToDomain({ ...backendAvailability, offers: [] }).roomTypes).toEqual([]); });
  it('maps STD, DLX and SUITE prices and units from the confirmed offers', () => {
    const result = mapPublicAvailabilityToDomain({ ...backendAvailability, offers: [
      { ...backendAvailability.offers[0], roomTypeId: '51bf6a2b-90be-4b36-8c8f-318c2c856273', roomTypeCode: 'STD', roomTypeName: 'Standard real', ratePlanId: 'DEMO_STANDARD', ratePlanCode: 'DEMO_STANDARD', nightlyRateMinor: 65000, totalMinor: 130000 },
      backendAvailability.offers[0],
      { ...backendAvailability.offers[0], roomTypeId: '7f06a0bd-d19c-4d2d-bd1f-c6b596c58877', roomTypeCode: 'SUITE', roomTypeName: 'Suite real', ratePlanId: 'DEMO_SUITE', ratePlanCode: 'DEMO_SUITE', nightlyRateMinor: 120000, totalMinor: 240000 },
    ] });
    expect(result.roomTypes.map(room => [room.code, room.availableRoomsCount, room.ratePlans[0].baseNightlyRate, room.ratePlans[0].totalAmount])).toEqual([
      ['STD', 2, 650, 1300], ['DLX', 2, 850, 1700], ['SUITE', 2, 1200, 2400],
    ]);
  });
  it.each([{ roomTypeId: 'rt_deluxe_king' }, { ratePlanId: '' }, { roomTypeCode: '' }, { availableUnits: -1 },
    { nightlyRateMinor: 1.5 }, { totalMinor: Number.MAX_SAFE_INTEGER + 1 }, { totalMinor: null }])('rejects malformed required offer fields %j', offer => {
    expect(() => mapOffer(offer)).toThrow(DomainMappingError);
  });
  it('rejects invalid dates and currency rather than converting', () => {
    expect(() => mapPublicAvailabilityToDomain({ ...backendAvailability, currency: 'USD' })).toThrow(DomainMappingError);
    expect(() => mapPublicAvailabilityToDomain({ ...backendAvailability, arrival: '2026-02-30' })).toThrow(DomainMappingError);
  });
});

it.each(['STD','CLASSIC','TWIN','KING','DLX','SUITE'])('uses a licensed 3-photo gallery for %s while preserving Backend authority', code => {
  const room = mapOffer({ roomTypeCode: code, nightlyRateMinor: 77777, totalMinor: 123456 }).roomTypes[0];
  expect(room.images).toHaveLength(3); expect(room.images.every(path => path.startsWith('/images/rooms/local-demo/'))).toBe(true);
  expect(room.images.every(image=>image.startsWith('/images/rooms/local-demo/pexels-'))).toBe(true);
  expect(room).toMatchObject({ roomTypeId: publicRoomTypeId, code, maxOccupancy: null, availableRoomsCount: 2 });
  expect(room.ratePlans[0]).toMatchObject({ ratePlanId: 'DEMO_DELUXE', nightlyRateMinor: 77777, totalMinor: 123456 });
});
