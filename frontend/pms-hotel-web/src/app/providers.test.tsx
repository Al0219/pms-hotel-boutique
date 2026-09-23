import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { enableMocking } from "@/data/mocks/enable";
import { Providers } from "./providers";

vi.mock("@/data/mocks/enable", () => ({ enableMocking: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.mocked(enableMocking).mockReset().mockResolvedValue(undefined); });

describe("Providers", () => {
  it("renders technical children through the Query provider", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    render(<Providers><p>Technical shell</p></Providers>);
    expect(screen.getByText("Technical shell")).toBeInTheDocument();
  });

  it("waits for the worker before mounting features that request data", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    render(<Providers><p>Ready feature</p></Providers>);
    expect(screen.getByRole("status")).toHaveTextContent("Preparando");
    expect(screen.queryByText("Ready feature")).not.toBeInTheDocument();
    expect(await screen.findByText("Ready feature")).toBeInTheDocument();
  });

  it("offers recovery when mock startup fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    vi.mocked(enableMocking).mockRejectedValueOnce(new Error("Worker unavailable"));
    const user = userEvent.setup();
    render(<Providers><p>Ready feature</p></Providers>);
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo preparar");
    expect(screen.queryByText("Ready feature")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Ready feature")).toBeInTheDocument();
  });
});
