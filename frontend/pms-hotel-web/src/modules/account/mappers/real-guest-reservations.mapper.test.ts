import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { guestHistoryAccount as owner, guestHistoryPage as page, guestHistoryDetail as detail, guestHistoryReservation as item, guestLinkRequestId } from '@/test/real-guest-reservations-fixture';
import { mapRealGuestReservationPage, mapRealGuestReservationDetail, mapRealLinkChallenge, mapRealLinkVerification } from './real-guest-reservations.mapper';
import { guestStayNights, guestDateLabel } from '../model/real-guest-reservations';

describe('approved Guest history projection', () => {
  it('preserves linked multiple stays and local dates without fabricating financial fields', () => {
    const second = { ...item.stays[0], reservationStayId: guestLinkRequestId, status: 'CHECKED_OUT' };
    const input = { ...page, items: [{ ...item, stays: [...item.stays, second] }] };
    expect(mapRealGuestReservationPage(input, owner, 0, 20)).toEqual(input);
    expect(guestStayNights(item.stays[0])).toBe(3);
    expect(guestDateLabel('2026-12-28')).toContain('28');
  });
  it('projects only approved nested fields and allows a nullable booker or a pending empty container', () => {
    const input = { ...detail, accessToken: 'private', reservation: { ...item, bookingGuestName: null, status: 'PENDING', stays: [], notes: 'staff only', totalMinor: 500 } };
    expect(mapRealGuestReservationDetail(input, owner, item.reservationId)).toEqual({ ...detail, reservation: { ...item, bookingGuestName: null, status: 'PENDING', stays: [] } });
  });
  it('accepts a genuine empty page and an out-of-range page with the correct total', () => {
    expect(mapRealGuestReservationPage({ ...page, totalElements: 0, items: [] }).items).toEqual([]);
    expect(mapRealGuestReservationPage({ ...page, page: 1, items: [] }).totalElements).toBe(1);
  });
  it('rejects a mismatched account, page, page size or detail id', () => {
    for (const read of [() => mapRealGuestReservationPage(page, guestLinkRequestId), () => mapRealGuestReservationPage(page, owner, 1), () => mapRealGuestReservationPage(page, owner, 0, 10), () => mapRealGuestReservationDetail(detail, owner, guestLinkRequestId)]) expect(read).toThrow(DomainMappingError);
  });
  it.each([
    { ...page, totalElements: 0 }, { ...page, page: -1 }, { ...page, size: 51 }, { ...page, items: [item, item], totalElements: 2 },
    { ...page, items: [{ ...item, bookingGuestName: undefined }] }, { ...page, items: [{ ...item, propertyTimeZone: 'invalid-zone' }] },
    { ...page, items: [{ ...item, status: 'IN_HOUSE' }] }, { ...page, items: [{ ...item, stays: [{ ...item.stays[0], arrival: '2026-02-30' }] }] },
    { ...page, items: [{ ...item, stays: [{ ...item.stays[0], departure: item.stays[0].arrival }] }] },
    { ...page, items: [{ ...item, stays: [...item.stays, ...item.stays] }] },
  ])('rejects malformed or contradictory required data %#', input => { expect(() => mapRealGuestReservationPage(input)).toThrow(DomainMappingError); });
  it('uses only the actual opaque challenge and bodyless verification contract', () => {
    expect(mapRealLinkChallenge({ requestId: guestLinkRequestId, otp: 'private' })).toEqual({ id: guestLinkRequestId });
    expect(mapRealLinkVerification(null)).toBe(true);
    expect(() => mapRealLinkChallenge({ requestId: 'bad' })).toThrow(DomainMappingError);
    for (const value of [undefined, {}, { reservationId: item.reservationId }]) expect(() => mapRealLinkVerification(value)).toThrow(DomainMappingError);
  });
});
