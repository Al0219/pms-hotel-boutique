import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AgencyDetail } from "./agency-detail";

describe("AgencyDetail", () => {
  it("presents agency contract, commission and voucher references", () => {
    render(<AgencyDetail agency={{
      id: "AGY-001", propertyId: "GT-HB-01", legalName: "Viajes Quetzal", statusCode: "ACTIVE",
      contractReference: "CTR-001", commissionReference: "COM-001", voucherReference: "VCH-001",
    }} />);

    expect(screen.getByRole("heading", { name: "Viajes Quetzal" })).toBeInTheDocument();
    expect(screen.getByText("CTR-001")).toBeInTheDocument();
    expect(screen.getByText("COM-001")).toBeInTheDocument();
    expect(screen.getByText("VCH-001")).toBeInTheDocument();
  });
});
