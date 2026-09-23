import { beforeEach, describe, expect, it, vi } from "vitest";

const { startMock } = vi.hoisted(() => ({ startMock: vi.fn() }));

vi.mock("./browser", () => ({ mockWorker: { start: startMock } }));

describe("enableMocking", () => {
  beforeEach(() => {
    vi.resetModules();
    startMock.mockReset().mockResolvedValue(undefined);
    process.env.NEXT_PUBLIC_USE_MOCK_API = "true";
  });

  it("starts the worker only once across concurrent calls", async () => {
    const { enableMocking } = await import("./enable");

    await Promise.all([enableMocking(), enableMocking()]);

    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("does nothing when the mock API is disabled", async () => {
    process.env.NEXT_PUBLIC_USE_MOCK_API = "false";
    const { enableMocking } = await import("./enable");

    await enableMocking();

    expect(startMock).not.toHaveBeenCalled();
  });
});
