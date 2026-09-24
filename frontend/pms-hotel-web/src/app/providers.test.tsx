import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enableMocking } from "@/data/mocks/enable";

import { Providers } from "./providers";

vi.mock("@/data/mocks/enable", () => ({ enableMocking: vi.fn(async () => {}) }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.mocked(enableMocking).mockReset(); });

describe("Providers", () => {
  it("renders technical children through the Query provider", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.mocked(enableMocking).mockResolvedValue(undefined);
    render(<Providers><p>Technical shell</p></Providers>);
    await act(async () => {});
    expect(screen.getByText("Technical shell")).toBeInTheDocument();
  });

  it("waits for mock startup before mounting consumers", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    let finish!: () => void;
    vi.mocked(enableMocking).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<Providers><p>Ready consumer</p></Providers>);
    expect(screen.queryByText("Ready consumer")).not.toBeInTheDocument();
    await act(async () => finish());
    expect(screen.getByText("Ready consumer")).toBeInTheDocument();
  });

  it("allows retrying a failed mock startup", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    vi.mocked(enableMocking).mockRejectedValueOnce(new Error("worker")).mockResolvedValue(undefined);
    render(<Providers><p>Ready consumer</p></Providers>);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Reintentar inicio" }));
    expect(await screen.findByText("Ready consumer")).toBeInTheDocument();
  });
});
