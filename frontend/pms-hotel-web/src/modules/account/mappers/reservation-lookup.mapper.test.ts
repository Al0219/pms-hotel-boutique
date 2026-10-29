import { expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors/domain-mapping-error';
import { mapReservationLookup } from './reservation-lookup.mapper';
const row = { reservationId: 'reservation', stayId: 'stay', confirmationCode: 'HB-2026-08421', propertyName: 'Hotel', reservationStatus: 'CONFIRMED', arrival: '2036-01-01', departure: '2036-01-03', roomCode: null, status: 'RESERVED' };
const detail = { id: 'stay', reservationId: 'reservation', roomType: { id: 'type', name: 'Deluxe' }, room: null, arrival: row.arrival, departure: row.departure, status: row.status };
const payload = { stays: [row], details: [detail], overview: { createdAt: '2026-10-28T12:00:00Z', source: 'WEB_DIRECTA', currency: 'GTQ', confirmedTotalMinor: 65000 }, accommodations: [{ stayId: 'stay', roomTypeCode: 'CLASSIC', timezone: 'America/Guatemala' }] };
it('maps one reservation and all its stays, matching reference case insensitively', () => {
  const result = mapReservationLookup(payload, ' hb-2026-08421 ');
  expect(result.reservation.reference).toBe(row.confirmationCode); expect(result.details[0].roomType.name).toBe('Deluxe');
});
it('rejects another reference, email-wide results and empty malformed results', () => {
  for (const rows of [[], [row, { ...row, stayId: 'other', reservationId: 'foreign' }]]) {
    expect(() => mapReservationLookup({ ...payload, stays: rows }, row.confirmationCode)).toThrow(DomainMappingError);
  }
  expect(() => mapReservationLookup(payload, 'OTHER-CODE')).toThrow(DomainMappingError);
});
it('rejects missing, duplicated, foreign or inconsistent stay details', () => {
  for (const details of [[], [detail, detail], [{ ...detail, reservationId: 'foreign' }], [{ ...detail, departure: '2036-01-04' }]]) {
    expect(() => mapReservationLookup({ ...payload, details }, row.confirmationCode)).toThrow(DomainMappingError);
  }
});

it('joins catalog photos by exact persisted type code without inventing capacity or prices', () => {
  const result = mapReservationLookup(payload, row.confirmationCode);
  expect(result.accommodations[0].images).toHaveLength(3);
  expect(result.overview.confirmedTotalMinor).toBe(65000);
  const unknown = mapReservationLookup({ ...payload, overview: { ...payload.overview, confirmedTotalMinor: null }, accommodations: [{ ...payload.accommodations[0], roomTypeCode: 'UNLISTED' }] }, row.confirmationCode);
  expect(unknown.accommodations[0].images).toEqual([]); expect(unknown.accommodations[0].description).toBeNull(); expect(unknown.overview.confirmedTotalMinor).toBeNull();
});
it('rejects foreign metadata, invalid times, currencies and money', () => {
  for (const patch of [{ accommodations: [] }, { accommodations: [{ ...payload.accommodations[0], stayId: 'foreign' }] },
    { accommodations: [{ ...payload.accommodations[0], timezone: 'Invented/Timezone' }] },
    { overview: { ...payload.overview, createdAt: 'not-a-date' } }, { overview: { ...payload.overview, currency: '' } },
    { overview: { ...payload.overview, confirmedTotalMinor: -1 } }, { overview: { ...payload.overview, confirmedTotalMinor: 1.1 } }]) {
    expect(() => mapReservationLookup({ ...payload, ...patch }, row.confirmationCode)).toThrow(DomainMappingError);
  }
});
