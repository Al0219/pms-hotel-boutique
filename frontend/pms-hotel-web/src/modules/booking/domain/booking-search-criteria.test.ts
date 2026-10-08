import { describe, it, expect } from 'vitest';
import {
  validateBookingSearchCriteria,
  buildSearchQueryParams,
  getBookingCalendarDate,
  isBookingCalendarDate,
  nextBookingCalendarDate,
  readBookingSearchCriteria,
  readBookingPageCriteria,
} from './booking-search-criteria';

describe('BookingSearchCriteria Domain (IMP-WEB-0101)', () => {
  it('validates a correct criteria with zero errors', () => {
    const errors = validateBookingSearchCriteria(
      {
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        adults: 2,
        children: 1,
        roomsCount: 2,
        promoCode: 'BOUTIQUE',
      },
      '2026-09-15'
    );

    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('rejects past checkIn date', () => {
    const errors = validateBookingSearchCriteria(
      {
        checkIn: '2026-09-01',
        checkOut: '2026-09-10',
        adults: 2,
      },
      '2026-09-15'
    );

    expect(errors.checkIn).toBe('La fecha de llegada no puede ser anterior a la fecha actual');
  });

  it('rejects checkOut before or equal to checkIn', () => {
    const errors = validateBookingSearchCriteria(
      {
        checkIn: '2026-10-05',
        checkOut: '2026-10-05',
        adults: 2,
      },
      '2026-09-15'
    );

    expect(errors.checkOut).toBe('La fecha de salida debe ser posterior a la de llegada');
  });

  it('rejects less than 1 adult', () => {
    const errors = validateBookingSearchCriteria(
      {
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        adults: 0,
      },
      '2026-09-15'
    );

    expect(errors.adults).toBe('Se requiere al menos 1 adulto por reserva');
  });

  it('builds query parameters string correctly', () => {
    const criteria = {
      checkIn: '2026-10-01',
      checkOut: '2026-10-05',
      adults: 2,
      children: 0,
      roomsCount: 1,
      promoCode: 'SUMMER2026',
    };

    const query = buildSearchQueryParams(criteria);
    expect(query).toBe('checkIn=2026-10-01&checkOut=2026-10-05&adults=2&children=0&roomsCount=1&promoCode=SUMMER2026');
  });

  it.each(['2026-02-30', '2026-02-29', '2026-13-01', '2026-10-01T00:00:00Z', 'not-a-date'])(
    'rejects malformed calendar date %s', date => {
      expect(isBookingCalendarDate(date)).toBe(false);
      expect(validateBookingSearchCriteria({
        checkIn: date, checkOut: '2026-12-31', adults: 2, children: 0, roomsCount: 1,
      }, '2026-01-01').checkIn).toBe('Indica una fecha de llegada válida');
    },
  );

  it('validates departure independently and accepts a real leap day', () => {
    expect(isBookingCalendarDate('2028-02-29')).toBe(true);
    expect(validateBookingSearchCriteria({
      checkIn: '2026-10-01', checkOut: '2026-11-31', adults: 2, children: 0, roomsCount: 1,
    }, '2026-09-15').checkOut).toBe('Indica una fecha de salida válida');
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid room count %s', roomsCount => {
      expect(validateBookingSearchCriteria({
        checkIn: '2026-10-01', checkOut: '2026-10-05', adults: 2, children: 0, roomsCount,
      }, '2026-09-15').roomsCount).toBeDefined();
    },
  );

  it('rejects fractional adults and a missing number of children', () => {
    const errors = validateBookingSearchCriteria({
      checkIn: '2026-10-01', checkOut: '2026-10-05', adults: 1.5, roomsCount: 1,
    }, '2026-09-15');
    expect(errors.adults).toBeDefined();
    expect(errors.children).toBeDefined();
  });

  it('preserves all criteria and safely encodes an opaque promotion code', () => {
    const criteria = {
      checkIn: '2026-10-01', checkOut: '2026-10-05', adults: 4, children: 2,
      roomsCount: 2, promoCode: 'OFERTA & AMIGOS',
    };
    expect(readBookingSearchCriteria(new URLSearchParams(buildSearchQueryParams(criteria)))).toEqual(criteria);
  });

  it('does not turn malformed or empty URL counts into valid defaults', () => {
    const criteria = readBookingSearchCriteria(new URLSearchParams('adults=2.5&children=&roomsCount=Infinity'));
    expect(Number.isNaN(criteria.adults)).toBe(true);
    expect(Number.isNaN(criteria.children)).toBe(true);
    expect(Number.isNaN(criteria.roomsCount)).toBe(true);
    expect(readBookingSearchCriteria(new URLSearchParams()).roomsCount).toBeUndefined();
  });

  it('uses the supplied property timezone around the UTC day boundary', () => {
    const now = new Date('2026-10-04T02:30:00Z');
    expect(getBookingCalendarDate(now, 'America/Guatemala')).toBe('2026-10-03');
    expect(getBookingCalendarDate(now, 'UTC')).toBe('2026-10-04');
  });

  it('advances calendar days across month and year boundaries', () => {
    expect(nextBookingCalendarDate('2028-02-28')).toBe('2028-02-29');
    expect(nextBookingCalendarDate('2026-12-31')).toBe('2027-01-01');
  });

  it('restores bookmarked page criteria and rejects ambiguous repeated counts', () => {
    expect(readBookingPageCriteria({
      checkIn: '2026-10-10', checkOut: '2026-10-15', adults: '4', children: '1', roomsCount: '2',
    })).toEqual({ checkIn: '2026-10-10', checkOut: '2026-10-15', adults: 4, children: 1, roomsCount: 2, promoCode: undefined });
    expect(Number.isNaN(readBookingPageCriteria({ roomsCount: ['1', '2'] }).roomsCount)).toBe(true);
  });
});
