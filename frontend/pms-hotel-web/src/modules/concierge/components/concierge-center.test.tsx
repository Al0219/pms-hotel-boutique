import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { ConciergeCenter } from "./concierge-center";

afterEach(() => cleanup());

const { useConciergeTasksMock } = vi.hoisted(() => ({ useConciergeTasksMock: vi.fn() }));

vi.mock("../hooks/use-concierge-tasks", () => ({ useConciergeTasks: useConciergeTasksMock }));

describe("ConciergeCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useConciergeTasksMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<ConciergeCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useConciergeTasksMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<ConciergeCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/concierge-tasks" />);

    expect(screen.getByText("No hay tareas de conserjería para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useConciergeTasksMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<ConciergeCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/concierge-tasks" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });
});
