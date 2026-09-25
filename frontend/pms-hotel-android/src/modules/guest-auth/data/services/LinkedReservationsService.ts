import { type LinkedReservationSummary } from '@/modules/guest-auth/domain/models/LinkedReservationSummary';

/** Frontend mock boundary for the account's reservation-selection projections. */
export interface LinkedReservationsService {
  listForAccount(accountId: string): Promise<readonly LinkedReservationSummary[]>;
}
