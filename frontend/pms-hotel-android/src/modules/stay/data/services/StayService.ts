import { type ReservationStayDto } from "@/modules/stay/data/dtos/ReservationStayDto";
import { type ActiveReservationContext } from "@/modules/guest-auth/domain/models/ActiveReservationContext";

/**
 * Remote boundary for the current stay; HTTP uses the confirmed Guest read
 * projection, while hooks retain the existing DTO to Domain mapping.
 */
export interface StayService {
  getCurrentStay(
    context: ActiveReservationContext,
  ): Promise<ReservationStayDto>;
}
