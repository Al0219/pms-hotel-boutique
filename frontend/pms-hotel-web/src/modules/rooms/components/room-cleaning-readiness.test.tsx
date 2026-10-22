import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RoomBoard } from './room-board';
import type { RoomCleaningSource } from '../model/room-cleaning-source';
vi.mock('../hooks/use-rooms', () => ({ useRooms: () => ({ data: [
  { id: 'a', propertyId: 'hotel', number: '101', floor: null, status: 'ACTIVE', roomTypeLabel: 'Deluxe', readOnly: true },
  { id: 'b', propertyId: 'hotel', number: '102', floor: null, status: 'ACTIVE', roomTypeLabel: 'Deluxe', readOnly: true },
  { id: 'c', propertyId: 'hotel', number: '103', floor: null, status: 'ACTIVE', roomTypeLabel: 'Deluxe', readOnly: true },
], isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock('../hooks/use-room-occupancy', () => ({ useRoomOccupancy: () => ({ connected: false, query: { isSuccess: false, isError: false, isFetching: false, refetch: vi.fn() } }) }));
const source: RoomCleaningSource = { data: { propertyId: 'hotel', rooms: [
  { roomId: 'a', status: 'DIRTY', updatedAt: '2026-10-21T12:00:00Z' },
  { roomId: 'b', status: 'INSPECTED', updatedAt: '2026-10-21T12:00:00Z' },
  { roomId: 'c', status: null, updatedAt: null },
] }, isSuccess: true, isError: false, isFetching: false, refetch: vi.fn() };
afterEach(cleanup);
const board = (cleaningSource = source) => <RoomBoard propertyId="hotel" endpoint="/api/staff/rooms" cleaningSource={cleaningSource} />;
it('shows independent cleaning states and filters without giving Reception mutation controls', () => {
  render(board());
  expect(within(screen.getByRole('row', { name: /Habitación 101/ })).getByText('Sucia')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Habitación 102/ })).getByText('Inspeccionada')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Limpieza actual'), { target: { value: 'DIRTY' } });
  expect(screen.queryByRole('row', { name: /Habitación 102/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
  expect(screen.getByRole('row', { name: /Habitación 102/ })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Marcar limpia|Inspeccionar|Iniciar seguimiento/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar limpieza' }));
  expect(source.refetch).toHaveBeenCalledOnce();
});
it('hides former readiness during refetch, errors and foreign-property data instead of assuming clean', () => {
  const view = render(board());
  for (const state of [{ ...source, isFetching: true }, { ...source, isError: true }, { ...source, data: { ...source.data!, propertyId: 'foreign' } }]) {
    view.rerender(board(state));
    expect(within(screen.getByRole('table')).queryByText('Inspeccionada')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table')).getAllByText('Limpieza no disponible')).toHaveLength(3);
  }
});
