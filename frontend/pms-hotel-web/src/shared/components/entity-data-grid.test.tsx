import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EntityDataGrid, type EntityDataGridColumn } from './entity-data-grid';

const rows = [{ id: 'room1', code: '101' }];
describe('EntityDataGrid shared table composition', () => {
  it('preserves semantic grouped cells and ignores editors/row actions by default', () => {
    const editor = vi.fn(() => <input aria-label="Edit code" />);
    const interactiveRow = vi.fn((row, cells) => <tr onPointerUp={() => { throw new Error('swipe should be inactive'); }}>{cells}</tr>);
    render(<EntityDataGrid label="Entities" rows={rows} getRowKey={row => row.id}
      renderInteractiveRow={interactiveRow} columns={[{ key: 'identity', header: 'Identity', render: row => <strong>{row.code}</strong>, renderEditor: editor }]} />);
    const table = screen.getByRole('table', { name: 'Entities' });
    expect(table).toBeInTheDocument(); expect(screen.getAllByRole('columnheader')).toHaveLength(1);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.doubleClick(screen.getByText('101')); fireEvent.pointerUp(screen.getByRole('row', { name: '101' }));
    expect(editor).not.toHaveBeenCalled(); expect(interactiveRow).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Entities' })).toHaveAttribute('tabindex', '0');
  });
  it('offers explicit inline/row composition slots without owning a network transport', () => {
    const columns: EntityDataGridColumn<typeof rows[number]>[] = [{ key: 'identity', header: 'Identity', render: row => row.code,
      renderEditor: row => <input aria-label="Edit code" defaultValue={row.code} /> }];
    const rowAdapter = vi.fn((row, cells) => <tr aria-label={`Actions for ${row.code}`}>{cells}</tr>);
    render(<EntityDataGrid label="Entities" rows={rows} getRowKey={row => row.id} columns={columns} readOnly={false} renderInteractiveRow={rowAdapter} />);
    expect(screen.getByRole('textbox', { name: 'Edit code' })).toHaveValue('101');
    expect(screen.getByRole('row', { name: 'Actions for 101' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
