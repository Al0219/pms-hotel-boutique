export interface BookingSearchCriteria {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  adults: number;
  children: number;
  promoCode?: string;
}

export interface BookingSearchValidationErrors {
  checkIn?: string;
  checkOut?: string;
  adults?: string;
  children?: string;
  promoCode?: string;
}

/**
 * Validates booking search criteria according to hotel domain rules.
 * Check-in cannot be in the past, check-out must be after check-in, min 1 adult.
 */
export function validateBookingSearchCriteria(
  criteria: Partial<BookingSearchCriteria>,
  todayStr?: string
): BookingSearchValidationErrors {
  const errors: BookingSearchValidationErrors = {};
  const today = todayStr || new Date().toISOString().split('T')[0];

  if (!criteria.checkIn) {
    errors.checkIn = 'La fecha de llegada es obligatoria';
  } else if (criteria.checkIn < today) {
    errors.checkIn = 'La fecha de llegada no puede ser anterior a la fecha actual';
  }

  if (!criteria.checkOut) {
    errors.checkOut = 'La fecha de salida es obligatoria';
  } else if (criteria.checkIn && criteria.checkOut <= criteria.checkIn) {
    errors.checkOut = 'La fecha de salida debe ser posterior a la de llegada';
  }

  if (criteria.adults === undefined || criteria.adults === null) {
    errors.adults = 'Debe indicar el número de adultos';
  } else if (criteria.adults < 1) {
    errors.adults = 'Se requiere al menos 1 adulto por reserva';
  }

  if (criteria.children !== undefined && criteria.children < 0) {
    errors.children = 'El número de niños no puede ser negativo';
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
  if (criteria.promoCode && criteria.promoCode.trim()) {
    params.set('promoCode', criteria.promoCode.trim());
  }
  return params.toString();
}
