import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EntityPagination, useEntityPagination } from './entity-pagination';

afterEach(cleanup);
const items = Array.from({ length: 127 }, (_, index) => index + 1);
function List({ rows = items, resetKey = 'hotel-a:all' }: { rows?: number[]; resetKey?: string }) {
  const pagination = useEntityPagination(rows, resetKey);
  return <><ul aria-label="Filas">{pagination.rows.map(row => <li key={row}>Fila {row}</li>)}</ul>
    <EntityPagination label="Paginación de prueba" noun="registros" pagination={pagination} /></>;
}

describe('EntityPagination', () => {
  it('defaults to 25 and exposes accessible numbered navigation, boundaries and the final partial page', () => {
    render(<List />);
    expect(screen.getByLabelText('Filas por página')).toHaveValue('25');
    expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['5', '10', '25', '50', '100']);
    expect(screen.getByText('1–25 de 127 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getByText('26–50 de 127 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: 'Página 6' }));
    expect(screen.getByText('126–127 de 127 registros')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it.each([5, 10, 25, 50, 100])('changes size to %s and resets to page one', size => {
    render(<List />);
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: String(size) } });
    expect(screen.getByText(`1–${size} de 127 registros`)).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(size);
    expect(screen.getByRole('button', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page');
  });

  it('resets on filters and property even when the new result still has several pages, retaining size', () => {
    const { rerender } = render(<List />);
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    rerender(<List rows={items.slice(50)} resetKey="hotel-a:filtered" />);
    expect(screen.getByText('1–5 de 77 registros')).toBeInTheDocument();
    expect(screen.getByText('Fila 51')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    rerender(<List rows={items.slice(100)} resetKey="hotel-b:filtered" />);
    expect(screen.getByText('1–5 de 27 registros')).toBeInTheDocument();
    expect(screen.getByText('Fila 101')).toBeInTheDocument();
  });

  it('clamps a shrinking result, handles zero rows and does not restore an obsolete page', () => {
    const { rerender } = render(<List />);
    fireEvent.click(screen.getByRole('button', { name: 'Página 6' }));
    rerender(<List rows={items.slice(0, 30)} />);
    expect(screen.getByText('26–30 de 30 registros')).toBeInTheDocument();
    rerender(<List rows={[]} />);
    expect(screen.getByText('0–0 de 0 registros')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
    rerender(<List />);
    expect(screen.getByText('1–25 de 127 registros')).toBeInTheDocument();
  });

  it('keeps distant page navigation compact with ellipses', () => {
    render(<List />);
    fireEvent.change(screen.getByLabelText('Filas por página'), { target: { value: '5' } });
    expect(screen.getByText('…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página 26' }));
    expect(screen.getByText('126–127 de 127 registros')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(screen.getByText('121–125 de 127 registros')).toBeInTheDocument();
  });
});
