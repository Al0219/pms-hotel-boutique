import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { staffReservationDetailsFixture, staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationCenter, mapStaffReservationDetail } from './staff-reservation.mapper';

describe('Scoped Staff reservation information', () => {
  it('maps registered contact, notes, explicit occupants and current type photos without inventing occupancy or money', () => {
    const dto = staffReservationDetailsFixture(), detail = mapStaffReservationDetail(dto);
    expect(detail.information?.contact).toEqual(dto.details!.contact);
    expect(detail.information?.updatedAt.toISOString()).toBe('2026-10-28T20:00:00.123Z');
    expect(detail.notes).toBe('Llegada tardía registrada.');
    expect(detail.stays[0].occupants).toEqual(dto.details!.stays[0].occupants);
    expect(detail.stays[0].occupants?.some(guest => guest.profileId === dto.responsibleGuest!.profileId)).toBe(false);
    expect(detail.stays[0].presentation?.images).toHaveLength(3);
    expect(detail.stays[0].updatedAt).toBe(dto.stays[0].updatedAt);
    expect(detail.guest.adults).toBeNull(); expect(detail.finance.totalAmount).toBeNull();
    const list = JSON.stringify(mapStaffReservationCenter([dto]));
    for (const privateValue of ['responsible@example.test', '+502 5555 5555', '0123', 'Llegada tardía']) expect(list).not.toContain(privateValue);
  });
  it('supports older or incomplete historical data without substituting the booker as an occupant', () => {
    expect(mapStaffReservationDetail(staffReservationFixture()).information).toBeUndefined();
    const dto = staffReservationDetailsFixture(); dto.details!.contact = null; dto.details!.notes = null;
    dto.details!.stays[0].occupants = []; dto.stays[0].roomType.code = 'UNKNOWN';
    const detail = mapStaffReservationDetail(dto);
    expect(detail.information?.contact).toBeNull(); expect(detail.notes).toBeNull();
    expect(detail.stays[0].occupants).toEqual([]); expect(detail.stays[0].presentation?.images).toEqual([]);
  });
  it('preserves country when recorded and supports older contact data without it', () => {
    const dto = staffReservationDetailsFixture();
    expect(mapStaffReservationDetail(dto).information?.contact?.country).toBe('GT');
    delete dto.details!.contact!.country;
    expect(mapStaffReservationDetail(dto).information?.contact?.country).toBeUndefined();
    dto.details!.contact!.country = 'Guatemala';
    expect(() => mapStaffReservationDetail(dto)).toThrow(DomainMappingError);
  });
  it.each(['contact', 'foreign-stay', 'duplicate-stay', 'missing-stay', 'document', 'duplicate-occupant', 'timestamp'])(
    'rejects incompatible additional information: %s', scenario => {
      const dto = staffReservationDetailsFixture(), data = dto.details!;
      if (scenario === 'contact') data.contact!.profileId = dto.reservationId;
      if (scenario === 'foreign-stay') data.stays[0].stayId = dto.reservationId;
      if (scenario === 'duplicate-stay') data.stays.push(data.stays[0]);
      if (scenario === 'missing-stay') data.stays = [];
      if (scenario === 'document') data.contact!.documentNumberMasked = '1234567890123';
      if (scenario === 'duplicate-occupant') data.stays[0].occupants.push(data.stays[0].occupants[0]);
      if (scenario === 'timestamp') data.updatedAt = 'invalid';
      expect(() => mapStaffReservationDetail(dto)).toThrow(DomainMappingError);
    });
});
