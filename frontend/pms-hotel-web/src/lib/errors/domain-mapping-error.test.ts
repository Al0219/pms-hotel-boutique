import { describe, expect, it } from "vitest";

import { DomainMappingError } from "./domain-mapping-error";

describe("DomainMappingError", () => {
  it("exposes only its safe code", () => {
    const error = new DomainMappingError("INVALID_REQUIRED_FIELD");

    expect(error.code).toBe("INVALID_REQUIRED_FIELD");
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      code: "INVALID_REQUIRED_FIELD",
      name: "DomainMappingError",
    });
  });
});
