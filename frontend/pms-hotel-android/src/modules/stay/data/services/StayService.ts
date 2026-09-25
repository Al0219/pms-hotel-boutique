import { type ReservationStayDto } from "@/modules/stay/data/dtos/ReservationStayDto";
import { type ActiveReservationContext } from "@/modules/guest-auth/domain/models/ActiveReservationContext";

/**
 * Remote boundary for the current stay. An HTTP implementation is deferred
 * until a backend endpoint and request contract are confirmed.
 */
export interface StayService {
  getCurrentStay(
    context: ActiveReservationContext,
  ): Promise<ReservationStayDto>;
}
