import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Group } from "../model/group";

import { GroupDetail } from "./group-detail";

afterEach(() => cleanup());

const BASE_GROUP: Group = {
  id: "GRP-001",
  propertyId: "GT-HB-01",
  name: "Convención Maya",
  status: "TENTATIVE",
  roomBlockReference: "BLK-001",
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
  });
});
