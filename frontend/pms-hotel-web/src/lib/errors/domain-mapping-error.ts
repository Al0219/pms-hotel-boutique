export class DomainMappingError extends Error {
  readonly code: string;
  readonly target?: string;

  constructor(code: string, target?: string) {
    super(target ? `${code} [${target}]` : code);
    this.name = "DomainMappingError";
    this.code = code;
    this.target = target;
  }
}
