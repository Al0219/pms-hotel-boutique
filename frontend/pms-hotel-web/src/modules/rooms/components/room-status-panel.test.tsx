import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RoomStatusPanel } from "./room-status-panel";

afterEach(() => cleanup());

const { useChangeRoomStatusMock } = vi.hoisted(() => ({ useChangeRoomStatusMock: vi.fn() }));

vi.mock("../hooks/use-room-status-change", () => ({ useChangeRoomStatus: useChangeRoomStatusMock }));

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

const ROOM = { id: "ROOM-103", propertyId: "GT-HB-01", number: "103", floor: "1", status: "ACTIVE", roomTypeLabel: "Estándar" } as const;
const PROPS = { propertyId: "GT-HB-01", endpoint: "http://pms.test/rooms" };

describe("RoomStatusPanel", () => {
  it("blocks a room with reason and period from the dialog", () => {
    const mutate = vi.fn();
    useChangeRoomStatusMock.mockReturnValue(mutation({ mutate }));

    render(<RoomStatusPanel room={{ ...ROOM }} {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Poner fuera de orden" }));
    expect(screen.getByRole("heading", { name: "Poner fuera de orden" })).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "Confirmar" });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Describe el motivo del bloqueo o liberación"), {
      target: { value: "Fuga de agua en baño" },
    });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: "ROOM-103", toStatus: "OOO", reason: "Fuga de agua en baño" }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    const payload = mutate.mock.calls[0][0] as { startDate: string; endDate: string };
    expect(payload.startDate < payload.endDate).toBe(true);
  });

  it("rejects an inverted period before confirming", () => {
    useChangeRoomStatusMock.mockReturnValue(mutation({}));

    render(<RoomStatusPanel room={{ ...ROOM }} {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Poner fuera de servicio" }));
    fireEvent.change(screen.getByPlaceholderText("Describe el motivo del bloqueo o liberación"), {
      target: { value: "Aire dañado" },
    });

    const inputs = screen.getAllByDisplayValue(/\d{4}-\d{2}-\d{2}/);
    fireEvent.change(inputs[0], { target: { value: "2026-09-25" } });
    fireEvent.change(inputs[1], { target: { value: "2026-09-20" } });

    expect(screen.getByText("El fin debe ser posterior al inicio.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("releases a blocked room with only a reason", () => {
    const mutate = vi.fn();
    useChangeRoomStatusMock.mockReturnValue(mutation({ mutate }));

    render(<RoomStatusPanel room={{ ...ROOM, status: "OOO" }} {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Liberar a activa" }));
    fireEvent.change(screen.getByPlaceholderText("Describe el motivo del bloqueo o liberación"), {
      target: { value: "Reparación verificada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(mutate).toHaveBeenCalledWith(
      { roomId: "ROOM-103", toStatus: "ACTIVE", reason: "Reparación verificada", startDate: null, endDate: null },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("announces a successful status change", () => {
    useChangeRoomStatusMock.mockReturnValue(
      mutation({ isSuccess: true, data: { roomId: "ROOM-103", propertyId: "GT-HB-01", status: "OOO" } }),
    );

    render(<RoomStatusPanel room={{ ...ROOM }} {...PROPS} />);

    expect(screen.getByRole("status")).toHaveTextContent("fuera de orden");
  });
});
