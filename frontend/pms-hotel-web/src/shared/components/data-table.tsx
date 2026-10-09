import { Fragment, type ReactNode } from "react";

import styles from "./data-table.module.css";

export interface DataTableColumn<T> {
  /** Identidad estable de la columna; no se renderiza. */
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: ReadonlyArray<DataTableColumn<T>>;
  rows: ReadonlyArray<T>;
  /** Clave estable por fila. */
  getRowKey: (row: T) => string;
  /** Nombre accesible de la tabla, expuesto como caption oculto. */
  label: string;
  /** Contenido del estado vacío. Sin él la tabla se renderiza sin filas. */
  emptyState?: ReactNode;
  /** Ancho mínimo en px cuando la tabla necesita scroll horizontal. */
  minWidth?: number;
  density?: 'standard' | 'compact';
  /** Optional row composition for shared interaction adapters; keeps table semantics. */
  renderRow?: (row: T, cells: ReactNode) => ReactNode;
  scrollLabel?: string;
}

/**
 * Tabla de datos genérica sin reglas de dominio. Estructura accesible
 * (`table`/`thead`/`th scope`/`tbody`) y estados vacíos. El contenido de cada
 * celda lo decide el módulo consumidor. Se consume vía `@/shared/components`.
 */
export function DataTable<T>({ columns, rows, getRowKey, label, emptyState, minWidth, density = 'standard', renderRow, scrollLabel }: Readonly<DataTableProps<T>>) {
  if (rows.length === 0 && emptyState !== undefined) {
    return <p className={styles.empty}>{emptyState}</p>;
  }

  return (
    <div className={styles.container} role={scrollLabel ? 'region' : undefined} aria-label={scrollLabel} tabIndex={scrollLabel ? 0 : undefined}>
      <table className={`${styles.table} ${density === 'compact' ? styles.compact : ''}`} style={minWidth ? { minWidth } : undefined}>
        <caption className={styles.visuallyHidden}>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const cells = columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ));
            return renderRow ? <Fragment key={getRowKey(row)}>{renderRow(row, cells)}</Fragment>
              : <tr key={getRowKey(row)}>{cells}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
