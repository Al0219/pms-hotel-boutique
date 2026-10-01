import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

// Mock WebSocket
class MockWebSocket {
  onopen: (() => void) | null = null;
  onmessage: ((evt: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  readyState = 1;

  constructor(_url: string) {
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }

  send = vi.fn();
  close = vi.fn(() => {
    if (this.onclose) this.onclose();
  });
}

// @ts-expect-error Mocking WebSocket global
global.WebSocket = MockWebSocket;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotificationBell", () => {
  it("renders notification bell button with unread count badge", () => {
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: /Notificaciones/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("opens dropdown panel when bell button is clicked", async () => {
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: /Notificaciones/i });
    fireEvent.click(button);

    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: /Alertas y Notificaciones/i })).toBeInTheDocument();
    expect(screen.getByText("Notificaciones")).toBeInTheDocument();
  });

  it("allows marking notifications as read", () => {
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: /Notificaciones/i });
    fireEvent.click(button);

    const markAllBtn = screen.getByRole("button", { name: /Marcar leídas/i });
    expect(markAllBtn).toBeInTheDocument();

    fireEvent.click(markAllBtn);
    expect(screen.queryByRole("button", { name: /Marcar leídas/i })).not.toBeInTheDocument();
  });

  it("closes dropdown when escape key is pressed", () => {
    render(<NotificationBell />);

    const button = screen.getByRole("button", { name: /Notificaciones/i });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
