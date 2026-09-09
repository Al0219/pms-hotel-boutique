export class DomainMappingError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "DomainMappingError";
    this.code = code;
  }
}
