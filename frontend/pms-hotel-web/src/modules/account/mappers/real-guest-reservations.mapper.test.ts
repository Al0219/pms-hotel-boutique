import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { guestHistoryReservation as item, guestLinkRequestId } from '@/test/real-guest-reservations-fixture';
import { mapLinkedGuestReservations, mapGuestStay } from './linked-guest-reservation.mapper';
import { mapRealLinkChallenge, mapRealLinkVerification } from './real-guest-reservations.mapper';
import { guestStayNights, guestDateLabel, guestReservationLabel, guestStayLabel } from '../model/real-guest-reservations';

describe('shared Guest projection and public presentation', () => {
  it('groups all stays without fabricating private or financial fields', () => {
    const result = mapLinkedGuestReservations([item, { ...item, stayId: guestLinkRequestId, status: 'CHECKED_OUT', roomCode: '204' }]);
    expect(result).toEqual([{ id: item.reservationId, reference: item.confirmationCode, propertyName: item.propertyName, status: item.reservationStatus, stays: [
      { id: item.stayId, arrival: item.arrival, departure: item.departure, status: item.status, roomCode: null },
      { id: guestLinkRequestId, arrival: item.arrival, departure: item.departure, status: 'CHECKED_OUT', roomCode: '204' },
    ] }]);
    expect(guestStayNights(item)).toBe(3); expect(guestDateLabel(item.arrival)).toContain('28');
    expect(guestReservationLabel('CONFIRMED')).toBe('Confirmada'); expect(guestStayLabel('CHECKED_OUT')).toBe('Finalizada');
    expect(guestReservationLabel('future')).toBe('future');
  });
  it('keeps genuine empty data empty and a null room unassigned', () => {
    expect(mapLinkedGuestReservations([])).toEqual([]);
    const dto = { id: item.stayId, reservationId: item.reservationId, roomType: { id: guestLinkRequestId, name: 'Deluxe King' }, room: null, arrival: item.arrival, departure: item.departure, status: item.status };
    expect(mapGuestStay(dto, item.reservationId, item.stayId)).toEqual(dto);
    expect(() => mapGuestStay(dto, guestLinkRequestId, item.stayId)).toThrow(DomainMappingError);
    expect(() => mapGuestStay(dto, item.reservationId, guestLinkRequestId)).toThrow(DomainMappingError);
  });
  it.each([
    [item, item], [item, { ...item, stayId: guestLinkRequestId, confirmationCode: 'OTHER' }],
    [item, { ...item, stayId: guestLinkRequestId, propertyName: 'Other hotel' }],
    [item, { ...item, stayId: guestLinkRequestId, reservationStatus: 'CANCELLED' }],
    [{ ...item, arrival: '2026-02-30' }], [{ ...item, departure: item.arrival }],
    [{ ...item, propertyName: '' }], [{ ...item, confirmationCode: '' }],
  ].map(rows => ({ rows })))('rejects malformed or inconsistent required data %#', ({ rows }) => {
    expect(() => mapLinkedGuestReservations(rows)).toThrow(DomainMappingError);
  });
  it('uses only an opaque challenge and a bodyless verification response', () => {
    expect(mapRealLinkChallenge({ requestId: guestLinkRequestId, otp: 'private' })).toEqual({ id: guestLinkRequestId });
    expect(mapRealLinkVerification(null)).toBe(true);
    expect(() => mapRealLinkChallenge({ requestId: 'bad' })).toThrow(DomainMappingError);
    for (const value of [undefined, {}, { reservationId: item.reservationId }]) expect(() => mapRealLinkVerification(value)).toThrow(DomainMappingError);
  });
});
