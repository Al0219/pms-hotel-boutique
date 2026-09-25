import { DomainMappingError } from "./errors/domain-mapping-error";

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DomainMappingError("INVALID_OBJECT");
  return value as Record<string, unknown>;
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) throw new DomainMappingError("INVALID_TEXT");
  return value.trim();
}
export function list(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new DomainMappingError("INVALID_LIST");
  return value;
}
export function flag(value: unknown): boolean {
  if (typeof value !== "boolean") throw new DomainMappingError("INVALID_BOOLEAN");
  return value;
}
export function choice<const T extends readonly string[]>(value: unknown, choices: T): T[number] {
  if (typeof value !== "string" || !choices.includes(value)) throw new DomainMappingError("INVALID_ENUM");
  return value as T[number];
}
export function date(value: unknown): Date {
  const result = new Date(text(value));
  if (!Number.isFinite(result.getTime())) throw new DomainMappingError("INVALID_DATE");
  return result;
}
export function unique<T extends { id: string }>(items: T[]): T[] {
  if (new Set(items.map(item => item.id)).size !== items.length) throw new DomainMappingError("DUPLICATE_ID");
  return items;
}

