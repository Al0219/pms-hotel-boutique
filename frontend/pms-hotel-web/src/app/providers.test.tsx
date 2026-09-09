import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Providers } from "./providers";

describe("Providers", () => {
  it("renders technical children through the Query provider", () => {
    render(<Providers><p>Technical shell</p></Providers>);

    expect(screen.getByText("Technical shell")).toBeInTheDocument();
  });
});
