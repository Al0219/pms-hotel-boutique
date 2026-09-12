/** A semantic mock-boundary error. UI branches on its type, never its message. */
export class ReservationNotFoundError extends Error {
  public constructor() {
    super('Reservation access could not be matched.');
    this.name = 'ReservationNotFoundError';
  }
}
