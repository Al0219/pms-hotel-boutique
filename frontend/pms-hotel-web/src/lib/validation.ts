import { DomainMappingError } from "./errors/domain-mapping-error";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new DomainMappingError("INVALID_OBJECT");
  }

  return value as Record<string, unknown>;
}

export function text(value: unknown, code = "INVALID_TEXT"): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new DomainMappingError(code);
  }

  return value.trim();
}

export function list<T>(value: T[]): T[];
export function list(value: unknown): unknown[];
export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new DomainMappingError("INVALID_LIST");
  }

  return value;
}

export function count(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new DomainMappingError("INVALID_COUNT");
  }

  return value;
}

export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new DomainMappingError("INVALID_BOOLEAN");
  }

  return value;
}

export function flag(value: unknown): boolean {
  return boolean(value);
}

export function dateOnly(value: unknown): string {
  const result = text(value);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  ) {
    throw new DomainMappingError("INVALID_DATE");
  }

  return result;
}

export function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
): T {
  if (
    typeof value !== "string" ||
    !values.includes(value as T)
  ) {
    throw new DomainMappingError("INVALID_CODE");
  }

  return value as T;
}

export function choice<const T extends readonly string[]>(
  value: unknown,
  choices: T,
): T[number] {
  if (
    typeof value !== "string" ||
    !choices.includes(value)
  ) {
    throw new DomainMappingError("INVALID_ENUM");
  }

  return value as T[number];
}

export function date(value: unknown): Date {
  const result = new Date(text(value));

  if (!Number.isFinite(result.getTime())) {
    throw new DomainMappingError("INVALID_DATE");
  }

  return result;
}

export function unique<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new DomainMappingError("DUPLICATE_ID");
  }

  return items;
}