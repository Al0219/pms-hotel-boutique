import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ConfirmDialog } from "./confirm-dialog";

afterEach(() => cleanup());

function renderDialog(overrides: Record<string, unknown> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();

  render(
    <ConfirmDialog
      title="Confirmar cancelación"
      body={<p><strong>HB-2026-08421</strong> pasará a CANCELADA.</p>}
      confirmLabel="Confirmar cancelación"
      destructive
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );

  return { onConfirm, onCancel };
}

describe("ConfirmDialog", () => {
  it("renders title, body and actions with destructive confirm", () => {
    const { onConfirm } = renderDialog();

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Confirmar cancelación" })).toBeInTheDocument();
    expect(screen.getByText(/pasará a CANCELADA/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel from escape while not busy", () => {
    const { onCancel } = renderDialog();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the dialog open on backdrop click but confirms from the panel", () => {
    const { onCancel } = renderDialog();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as Element);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not close by escape or backdrop while busy", () => {
    const { onCancel, onConfirm } = renderDialog({ busy: true });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as Element);
    expect(onCancel).not.toHaveBeenCalled();

    expect(screen.getByRole("button", { name: "Cancelando…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelando…" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables the confirm action when the guard rejects the content", () => {
    const { onConfirm } = renderDialog({ confirmDisabled: true });

    expect(screen.getByRole("button", { name: "Confirmar cancelación" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar cancelación" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});