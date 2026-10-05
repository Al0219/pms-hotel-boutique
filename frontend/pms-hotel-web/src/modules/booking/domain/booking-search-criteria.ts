export interface BookingSearchCriteria {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number;
  roomsCount: number;
  promoCode?: string;
}

export interface BookingSearchValidationErrors {
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  roomsCount?: string;
  promoCode?: string;
}

/** Calendar dates remain YYYY-MM-DD; they are not arrival/departure Instants. */
export function getBookingCalendarDate(now = new Date(), timeZone?: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric', month: '2-digit', day: '2-digit', timeZone,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function isBookingCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function nextBookingCalendarDate(value: string): string {
  if (!isBookingCalendarDate(value)) throw new Error('INVALID_BOOKING_CALENDAR_DATE');
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** Validates form shape; capacity, rates and inventory remain server authority. */
export function validateBookingSearchCriteria(
  criteria: Partial<BookingSearchCriteria>,
  todayStr?: string
): BookingSearchValidationErrors {
  const errors: BookingSearchValidationErrors = {};
  const today = todayStr ?? getBookingCalendarDate();

  if (!criteria.checkIn) {
    errors.checkIn = 'La fecha de llegada es obligatoria';
  } else if (!isBookingCalendarDate(criteria.checkIn)) {
    errors.checkIn = 'Indica una fecha de llegada válida';
  } else if (criteria.checkIn < today) {
    errors.checkIn = 'La fecha de llegada no puede ser anterior a la fecha actual';
  }

  if (!criteria.checkOut) {
    errors.checkOut = 'La fecha de salida es obligatoria';
  } else if (!isBookingCalendarDate(criteria.checkOut)) {
    errors.checkOut = 'Indica una fecha de salida válida';
  } else if (isBookingCalendarDate(criteria.checkIn) && criteria.checkOut <= criteria.checkIn) {
    errors.checkOut = 'La fecha de salida debe ser posterior a la de llegada';
  }

  if (criteria.adults === undefined || criteria.adults === null) {
    errors.adults = 'Debe indicar el número de adultos';
  } else if (!Number.isSafeInteger(criteria.adults)) {
    errors.adults = 'Indica un número entero de adultos';
  } else if (criteria.adults < 1) {
    errors.adults = 'Se requiere al menos 1 adulto por reserva';
  }

  if (typeof criteria.children !== 'number' || !Number.isSafeInteger(criteria.children) || criteria.children < 0) {
    errors.children = 'Indica un número entero de niños, igual o mayor que cero';
  }

  if (typeof criteria.roomsCount !== 'number' || !Number.isSafeInteger(criteria.roomsCount) || criteria.roomsCount < 1) {
    errors.roomsCount = 'Indica al menos una habitación, con un número entero';
  }

  return errors;
}

/**
 * Helper to construct search URL query parameters for availability results page (/habitaciones).
 */
export function buildSearchQueryParams(criteria: BookingSearchCriteria): string {
  const params = new URLSearchParams();
  params.set('checkIn', criteria.checkIn);
  params.set('checkOut', criteria.checkOut);
  params.set('adults', criteria.adults.toString());
  params.set('children', criteria.children.toString());
  params.set('roomsCount', criteria.roomsCount.toString());
  if (criteria.promoCode && criteria.promoCode.trim()) {
    params.set('promoCode', criteria.promoCode.trim());
  }
  return params.toString();
}

/** Read URL criteria without replacing malformed supplied values with defaults. */
export function readBookingSearchCriteria(params: Pick<URLSearchParams, 'get'>): Partial<BookingSearchCriteria> {
  const count = (key: string): number | undefined => {
    const value = params.get(key);
    if (value === null) return undefined;
    return /^\d+$/.test(value) ? Number(value) : Number.NaN;
  };
  return {
    checkIn: params.get('checkIn') ?? undefined,
    checkOut: params.get('checkOut') ?? undefined,
    adults: count('adults'),
    children: count('children'),
    roomsCount: count('roomsCount'),
    promoCode: params.get('promoCode') ?? undefined,
  };
}

export function readBookingPageCriteria(
  query: Record<string, string | string[] | undefined>,
): Partial<BookingSearchCriteria> {
  return readBookingSearchCriteria({
    get: key => {
      const value = query[key];
      // Ambiguous supplied criteria remain invalid, instead of choosing a value.
      return Array.isArray(value) ? '' : value ?? null;
    },
  });
}
