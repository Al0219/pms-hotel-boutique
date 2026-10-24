import { describe, expect, it } from 'vitest';
import { DomainMappingError } from '@/lib/errors';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationDetail } from './staff-reservation.mapper';
import { mapStayLifecycleReceipt } from './stay-lifecycle.mapper';
const dto = staffReservationFixture();
const scope = { propertyId: dto.propertyId, reservationId: dto.reservationId, stayId: dto.stays[0].stayId };
const receipt = { ...scope, operationId: dto.reservationId, status: 'IN_HOUSE' as const, completedAt: '2026-10-22T18:00:00.123456789Z' };
describe('concurrency and lifecycle mappers', () => {
  it('preserves micro/nanosecond tokens without converting to a rounded Date', () => {
    expect(mapStaffReservationDetail(dto).stays[0].updatedAt).toBe('2026-10-22T18:00:00.123456Z');
    expect(mapStayLifecycleReceipt(receipt, scope, 'check-in')).toEqual(receipt);
  });
  it.each([undefined, '', 'bad', '2026-02-30T00:00:00Z', '2026-10-22T18:00:00+00:00'])('rejects invalid or missing version %s', updatedAt => {
    const value = staffReservationFixture();
    Object.assign(value.stays[0], { updatedAt });
    expect(() => mapStaffReservationDetail(value)).toThrow(DomainMappingError);
  });
  it('rejects receipt scope, action and required data mismatches', () => {
    for (const value of [{ ...receipt, propertyId: 'other' }, { ...receipt, stayId: 'other' }, { ...receipt, status: 'CHECKED_OUT' as const },
      { ...receipt, operationId: 'bad' }, { ...receipt, completedAt: 'bad' }])
      expect(() => mapStayLifecycleReceipt(value, scope, 'check-in')).toThrow(DomainMappingError);
  });
});
