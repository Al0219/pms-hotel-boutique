export class DomainMappingError extends Error {
  public readonly field: string;

  public constructor(field: string) {
    super(`Required DTO field is invalid: ${field}`);
    this.name = 'DomainMappingError';
    this.field = field;
  }
}
