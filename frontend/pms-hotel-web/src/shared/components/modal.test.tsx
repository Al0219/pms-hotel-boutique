import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Modal } from "./modal";

afterEach(() => cleanup());

function renderModal(overrides: Record<string, unknown> = {}) {
  const onClose = vi.fn();

  render(
    <Modal
      title="Título del modal"
      onClose={onClose}
      footer={
        <>
          <button type="button">Uno</button>
          <button type="button">Dos</button>
        </>
      }
      {...overrides}
    >
      <p>Contenido del modal</p>
    </Modal>,
  );

  return { onClose };
}

describe("Modal", () => {
  it("renders an accessible dialog with title, content and actions", () => {
    renderModal();

    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("heading", { name: "Título del modal" })).toBeInTheDocument();
    expect(screen.getByText("Contenido del modal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Uno" })).toBeInTheDocument();
  });

  it("calls onClose from escape when not busy", () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose from the backdrop when not busy", () => {
    const { onClose } = renderModal();

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close by escape or backdrop while busy", () => {
    const { onClose } = renderModal({ busy: true });

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as Element);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps keyboard focus inside the dialog", () => {
    renderModal();

    const first = screen.getByRole("button", { name: "Uno" });
    const last = screen.getByRole("button", { name: "Dos" });

    expect(first).toHaveFocus();

    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(first).toHaveFocus();

    first.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("renders no footer when none is provided", () => {
    const onClose = vi.fn();
    render(<Modal title="Sin acciones" onClose={onClose}><p>Solo contenido</p></Modal>);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
