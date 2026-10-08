import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { HttpStatusError } from "@/lib/http/errors";

import { useIntegrationErrors, useRetryIntegrationError } from "./use-integration-errors";

const { listErrorsMock, retryErrorMock, mapErrorMock } = vi.hoisted(() => ({
  listErrorsMock: vi.fn(),
  retryErrorMock: vi.fn(),
  mapErrorMock: vi.fn((dto: { error_id: string; status: string }) => ({ id: dto.error_id, status: dto.status })),
}));

vi.mock("../service/integration-error.service", () => ({
  listIntegrationErrors: listErrorsMock,
  retryIntegrationError: retryErrorMock,
}));

vi.mock("../mappers/integration-error.mapper", () => ({ mapIntegrationError: mapErrorMock }));

function wrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useIntegrationErrors", () => {
  it("maps the queued errors", async () => {
    listErrorsMock.mockResolvedValueOnce({ errors: [{ error_id: "ERR-001", status: "PENDING" }] });

    const { result } = renderHook(() => useIntegrationErrors("GT-HB-01", "http://pms.test/integration-errors"), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "ERR-001", status: "PENDING" }]);
  });
});

describe("useRetryIntegrationError", () => {
  it("retries with an idempotency key and refreshes the queue", async () => {
    retryErrorMock.mockResolvedValueOnce({ error_id: "ERR-001", status: "RESOLVED" });

    const { result } = renderHook(() => useRetryIntegrationError("GT-HB-01", "http://pms.test/integration-errors"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ errorId: "ERR-001", idempotencyKey: "key-123" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(retryErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ errorId: "ERR-001", idempotencyKey: "key-123" }),
    );
    expect(result.current.data).toEqual({ id: "ERR-001", status: "RESOLVED" });
  });

  it("surfaces retry rejections to the UI", async () => {
    retryErrorMock.mockRejectedValueOnce(new HttpStatusError(422, "NON_RETRYABLE"));

    const { result } = renderHook(() => useRetryIntegrationError("GT-HB-01", "http://pms.test/integration-errors"), {
      wrapper: wrapper(),
    });

    result.current.mutate({ errorId: "ERR-002", idempotencyKey: "key-124" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(HttpStatusError);
  });
});
