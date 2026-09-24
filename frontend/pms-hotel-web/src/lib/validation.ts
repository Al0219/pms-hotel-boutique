import { DomainMappingError } from "./errors/domain-mapping-error";

export function text(value: unknown, code = "INVALID_TEXT"): string {
  if (typeof value !== "string" || !value.trim()) throw new DomainMappingError(code);
  return value.trim();
}
export function count(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new DomainMappingError("INVALID_COUNT");
  return value;
}
export function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new DomainMappingError("INVALID_BOOLEAN");
  return value;
}
export function dateOnly(value: unknown): string {
  const result = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || Number.isNaN(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new DomainMappingError("INVALID_DATE");
  return result;
}
export function oneOf<T extends string>(value: unknown, values: readonly T[]): T {
  if (!values.includes(value as T)) throw new DomainMappingError("INVALID_CODE");
  return value as T;
}
export function list<T>(value: T[]): T[] {
  if (!Array.isArray(value)) throw new DomainMappingError("INVALID_LIST");
  return value;
}
