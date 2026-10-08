import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { CompanyDetail } from "./company-detail";

afterEach(() => cleanup());

describe("CompanyDetail", () => {
  it("presents the company agreement and credit references", () => {
    render(<CompanyDetail company={{
      id: "CMP-001", propertyId: "GT-HB-01", legalName: "Corporativo Maya", status: "ACTIVE",
      agreementReference: "AGR-001", creditReference: "CRT-001", directBillRequested: false,
    }} />);

    expect(screen.getByRole("heading", { name: "Corporativo Maya" })).toBeInTheDocument();
    expect(screen.getByText("Activa")).toBeInTheDocument();
    expect(screen.getByText("AGR-001")).toBeInTheDocument();
    expect(screen.getByText("CRT-001")).toBeInTheDocument();
    expect(screen.getByText("No solicitado")).toBeInTheDocument();
  });

  it("never presents a requested direct bill as approved", () => {
    render(<CompanyDetail company={{
      id: "CMP-001", propertyId: "GT-HB-01", legalName: "Corporativo Maya", status: "ACTIVE",
      agreementReference: null, creditReference: null, directBillRequested: true,
    }} />);

    expect(screen.getByText("Solicitado")).toBeInTheDocument();
    expect(screen.getByText(/no es automática/i)).toBeInTheDocument();
    expect(screen.getByText(/Company no es Guest ni Payer/i)).toBeInTheDocument();
  });
});
