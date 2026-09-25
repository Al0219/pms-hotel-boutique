import { type ActiveReservationContext } from '@/modules/guest-auth/domain/models/ActiveReservationContext';

/** Convention only for 0501. Existing Stay queries remain unchanged until IMP-AND-0503. */
export function reservationContextKey(context: ActiveReservationContext) {
  return ['stay', context.reservationId, context.reservationStayId] as const;
}
