import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnvironment } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("public environment", () => {
  it("enables mocks and normalizes the configured base URL", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", " http://pms.test ");
    expect(getPublicEnvironment()).toEqual({ useMockApi: true, apiBaseUrl: "http://pms.test" });
  });

  it("keeps absent or disabled configuration explicit", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", " ");
    expect(getPublicEnvironment()).toEqual({ useMockApi: false, apiBaseUrl: undefined });
  });
});
