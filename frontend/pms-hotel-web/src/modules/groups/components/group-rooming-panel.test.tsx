import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GroupRoomingPanel } from "./group-rooming-panel";

afterEach(() => cleanup());

const { useAddRoomingMock, useRemoveRoomingMock } = vi.hoisted(() => ({
  useAddRoomingMock: vi.fn(),
  useRemoveRoomingMock: vi.fn(),
}));

vi.mock("../hooks/use-group-rooming", () => ({
  useAddRoomingEntry: useAddRoomingMock,
  useRemoveRoomingEntry: useRemoveRoomingMock,
}));

const GROUP = {
  id: "GRP-001",
  propertyId: "GT-HB-01",
  name: "Convención Maya",
  status: "DEFINITE",
  roomBlockReference: "BLK-001",
  block: {
    reference: "BLK-001",
    startDate: new Date("2026-10-01T00:00:00"),
    endDate: new Date("2026-10-05T00:00:00"),
    roomsBlocked: 20,
    roomsPickedUp: 14,
  },
  roomingList: [{ id: "RL-01", guestName: "Ana Ruiz", roomLabel: "201" }],
  auditReference: null,
} as const;

const PROPS = { propertyId: "GT-HB-01", endpoint: "http://pms.test/contract/groups" };

function mockMutations(add = {}, remove = {}) {
  const addMutate = vi.fn();
  const removeMutate = vi.fn();
  useAddRoomingMock.mockReturnValue({
    mutate: addMutate, reset: vi.fn(), isPending: false, isError: false, error: null, ...add,
  });
  useRemoveRoomingMock.mockReturnValue({
    mutate: removeMutate, reset: vi.fn(), isPending: false, isError: false, error: null, ...remove,
  });
  return { addMutate, removeMutate };
}

describe("GroupRoomingPanel", () => {
  it("adds a guest to the rooming list", () => {
    const { addMutate } = mockMutations();
    render(<GroupRoomingPanel group={{ ...GROUP, roomingList: [...GROUP.roomingList] }} {...PROPS} />);

    fireEvent.change(screen.getByPlaceholderText("Nombre del huésped"), { target: { value: "Luis Paz" } });
    fireEvent.change(screen.getByPlaceholderText("201"), { target: { value: "202" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(addMutate).toHaveBeenCalledWith(
      { groupId: "GRP-001", guestName: "Luis Paz", roomLabel: "202" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("keeps the add button disabled without guest and room", () => {
    mockMutations();
    render(<GroupRoomingPanel group={{ ...GROUP, roomingList: [...GROUP.roomingList] }} {...PROPS} />);

    expect(screen.getByRole("button", { name: "Agregar" })).toBeDisabled();
  });

  it("confirms before removing a rooming entry", () => {
    const { removeMutate } = mockMutations();
    render(<GroupRoomingPanel group={{ ...GROUP, roomingList: [...GROUP.roomingList] }} {...PROPS} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(screen.getByRole("heading", { name: "Quitar de la rooming list" })).toBeInTheDocument();

    const confirmButtons = screen.getAllByRole("button", { name: "Quitar" });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    expect(removeMutate).toHaveBeenCalledWith(
      { groupId: "GRP-001", entryId: "RL-01" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("reports an empty rooming list", () => {
    mockMutations();
    render(<GroupRoomingPanel group={{ ...GROUP, roomingList: [] }} {...PROPS} />);

    expect(screen.getByText("Sin huéspedes registrados en la rooming list.")).toBeInTheDocument();
  });
});
