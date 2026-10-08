import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpNetworkError } from "@/lib/http/errors";

import { MessagingCenter } from "./messaging-center";

afterEach(() => cleanup());

const { useOperationalMessagesMock } = vi.hoisted(() => ({ useOperationalMessagesMock: vi.fn() }));

vi.mock("../hooks/use-operational-messages", () => ({ useOperationalMessages: useOperationalMessagesMock }));

describe("MessagingCenter", () => {
  it("does not query until composition supplies an authorized scope", () => {
    useOperationalMessagesMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<MessagingCenter />);

    expect(screen.getByText(/scope de propiedad autorizado/i)).toBeInTheDocument();
  });

  it("renders the empty state for an explicit scope and approved endpoint", () => {
    useOperationalMessagesMock.mockReturnValue({ data: [], error: null, isLoading: false, refetch: vi.fn() });

    render(<MessagingCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/operational-messages" />);

    expect(screen.getByText("No hay mensajes internos para esta propiedad.")).toBeInTheDocument();
  });

  it("presents a dedicated offline message", () => {
    useOperationalMessagesMock.mockReturnValue({ data: undefined, error: new HttpNetworkError(), isLoading: false, refetch: vi.fn() });

    render(<MessagingCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/operational-messages" />);

    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
  });

  it("shows the internal queue note", () => {
    useOperationalMessagesMock.mockReturnValue({
      data: [{ id: "MSG-001", propertyId: "GT-HB-01", subject: "Test", body: "Body", senderRole: "OPERATIONS", status: "PENDING", relatedReservationId: null, createdAt: new Date() }],
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<MessagingCenter propertyId="GT-HB-01" endpoint="http://pms.test/contract/operational-messages" />);

    expect(screen.getAllByText(/cola interna/i).length).toBeGreaterThanOrEqual(1);
  });
});
