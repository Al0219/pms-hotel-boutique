/** Internal mock-domain error. Future UI must render generic credentials copy. */
export class InvalidGuestCredentialsError extends Error {
  public constructor() {
    super('Guest credentials were rejected');
    this.name = 'InvalidGuestCredentialsError';
  }
}
