import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { CompanyCenter } from "./company-center";

afterEach(() => cleanup());

const { useCompaniesMock } = vi.hoisted(() => ({ useCompaniesMock: vi.fn() }));

vi.mock("../hooks/use-companies", () => ({ useCompanies: useCompaniesMock }));

describe("CompanyCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useCompaniesMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<CompanyCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useCompaniesMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<CompanyCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/companies" />);

    expect(screen.getByText("No hay empresas para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useCompaniesMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<CompanyCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/companies" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });
});
