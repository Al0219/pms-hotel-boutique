import { DomainMappingError } from '@/domain/errors/DomainMappingError';

export function requireDtoField<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined) {
    throw new DomainMappingError(field);
  }

  return value;
}
