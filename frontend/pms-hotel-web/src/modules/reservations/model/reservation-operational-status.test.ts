import { describe, expect, it } from 'vitest';
import { deriveReservationOperationalStatus } from './reservation-operational-status';
import type { StayTravelState } from './reservation-detail';

const stay = (travelState: StayTravelState, assigned = false) => ({ travelState, roomId: assigned ? 'physical-room' : null });
describe('operational reservation status from real parent and stays', () => {
  it.each([
    ['PENDING', [], 'PENDING'], ['CONFIRMED', [], 'CONFIRMED'], ['CANCELLED', [], 'CANCELLED'],
    ['CANCELLED', [stay('IN_HOUSE', true)], 'CANCELLED'],
    ['CONFIRMED', [stay('CANCELLED'), stay('CANCELLED')], 'CANCELLED'],
    ['PENDING', [stay('RESERVED', true)], 'PENDING'],
    ['CONFIRMED', [stay('RESERVED')], 'CONFIRMED'],
    ['CONFIRMED', [stay('RESERVED', true)], 'ASSIGNED'],
    ['CONFIRMED', [stay('RESERVED', true), stay('RESERVED')], 'CONFIRMED'],
    ['CONFIRMED', [stay('RESERVED', true), stay('RESERVED', true)], 'ASSIGNED'],
    ['CONFIRMED', [stay('RESERVED', true), stay('CANCELLED')], 'ASSIGNED'],
    ['CONFIRMED', [stay('CHECKED_OUT'), stay('RESERVED', true)], 'ASSIGNED'],
    ['CONFIRMED', [stay('CHECKED_OUT'), stay('RESERVED')], 'CONFIRMED'],
    ['CONFIRMED', [stay('IN_HOUSE', true), stay('RESERVED')], 'IN_HOUSE'],
    ['PENDING', [stay('IN_HOUSE', true)], 'IN_HOUSE'],
    ['CONFIRMED', [stay('IN_HOUSE', true), stay('NO_SHOW')], 'IN_HOUSE'],
    ['CONFIRMED', [stay('CHECKED_OUT'), stay('CANCELLED')], 'COMPLETED'],
    ['PENDING', [stay('CHECKED_OUT')], 'COMPLETED'],
    ['CONFIRMED', [stay('NO_SHOW'), stay('CANCELLED')], 'NO_SHOW'],
    ['PENDING', [stay('NO_SHOW')], 'NO_SHOW'],
    ['CONFIRMED', [stay('NO_SHOW'), stay('RESERVED', true)], 'CONFIRMED'],
    ['CONFIRMED', [stay('NO_SHOW'), stay('CHECKED_OUT')], 'CONFIRMED'],
  ] as const)('projects %s / %j as %s', (parent, stays, expected) => {
    expect(deriveReservationOperationalStatus(parent, stays)).toBe(expected);
  });
  it('does not mutate the real source or depend on dates, money or room labels', () => {
    const stays = Object.freeze([Object.freeze(stay('RESERVED', true)), Object.freeze(stay('RESERVED'))]);
    const before = JSON.stringify(stays);
    expect(deriveReservationOperationalStatus('CONFIRMED', stays)).toBe('CONFIRMED');
    expect(JSON.stringify(stays)).toBe(before);
  });
});
