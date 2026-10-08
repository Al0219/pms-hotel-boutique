import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';
import { type LinkedReservationSummary } from '@/modules/guest-auth/domain/models/LinkedReservationSummary';

export type LinkedReservationOutcome =
  | { kind: 'EMPTY' }
  | { kind: 'AUTO_SELECT'; context: ActiveReservationContext }
  | { kind: 'REQUIRES_SELECTION' };

/** Purely classifies linked reservations; navigation and state changes stay outside it. */
export function resolveLinkedReservationOutcome(reservations: readonly LinkedReservationSummary[]): LinkedReservationOutcome {
  if (reservations.length === 0) return { kind: 'EMPTY' };
  if (reservations.length > 1) return { kind: 'REQUIRES_SELECTION' };

  const [reservation] = reservations;
  return {
    kind: 'AUTO_SELECT',
    context: {
      reservationId: reservation.reservationId,
      reservationStayId: reservation.reservationStayId,
    },
  };
}
