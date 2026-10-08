import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WaitlistBoard } from "./waitlist-board";

afterEach(() => cleanup());

const { useReservationCenterMock, usePreviewMock, useConfirmMock } = vi.hoisted(() => ({
  useReservationCenterMock: vi.fn(),
  usePreviewMock: vi.fn(),
  useConfirmMock: vi.fn(),
}));

vi.mock("../hooks/use-reservation-center", () => ({ useReservationCenter: useReservationCenterMock }));
vi.mock("../hooks/use-waitlist-conversion", () => ({
  useWaitlistConversionPreview: usePreviewMock,
  useConfirmWaitlistConversion: useConfirmMock,
}));

function item(overrides = {}) {
  return {
    id: "WAIT-0007",
    propertyId: "GT-HB-01",
    guestName: "Laura Méndez",
    sourceLabel: "Web directa",
    sourceReference: null,
    roomLabel: "Deluxe King",
    stayStart: new Date(2026, 8, 10),
    stayEnd: new Date(2026, 8, 12),
    nights: 2,
    adults: 2,
    roomCount: null,
    currency: "GTQ",
    finance: { totalAmount: 2250, paidAmount: null, financeState: "ESTIMATED" },
    alertText: null,
    status: "WAITLIST",
    statusDetail: null,
    ...overrides,
  };
}

function confirmed() {
  return {
    id: "HB-2026-08421",
    propertyId: "GT-HB-01",
    guestName: "María López",
    sourceLabel: "Viajes Maya",
    sourceReference: null,
    roomLabel: "203",
    stayStart: new Date(2026, 7, 28),
    stayEnd: new Date(2026, 7, 31),
    nights: 3,
    adults: 2,
    roomCount: 1,
    currency: "GTQ",
    finance: { totalAmount: 3920, paidAmount: 2400, financeState: "BALANCE" },
    alertText: null,
    status: "CONFIRMED",
    statusDetail: null,
  };
}

const PROPS = { propertyId: "GT-HB-01", endpoint: "http://pms.test/contract/reservations" };

describe("WaitlistBoard", () => {
  it("lists only waitlist requests and opens the conversion detail", () => {
    useReservationCenterMock.mockReturnValue({
      data: { summary: {}, alerts: [], reservations: [item(), confirmed()] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });
    usePreviewMock.mockReturnValue({ data: undefined, error: null, isLoading: true, refetch: vi.fn() });
    useConfirmMock.mockReturnValue({
      data: undefined, error: null, isError: false, isPending: false, isSuccess: false,
      mutate: vi.fn(), reset: vi.fn(),
    });

    render(<WaitlistBoard {...PROPS} />);

    expect(screen.getByText("WAIT-0007")).toBeInTheDocument();
    expect(screen.queryByText("HB-2026-08421")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /WAIT-0007/ }));

    expect(screen.getByRole("heading", { name: "Convertir a reserva" })).toBeInTheDocument();
    expect(usePreviewMock).toHaveBeenCalled();
  });

  it("reports an empty queue", () => {
    useReservationCenterMock.mockReturnValue({
      data: { summary: {}, alerts: [], reservations: [confirmed()] },
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<WaitlistBoard {...PROPS} />);

    expect(screen.getByText("Sin solicitudes en waitlist para esta propiedad.")).toBeInTheDocument();
  });
});
