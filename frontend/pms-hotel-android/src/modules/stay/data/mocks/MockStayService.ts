import { type ReservationStayDto } from '@/modules/stay/data/dtos/ReservationStayDto';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { type StayService } from '@/modules/stay/data/services/StayService';

export type MockStayServiceScenario =
  | { kind: 'success'; dto: ReservationStayDto }
  | { kind: 'error'; error: Error };

/** Technical remote mock. It deliberately does not declare an HTTP endpoint. */
export class MockStayService implements StayService {
  public constructor(
    private readonly scenario: MockStayServiceScenario = {
      kind: 'success',
      dto: currentStayFixture,
    },
  ) {}

  public async getCurrentStay(): Promise<ReservationStayDto> {
    if (this.scenario.kind === 'error') {
      throw this.scenario.error;
    }

    return this.scenario.dto;
  }
}
