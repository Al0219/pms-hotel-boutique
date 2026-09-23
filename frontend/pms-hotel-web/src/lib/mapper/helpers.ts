import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

/**
 * Shared mapper validation helpers.
 *
 * These are pure functions used by mappers across multiple modules to avoid
 * duplicating the same trim-and-validate logic. Each helper throws a
 * `DomainMappingError` with the supplied errorCode when validation fails.
 */

export function requiredText(value: string, errorCode: string): string {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    throw new DomainMappingError(errorCode);
  }

  return normalizedValue;
}

export function optionalText(value: string | null): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue || null;
}

export function requiredNumber(value: number, errorCode: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainMappingError(errorCode);
  }

  return value;
}

export function parseCount(value: number, errorCode: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainMappingError(errorCode);
  }

  return value;
}

export function parseAmount(value: string, errorCode: string): number {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new DomainMappingError(errorCode);
  }

  return amount;
}

/** Parse a day-only date string ("YYYY-MM-DD") into a Date at midnight. */
export function parseDay(value: string, errorCode: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DomainMappingError(errorCode);
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    throw new DomainMappingError(errorCode);
  }

  return date;
}

/** Parse an ISO datetime string (contains "T") into a Date. */
export function parseDateTime(value: string, errorCode: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new DomainMappingError(errorCode);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new DomainMappingError(errorCode);
  }

  return date;
}
