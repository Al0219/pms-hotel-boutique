import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useApplyStayExtension, useExtensionPreview } from "./use-stay-extension";

afterEach(() => cleanup());

const { previewStayExtensionMock, applyStayExtensionMock } = vi.hoisted(() => ({
  previewStayExtensionMock: vi.fn(),
  applyStayExtensionMock: vi.fn(),
}));

vi.mock("../service/stay-extension.service", () => ({
  previewStayExtension: previewStayExtensionMock,
  applyStayExtension: applyStayExtensionMock,
}));

const ENDPOINT = "http://pms.test/contract/reservations";
const NEW_DEPARTURE = "2026-09-02";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return {
    queryClient,
    QueryWrapper: function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

function previewDto() {
  return {
    reservation_id: "HB-2026-08421",
    stay_id: "STAY-2026-08421-A",
    guest_name: "María Fernández",
    current_stay: {
      room_label: "203",
      room_type: "Deluxe King",
      check_in: "2026-08-28",
      check_out: "2026-08-31",
      nights: 3,
    },
    requested_departure: NEW_DEPARTURE,
    extra_nights: 2,
    rate_per_night: "1160",
    rate_confirmed: true,
    rate_confirmation: "Tarifa Deluxe King · 1,160 GTQ/noche confirmada.",
    availability_confirmed: true,
    availability_note: "Deluxe King 203 disponible · 31 ago – 2 sep.",
    delta_amount: "2320",
    new_total_amount: "5800",
    currency: "GTQ",
    inventory_note: "ReservationStay A · 28 ago → 2 sep · ATS -2/noche.",
    calendar_note: "Calendario: 203 reservada hasta 2 sep.",
    folio_note: "Mismo folio · se agrega cargo por 2 noches adicionales.",
    can_extend: true,
    reason: null,
  };
}

function applyDto() {
  return {
    reservation_id: "HB-2026-08421",
    stay_id: "STAY-2026-08421-A",
    status: "EXTENDED",
    previous_departure: "2026-08-31",
    new_departure: NEW_DEPARTURE,
    extra_nights: 2,
    nights: 5,
    rate_per_night: "1160",
    delta_amount: "2320",
    extended_at: "2026-08-29T11:30:00",
    audit_summary: "EXTENDED 31 ago → 2 sep · ReservationStay actualizado · Inventario y calendario actualizados",
    message: "Cargo adicional Q2,320 · ATS -2/noche · AuditTrail STAY_EXTENDED",
  };
}

describe("useExtensionPreview", () => {
  beforeEach(() => {
    previewStayExtensionMock.mockReset();
  });

  it("maps the projection only when a departure was revalidated and scope is resolved", async () => {
    previewStayExtensionMock.mockResolvedValueOnce(previewDto());

    const { result } = renderHook(
      () => useExtensionPreview("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A", NEW_DEPARTURE),
      { wrapper: createWrapper().QueryWrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      requestedDeparture: new Date("2026-09-02T00:00:00"),
      canExtend: true,
    }));
    expect(previewStayExtensionMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      newDeparture: NEW_DEPARTURE,
    }));
  });

  it("does not request until the user revalidates a departure", () => {
    renderHook(() => useExtensionPreview("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A", undefined), {
      wrapper: createWrapper().QueryWrapper,
    });

    expect(previewStayExtensionMock).not.toHaveBeenCalled();
  });
});

describe("useApplyStayExtension", () => {
  beforeEach(() => {
    applyStayExtensionMock.mockReset();
  });

  it("posts the extension and invalidates detail + preview queries on success", async () => {
    applyStayExtensionMock.mockResolvedValueOnce(applyDto());
    const { queryClient, QueryWrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useApplyStayExtension("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A"),
      { wrapper: QueryWrapper },
    );

    result.current.mutate({ newDeparture: NEW_DEPARTURE, reason: "evento ampliado" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ status: "EXTENDED" }));
    expect(applyStayExtensionMock).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08421",
      stayId: "STAY-2026-08421-A",
      newDeparture: NEW_DEPARTURE,
      reason: "evento ampliado",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reservations", "GT-HB-01", ENDPOINT] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["stays", "extension-preview", "GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A"],
    });
  });

  it("exposes a failed apply as mutation error and never sets EXTENDED", async () => {
    applyStayExtensionMock.mockRejectedValueOnce(new HttpStatusError(409, "CONFLICT"));
    const { QueryWrapper } = createWrapper();

    const { result } = renderHook(
      () => useApplyStayExtension("GT-HB-01", ENDPOINT, "HB-2026-08421", "STAY-2026-08421-A"),
      { wrapper: QueryWrapper },
    );

    result.current.mutate({ newDeparture: NEW_DEPARTURE, reason: null });
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(HttpStatusError);
    expect(result.current.data).toBeUndefined();
  });
});