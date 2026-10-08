import { describe, expect, it } from "vitest";

import { DomainMappingError } from "@/lib/errors/domain-mapping-error";

import { mapConciergeTask } from "./concierge-task.mapper";

const DTO = {
  task_id: " CT-001 ",
  property_id: " GT-HB-01 ",
  title: " Traslado al aeropuerto ",
  status: " PENDING ",
  reception_reference: " REC-01 ",
};

describe("mapConciergeTask", () => {
  it("maps and normalizes a provisional concierge task", () => {
    expect(mapConciergeTask(DTO)).toEqual({
      id: "CT-001",
      propertyId: "GT-HB-01",
      title: "Traslado al aeropuerto",
      status: "PENDING",
      receptionReference: "REC-01",
    });
  });

  it("keeps a missing reception reference as null", () => {
    expect(mapConciergeTask({ ...DTO, reception_reference: " " }).receptionReference).toBeNull();
  });

  it("rejects an unknown task status", () => {
    expect(() => mapConciergeTask({ ...DTO, status: "SENT_TO_GUEST" })).toThrow(
      new DomainMappingError("INVALID_CONCIERGE_TASK_STATUS"),
    );
  });

  it("rejects a missing required task identifier", () => {
    expect(() => mapConciergeTask({ ...DTO, task_id: " " })).toThrow(
      new DomainMappingError("INVALID_CONCIERGE_TASK_ID"),
    );
  });
});
