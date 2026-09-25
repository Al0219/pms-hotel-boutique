import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CleaningTransitionPanel } from "./cleaning-transition-panel";

afterEach(() => cleanup());

const { useApplyCleaningTransitionMock } = vi.hoisted(() => ({ useApplyCleaningTransitionMock: vi.fn() }));

vi.mock("../hooks/use-cleaning-transition", () => ({ useApplyCleaningTransition: useApplyCleaningTransitionMock }));

function mutation(state = {}) {
  return {
    mutate: vi.fn(),
    reset: vi.fn(),
    isPending: false,
    isSuccess: false,
    isError: false,
    data: undefined,
    error: null,
    ...state,
  };
}

const ROOM = { id: "ROOM-101", propertyId: "GT-HB-01", roomLabel: "101", status: "DIRTY" } as const;
const PROPS = { propertyId: "GT-HB-01", endpoint: "http://pms.test/room-cleaning" };

describe("CleaningTransitionPanel", () => {
  it("confirms a no-reason transition from the dialog", () => {
    const mutate = vi.fn();
    useApplyCleaningTransitionMock.mockReturnValue(mutation({ mutate }));

    render(<CleaningTransitionPanel room={{ ...ROOM }} {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Marcar limpia" }));
    expect(screen.getByRole("heading", { name: /marcar limpia/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(mutate).toHaveBeenCalledWith(
      { roomId: "ROOM-101", toStatus: "CLEAN", reason: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("demands a reason before rejecting an inspection", () => {
    const mutate = vi.fn();
    useApplyCleaningTransitionMock.mockReturnValue(mutation({ mutate }));

    render(<CleaningTransitionPanel room={{ ...ROOM, status: "INSPECTED" }} {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Rechazar inspección" }));
    expect(screen.getByRole("heading", { name: "Rechazar inspección" })).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "Volver a limpieza" });
    expect(confirm).toBeDisabled();
    expect(mutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("Describe el motivo del rechazo"), {
      target: { value: "Polvo en baño" },
    });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    expect(mutate).toHaveBeenCalledWith(
      { roomId: "ROOM-101", toStatus: "DIRTY", reason: "Polvo en baño" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("announces a successful transition", () => {
    useApplyCleaningTransitionMock.mockReturnValue(
      mutation({ isSuccess: true, data: { roomId: "ROOM-101", propertyId: "GT-HB-01", status: "CLEAN" } }),
    );

    render(<CleaningTransitionPanel room={{ ...ROOM }} {...PROPS} />);

    expect(screen.getByRole("status")).toHaveTextContent("Estado actualizado a Limpia.");
  });
});
