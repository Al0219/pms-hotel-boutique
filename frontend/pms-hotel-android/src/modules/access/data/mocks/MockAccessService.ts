import { accessReservationFixture } from '@/modules/access/data/mocks/accessReservationFixture';
import { type AccessService } from '@/modules/access/data/services/AccessService';
import { ReservationNotFoundError } from '@/modules/access/domain/errors/ReservationNotFoundError';
import { type ReservationAccessRequest, type ReservationAccessResult } from '@/modules/access/domain/models/ReservationAccess';

export interface MockAccessServiceOptions {
  linkReservation?: (request: ReservationAccessRequest) => Promise<ReservationAccessResult>;
}

function matchesFixture(request: ReservationAccessRequest): boolean {
  return request.reservationCode.trim().toLocaleLowerCase() === accessReservationFixture.reservationCode.toLocaleLowerCase()
    && request.email.trim().toLocaleLowerCase() === accessReservationFixture.email.toLocaleLowerCase();
}

/** Mock network boundary for the frontend-first Access flow. */
export class MockAccessService implements AccessService {
  public constructor(private readonly options: MockAccessServiceOptions = {}) {}

  public async linkReservation(request: ReservationAccessRequest): Promise<ReservationAccessResult> {
    if (this.options.linkReservation) return this.options.linkReservation(request);
    if (!matchesFixture(request)) throw new ReservationNotFoundError();
    return { linked: true };
  }
}
