import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { AgencyCenter } from "./agency-center";

const { useAgenciesMock } = vi.hoisted(() => ({ useAgenciesMock: vi.fn() }));

vi.mock("../hooks/use-agencies", () => ({ useAgencies: useAgenciesMock }));

describe("AgencyCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useAgenciesMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<AgencyCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useAgenciesMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<AgencyCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/agencies" />);

    expect(screen.getByText("No hay agencias para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useAgenciesMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<AgencyCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/agencies" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });
});
