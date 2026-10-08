import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Group } from "../model/group";

import { GroupDetail } from "./group-detail";

afterEach(() => cleanup());

const { useAddRoomingMock, useRemoveRoomingMock } = vi.hoisted(() => ({
  useAddRoomingMock: vi.fn(),
  useRemoveRoomingMock: vi.fn(),
}));

vi.mock("../hooks/use-group-rooming", () => ({
  useAddRoomingEntry: useAddRoomingMock,
  useRemoveRoomingEntry: useRemoveRoomingMock,
}));

const BASE_GROUP: Group = {
  id: "GRP-001",
  propertyId: "GT-HB-01",
  name: "Convención Maya",
  status: "TENTATIVE",
  roomBlockReference: "BLK-001",
  block: null,
  roomingList: [],
  auditReference: "AUD-001",
};

describe("GroupDetail", () => {
  it("offers only the immediate next lifecycle transition", () => {
    render(<GroupDetail group={BASE_GROUP} onTransition={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Avanzar a Confirmado" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Avanzar a En casa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Avanzar a Tentativo/ })).not.toBeInTheDocument();
  });

  it("applies the transition with the group identifier and target status", () => {
    const onTransition = vi.fn();
    render(<GroupDetail group={BASE_GROUP} onTransition={onTransition} />);

    fireEvent.click(screen.getByRole("button", { name: "Avanzar a Confirmado" }));

    expect(onTransition).toHaveBeenCalledWith("GRP-001", "DEFINITE");
  });

  it("does not offer transitions for a closed group", () => {
    render(<GroupDetail group={{ ...BASE_GROUP, status: "CLOSED" }} onTransition={vi.fn()} />);

    expect(screen.getByText(/no hay transiciones disponibles/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("presents the room block and audit references", () => {
    render(<GroupDetail group={BASE_GROUP} />);

    expect(screen.getByText("BLK-001")).toBeInTheDocument();
    expect(screen.getByText("AUD-001")).toBeInTheDocument();
    expect(screen.getByText("Sin block fechado para este grupo.")).toBeInTheDocument();
  });

  it("presents block dates, pickup and remaining rooms", () => {
    render(<GroupDetail group={{
      ...BASE_GROUP,
      block: {
        reference: "BLK-001",
        startDate: new Date("2026-10-01T00:00:00"),
        endDate: new Date("2026-10-05T00:00:00"),
        roomsBlocked: 20,
        roomsPickedUp: 14,
      },
    }} />);

    expect(screen.getByText(/14\/20 · 70% · 6 restantes/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Pickup 14 de 20/ })).toBeInTheDocument();
  });

  it("wires the rooming list when composition supplies scope and endpoint", () => {
    useAddRoomingMock.mockReturnValue({
      mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null,
    });
    useRemoveRoomingMock.mockReturnValue({
      mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null,
    });

    render(<GroupDetail
      group={{
        ...BASE_GROUP,
        roomingList: [{ id: "RL-01", guestName: "Ana Ruiz", roomLabel: "201" }],
      }}
      propertyId="GT-HB-01"
      endpoint="http://pms.test/contract/groups"
    />);

    expect(screen.getByRole("heading", { name: "Rooming list" })).toBeInTheDocument();
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Quitar" })).toBeInTheDocument();
  });
});
