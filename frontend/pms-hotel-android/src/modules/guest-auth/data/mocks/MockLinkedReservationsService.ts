import { NetworkError } from "@/data/remote/http/HttpError";
import { type LinkedReservationSummaryDto } from "@/modules/guest-auth/data/dto/LinkedReservationSummaryDto";
import { mapLinkedReservationSummaryDto } from "@/modules/guest-auth/data/mappers/mapLinkedReservationSummaryDto";
import { type LinkedReservationsService } from "@/modules/guest-auth/data/services/LinkedReservationsService";
import { type LinkedReservationSummary } from "@/modules/guest-auth/domain/models/LinkedReservationSummary";

export type MockLinkedReservationsScenario =
  | { kind: "success"; reservations: readonly LinkedReservationSummaryDto[] }
  | { kind: "error"; error?: Error }
  | { kind: "offline"; error?: NetworkError };

export interface MockLinkedReservationsServiceOptions {
  scenario?: MockLinkedReservationsScenario;
  listForAccount?: (
    accountId: string,
  ) => Promise<readonly LinkedReservationSummary[]>;
}

/** Account-scoped mock boundary with explicit zero/one/multiple fixture support. */
const defaultReservations: readonly LinkedReservationSummaryDto[] = [
  {
    reservationId: "HB-2026-004281",
    reservationStayId: "stay-2026-004281",
    reference: "HB-2026-004281",
    propertyLabel: "Hotel Boutique",
    arrival: "2026-08-28",
    departure: "2026-09-18",
    roomLabel: "204",
    statusLabel: "Confirmada",
  },
  {
    reservationId: "HB-2026-004982",
    reservationStayId: "stay-2026-004982",
    reference: "HB-2026-004982",
    propertyLabel: "Hotel Boutique",
    arrival: "2026-10-03",
    departure: "2026-10-09",
    roomLabel: "118",
    statusLabel: "Confirmada",
  },
];

export class MockLinkedReservationsService implements LinkedReservationsService {
  public constructor(
    private readonly options: MockLinkedReservationsServiceOptions = {},
  ) {}

  public async listForAccount(
    accountId: string,
  ): Promise<readonly LinkedReservationSummary[]> {
    if (this.options.listForAccount)
      return this.options.listForAccount(accountId);
    const scenario = this.options.scenario ?? {
      kind: "success" as const,
      reservations: defaultReservations,
    };
    if (scenario.kind === "offline") throw scenario.error ?? new NetworkError();
    if (scenario.kind === "error")
      throw scenario.error ?? new Error("Linked reservations mock failed");
    return scenario.reservations.map(mapLinkedReservationSummaryDto);
  }
}
