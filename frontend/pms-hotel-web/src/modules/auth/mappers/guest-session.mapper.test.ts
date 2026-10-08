import { describe, expect, it } from "vitest";
import { DomainMappingError } from "@/lib/errors/domain-mapping-error";
import { mapGuestSession } from "./guest-session.mapper";
import type { GuestSessionDTO } from "../dtos/guest-session.dto";

const dto: GuestSessionDTO = { guestAccountId: "account-01", sessionId: "session-01", email: "guest@example.test", context: "GUEST" };

describe("Guest BFF session mapper", () => {
  it("maps only confirmed session identity, without external identities or credentials", () => {
    expect(mapGuestSession(dto)).toEqual({ id: dto.sessionId, context: "GUEST", account: { id: dto.guestAccountId, email: dto.email } });
  });
  it.each([
    { guestAccountId: " " }, { sessionId: "" }, { email: null }, { email: " " }, { context: "STAFF" }, { context: undefined },
  ])("rejects missing/invalid required values %j", invalid => {
    expect(() => mapGuestSession({ ...dto, ...invalid } as GuestSessionDTO)).toThrow(DomainMappingError);
  });
});
