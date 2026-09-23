import { describe, it, expect } from 'vitest';
import {
  validateBookingSearchCriteria,
  buildSearchQueryParams,
} from './booking-search-criteria';

describe('BookingSearchCriteria Domain (IMP-WEB-0101)', () => {
  it('validates a correct criteria with zero errors', () => {
    const errors = validateBookingSearchCriteria(
      {
        checkIn: '2026-10-01',
        checkOut: '2026-10-05',
        adults: 2,
        children: 1,
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
      promoCode: 'SUMMER2026',
    };

    const query = buildSearchQueryParams(criteria);
    expect(query).toBe('checkIn=2026-10-01&checkOut=2026-10-05&adults=2&children=0&promoCode=SUMMER2026');
  });
});
