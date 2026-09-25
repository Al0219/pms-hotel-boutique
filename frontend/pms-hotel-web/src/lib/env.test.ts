import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicEnvironment } from "./env";

afterEach(() => vi.unstubAllEnvs());

describe("public environment compatibility", () => {
  it("reads explicit public variables for normal callers", () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", " https://example.test/api/ ");
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    expect(getPublicEnvironment()).toEqual({ apiBaseUrl: "https://example.test/api/", useMockApi: true });
  });

  it("preserves the optional injected environment without changing process values", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    expect(getPublicEnvironment({ NODE_ENV: "test", NEXT_PUBLIC_API_BASE_URL: " ", NEXT_PUBLIC_USE_MOCK_API: "false" }))
      .toEqual({ apiBaseUrl: undefined, useMockApi: false });
    expect(getPublicEnvironment().useMockApi).toBe(true);
  });
});
