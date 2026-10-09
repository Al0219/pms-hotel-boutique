import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn, type DataTableProps } from './data-table';

export interface EntityDataGridColumn<T> extends DataTableColumn<T> {
  /** Inline editor slot. Only used with explicit writable composition; no modal behavior. */
  renderEditor?: (row: T) => ReactNode;
}
export interface EntityDataGridProps<T> extends Omit<DataTableProps<T>, 'columns' | 'density' | 'renderRow' | 'scrollLabel'> {
  columns: readonly EntityDataGridColumn<T>[];
  readOnly?: boolean;
  /** Row adapter slot for swipe/keyboard actions. The adapter must return a semantic tr. */
  renderInteractiveRow?: DataTableProps<T>['renderRow'];
}

/** Compact grouped entity presentation over the shared table, with read-only defaults. */
export function EntityDataGrid<T>({ columns, readOnly = true, renderInteractiveRow, ...props }: Readonly<EntityDataGridProps<T>>) {
  return <DataTable {...props} density="compact" scrollLabel={props.label}
    columns={columns.map(column => ({ ...column, render: !readOnly && column.renderEditor ? column.renderEditor : column.render }))}
    renderRow={readOnly ? undefined : renderInteractiveRow} />;
}
