import { type ActiveReservationContext } from "@/modules/guest-auth/domain/models/ActiveReservationContext";
import { type ReservationStayDto } from "@/modules/stay/data/dtos/ReservationStayDto";
import { currentStayFixture } from "@/modules/stay/data/mocks/currentStayFixture";
import { secondStayFixture } from "@/modules/stay/data/mocks/secondStayFixture";
import { type StayService } from "@/modules/stay/data/services/StayService";

export type MockStayServiceScenario =
  | { kind: "success"; dto: ReservationStayDto }
  | { kind: "error"; error: Error };

/** Technical remote mock. It resolves only the explicitly supplied reservation context. */
export class MockStayService implements StayService {
  public constructor(
    private readonly scenario: MockStayServiceScenario = {
      kind: "success",
      dto: currentStayFixture,
    },
  ) {}

  public async getCurrentStay(
    context: ActiveReservationContext,
  ): Promise<ReservationStayDto> {
    if (this.scenario.kind === "error") throw this.scenario.error;
    const stays =
      this.scenario.dto === currentStayFixture
        ? [currentStayFixture, secondStayFixture]
        : [this.scenario.dto];
    const stay = stays.find(
      (candidate) =>
        candidate.reservationId === context.reservationId &&
        candidate.id === context.reservationStayId,
    );
    if (!stay)
      throw new Error(
        "Unknown reservation stay context: " +
          context.reservationId +
          "/" +
          context.reservationStayId,
      );
    return stay;
  }
}
