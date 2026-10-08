import { describe, expect, it, vi, afterEach } from "vitest";
import { simulateGuestAccess } from "./guest-access.service";
import { getGuestAccount } from "./guest-account.service";
import { mapGuestAccount } from "../mappers/guest-account.mapper";

afterEach(() => vi.unstubAllEnvs());

describe("Guest contract and mock access service", () => {
  it("keeps the existing GuestAccount service and mapper compatible", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://pms.test");
    const dto = await getGuestAccount("guest-demo-01");
    expect(mapGuestAccount(dto)).toEqual({ id: "guest-demo-01", email: "guest@example.com", externalIdentities: [] });
  });

  it("does not send a request with the mock flag off", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    await expect(simulateGuestAccess({ method: "EMAIL", email: "demo@example.com" }, new AbortController().signal)).rejects.toThrow("GUEST_MOCK_ACCESS_DISABLED");
  });
});
