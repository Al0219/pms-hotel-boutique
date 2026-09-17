import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { GroupCenter } from "./group-center";

afterEach(() => cleanup());

const { useGroupsMock } = vi.hoisted(() => ({ useGroupsMock: vi.fn() }));

vi.mock("../hooks/use-groups", () => ({ useGroups: useGroupsMock }));

describe("GroupCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useGroupsMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<GroupCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useGroupsMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<GroupCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/groups" />);

    expect(screen.getByText("No hay grupos para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useGroupsMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<GroupCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/groups" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });
});
