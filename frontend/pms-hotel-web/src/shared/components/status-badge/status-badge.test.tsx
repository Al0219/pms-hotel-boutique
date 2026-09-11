import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge } from "./status-badge";

describe("StatusBadge Component", () => {
  it("renders text content with role=status", () => {
    render(<StatusBadge variant="success">AUTHORIZED</StatusBadge>);

    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("AUTHORIZED");
  });

  it("applies correct variant and size classes", () => {
    const { container } = render(
      <StatusBadge variant="error" size="sm" ariaLabel="Error status">
        FAILED
      </StatusBadge>,
    );

    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.className).toContain("variantError");
    expect(span?.className).toContain("sizeSm");
    expect(span?.getAttribute("aria-label")).toBe("Error status");
  });

  it("renders with default neutral variant and md size when unspecified", () => {
    const { container } = render(<StatusBadge>PENDING</StatusBadge>);

    const span = container.querySelector("span");
    expect(span?.className).toContain("variantNeutral");
    expect(span?.className).toContain("sizeMd");
  });

  it("supports service, warning and info variants", () => {
    const { container: c1 } = render(<StatusBadge variant="warning">OVERDUE</StatusBadge>);
    expect(c1.querySelector("span")?.className).toContain("variantWarning");

    const { container: c2 } = render(<StatusBadge variant="info">INFO</StatusBadge>);
    expect(c2.querySelector("span")?.className).toContain("variantInfo");

    const { container: c3 } = render(<StatusBadge variant="service">HOUSEKEEPING</StatusBadge>);
    expect(c3.querySelector("span")?.className).toContain("variantService");
  });
});
