import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useApplyNoShow, useNoShowPreview } from "./use-reservation-no-show";

afterEach(() => cleanup());

const { previewNoShowMock, applyNoShowMock } = vi.hoisted(() => ({
  previewNoShowMock: vi.fn(),
  applyNoShowMock: vi.fn(),
}));

vi.mock("../service/reservation.service", () => ({
  previewNoShow: previewNoShowMock,
  applyNoShow: applyNoShowMock,
}));

const ENDPOINT = "http://pms.test/contract/reservations";

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
    reservation_id: "HB-2026-08112",
    policy_summary: "No-show: cargo de una noche + impuestos.",
    cutoff_at: "2026-08-27T18:00:00",
    allowed_charge: "470",
    release_note: "Estándar Doble 101 · 27–29 ago",
    can_mark_no_show: true,
    reason: null,
  };
}

function applyDto() {
  return {
    reservation_id: "HB-2026-08112",
    status: "NO_SHOW",
    marked_at: "2026-08-28T18:15:00",
    allowed_charge: "470",
    message: "No-show: cargo Q470 · ATS +1/noche",
  };
}

describe("useNoShowPreview", () => {
  beforeEach(() => {
    previewNoShowMock.mockReset();
  });

  it("maps the preview only when the panel is open and scope is resolved", async () => {
    previewNoShowMock.mockResolvedValueOnce(previewDto());

    const { result } = renderHook(() => useNoShowPreview("GT-HB-01", ENDPOINT, "HB-2026-08112", true), {
      wrapper: createWrapper().QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ reservationId: "HB-2026-08112", canMarkNoShow: true }));
    expect(previewNoShowMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08112",
    }));
  });

  it("does not request while the panel is closed", () => {
    renderHook(() => useNoShowPreview("GT-HB-01", ENDPOINT, "HB-2026-08112", false), {
      wrapper: createWrapper().QueryWrapper,
    });

    expect(previewNoShowMock).not.toHaveBeenCalled();
  });
});

describe("useApplyNoShow", () => {
  beforeEach(() => {
    applyNoShowMock.mockReset();
  });

  it("posts the action and invalidates center + preview queries on success", async () => {
    applyNoShowMock.mockResolvedValueOnce(applyDto());
    const { queryClient, QueryWrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useApplyNoShow("GT-HB-01", ENDPOINT, "HB-2026-08112"), {
      wrapper: QueryWrapper,
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ status: "NO_SHOW", reservationId: "HB-2026-08112" }));
    expect(applyNoShowMock).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      reservationId: "HB-2026-08112",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reservations", "GT-HB-01", ENDPOINT] });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["reservations", "no-show-preview", "GT-HB-01", ENDPOINT, "HB-2026-08112"],
    });
  });

  it("exposes a failed apply as mutation error and never sets NO_SHOW", async () => {
    applyNoShowMock.mockRejectedValueOnce(new HttpStatusError(409, "CONFLICT"));
    const { QueryWrapper } = createWrapper();

    const { result } = renderHook(() => useApplyNoShow("GT-HB-01", ENDPOINT, "HB-2026-08112"), {
      wrapper: QueryWrapper,
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(HttpStatusError);
    expect(result.current.data).toBeUndefined();
  });
});
