import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorQueue } from "./error-queue";

afterEach(() => cleanup());

const { useErrorsMock, useRetryMock } = vi.hoisted(() => ({
  useErrorsMock: vi.fn(),
  useRetryMock: vi.fn(),
}));

vi.mock("../hooks/use-integration-errors", () => ({
  useIntegrationErrors: useErrorsMock,
  useRetryIntegrationError: useRetryMock,
}));

function entry(overrides = {}) {
  return {
    id: "ERR-001",
    propertyId: "GT-HB-01",
    integrationId: "INT-002",
    integrationProvider: "Expedia",
    kind: "reservation_import",
    message: "Reserva rechazada por tarifa desactualizada.",
    status: "PENDING",
    attempts: 1,
    maxAttempts: 3,
    retryable: true,
    lastAttemptAt: new Date("2026-09-18T12:05:00.000Z"),
    history: [],
    ...overrides,
  };
}

function mockQueue(entries: unknown[]) {
  useErrorsMock.mockReturnValue({ data: entries, error: null, isLoading: false, refetch: vi.fn() });
  useRetryMock.mockReturnValue({
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  });
}

const PROPS = { propertyId: "GT-HB-01", endpoint: "http://pms.test/integration-errors" };

describe("ErrorQueue", () => {
  it("lists errors with filters and opens the detail", () => {
    mockQueue([entry(), entry({ id: "ERR-004", status: "RESOLVED", integrationId: "INT-001", integrationProvider: "Booking.com" })]);
    render(<ErrorQueue {...PROPS} />);

    expect(screen.getByRole("heading", { name: "Cola de errores" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "PENDING" } });
    expect(screen.queryByText("ERR-004")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Estado"), { target: { value: "ALL" } });
    fireEvent.click(screen.getByRole("button", { name: /ERR-001/ }));
    expect(screen.getByText("Reserva rechazada por tarifa desactualizada.")).toBeInTheDocument();
  });

  it("retries a pending error with an idempotency key", () => {
    const mutate = vi.fn();
    mockQueue([entry()]);
    useRetryMock.mockReturnValue({ mutate, reset: vi.fn(), isPending: false, isError: false, error: null });
    render(<ErrorQueue {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: /ERR-001/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ errorId: "ERR-001", idempotencyKey: expect.any(String) }),
    );
  });

  it("explains why a non-retryable error cannot be retried", () => {
    mockQueue([entry({ status: "FAILED", retryable: false })]);
    render(<ErrorQueue {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: /ERR-001/ }));

    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
    expect(screen.getByText(/requiere intervención manual/)).toBeInTheDocument();
  });

  it("prefilters by the integration deep link", () => {
    mockQueue([entry(), entry({ id: "ERR-004", integrationId: "INT-001", integrationProvider: "Booking.com" })]);
    render(<ErrorQueue {...PROPS} initialIntegrationId="INT-001" />);

    expect(screen.queryByText("ERR-001")).not.toBeInTheDocument();
    expect(screen.getByText("ERR-004")).toBeInTheDocument();
  });
});
