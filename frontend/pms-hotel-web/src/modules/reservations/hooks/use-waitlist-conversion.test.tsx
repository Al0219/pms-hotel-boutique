import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useConfirmWaitlistConversion, useWaitlistConversionPreview } from "./use-waitlist-conversion";

afterEach(() => cleanup());

const { previewWaitlistConversionMock, confirmWaitlistConversionMock } = vi.hoisted(() => ({
  previewWaitlistConversionMock: vi.fn(),
  confirmWaitlistConversionMock: vi.fn(),
}));

vi.mock("../service/waitlist.service", () => ({
  previewWaitlistConversion: previewWaitlistConversionMock,
  confirmWaitlistConversion: confirmWaitlistConversionMock,
}));

const ENDPOINT = "http://pms.test/contract/reservations";

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return { queryClient, QueryWrapper: function QueryWrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  } };
}

function previewDto() {
  return {
    waitlist_id: "WAIT-0007",
    guest_name: "Laura Méndez",
    source_label: "Web directa",
    room_type_label: "Deluxe King",
    check_in: "2026-09-10",
    check_out: "2026-09-12",
    nights: 2,
    adults: 2,
    priority: 1,
    queue_label: "3 solicitudes en cola",
    preferences: null,
    original_estimated_amount: "2250",
    availability: {
      room_type: "Deluxe King",
      available_from: "2026-09-10",
      available_until: "2026-09-12",
      rate_plan: "BAR Flexible",
      rate_per_night: "1125",
      total_estimated: "2250",
      note: null,
    },
  };
}

function resultDto() {
  return {
    waitlist_id: "WAIT-0007",
    reservation_id: "HB-2026-09128",
    status: "CONVERTED",
    message: "disponibilidad/tarifa revalidadas",
  };
}

describe("useWaitlistConversionPreview", () => {
  beforeEach(() => {
    previewWaitlistConversionMock.mockReset();
  });

  it("maps the preview only when scope and endpoint are resolved", async () => {
    previewWaitlistConversionMock.mockResolvedValueOnce(previewDto());

    const { result } = renderHook(() => useWaitlistConversionPreview("GT-HB-01", ENDPOINT, "WAIT-0007"), {
      wrapper: createWrapper().QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ id: "WAIT-0007" }));
    expect(result.current.data?.availability).toEqual(expect.objectContaining({ ratePlan: "BAR Flexible" }));
    expect(previewWaitlistConversionMock).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      waitlistId: "WAIT-0007",
    }));
  });

  it("does not request without an authorized scope or waitlist id", () => {
    renderHook(() => useWaitlistConversionPreview(undefined, undefined, undefined), {
      wrapper: createWrapper().QueryWrapper,
    });

    expect(previewWaitlistConversionMock).not.toHaveBeenCalled();
  });

  it("keeps availability null when the revalidation found none", async () => {
    previewWaitlistConversionMock.mockResolvedValueOnce({ ...previewDto(), availability: null });

    const { result } = renderHook(() => useWaitlistConversionPreview("GT-HB-01", ENDPOINT, "WAIT-0007"), {
      wrapper: createWrapper().QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.availability).toBeNull();
  });
});

describe("useConfirmWaitlistConversion", () => {
  beforeEach(() => {
    confirmWaitlistConversionMock.mockReset();
  });

  it("maps the confirmed result and invalidates the reservations the entry belongs to", async () => {
    confirmWaitlistConversionMock.mockResolvedValueOnce(resultDto());
    const { queryClient, QueryWrapper } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useConfirmWaitlistConversion("GT-HB-01", ENDPOINT, "WAIT-0007"), {
      wrapper: QueryWrapper,
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(expect.objectContaining({ reservationId: "HB-2026-09128", status: "CONVERTED" }));
    expect(confirmWaitlistConversionMock).toHaveBeenCalledWith({
      endpoint: ENDPOINT,
      propertyId: "GT-HB-01",
      waitlistId: "WAIT-0007",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["reservations", "GT-HB-01", ENDPOINT] });
  });

  it("exposes a failed revalidation as mutation error without inventing success", async () => {
    confirmWaitlistConversionMock.mockRejectedValueOnce(new HttpStatusError(409, "CONFLICT"));
    const { QueryWrapper } = createWrapper();

    const { result } = renderHook(() => useConfirmWaitlistConversion("GT-HB-01", ENDPOINT, "WAIT-0007"), {
      wrapper: QueryWrapper,
    });

    result.current.mutate();
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(HttpStatusError);
    expect(result.current.data).toBeUndefined();
  });
});