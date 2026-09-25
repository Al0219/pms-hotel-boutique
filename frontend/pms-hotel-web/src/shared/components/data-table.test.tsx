import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

afterEach(() => cleanup());

interface Row {
  id: string;
  name: string;
}

const columns: ReadonlyArray<DataTableColumn<Row>> = [
  { key: "id", header: "Código", render: (row) => row.id },
  { key: "name", header: "Nombre", render: (row) => <strong>{row.name}</strong> },
];

describe("DataTable", () => {
  it("renders an accessible table with headers and rows", () => {
    render(
      <DataTable
        label="Reservas"
        columns={columns}
        rows={[{ id: "A", name: "Ana" }, { id: "B", name: "Beto" }]}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole("table", { name: "Reservas" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Beto")).toBeInTheDocument();
  });

  it("renders the empty state instead of the table when there are no rows", () => {
    render(
      <DataTable
        label="Reservas"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyState="Sin reservas."
      />,
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("Sin reservas.")).toBeInTheDocument();
  });

  it("renders an empty table when no empty state is provided", () => {
    render(<DataTable label="Reservas" columns={columns} rows={[]} getRowKey={(row) => row.id} />);

    expect(screen.getByRole("table", { name: "Reservas" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(1);
  });
});
