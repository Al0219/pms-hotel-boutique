import { type LinkedReservationSummary } from '@/modules/guest-auth/domain/models/LinkedReservationSummary';

/** Account-scoped reservation selection; accountId is a local cache identity, never HTTP authority. */
export interface LinkedReservationsService {
  listForAccount(accountId: string): Promise<readonly LinkedReservationSummary[]>;
}
