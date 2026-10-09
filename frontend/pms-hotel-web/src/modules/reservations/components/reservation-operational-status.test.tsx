import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationCenter, mapStaffReservationDetail } from '../mappers/staff-reservation.mapper';
import { ReservationList } from './reservation-list';
import { ReservationDetail } from './reservation-detail';
import type { StaffReservationDto } from '../dtos/staff-reservation.dto';

const mocks = vi.hoisted(() => ({ detail: vi.fn() }));
vi.mock('../hooks/use-reservation-detail', () => ({ useReservationDetail: mocks.detail }));
afterEach(cleanup);
const cases: Array<{ label: string; value: string; parent: StaffReservationDto['status']; state: StaffReservationDto['stays'][number]['status']; assigned?: boolean }> = [
  { label: 'Pendiente', value: 'PENDING', parent: 'PENDING', state: 'RESERVED' },
  { label: 'Confirmada', value: 'CONFIRMED', parent: 'CONFIRMED', state: 'RESERVED' },
  { label: 'Asignada', value: 'ASSIGNED', parent: 'CONFIRMED', state: 'RESERVED', assigned: true },
  { label: 'En estancia', value: 'IN_HOUSE', parent: 'CONFIRMED', state: 'IN_HOUSE', assigned: true },
  { label: 'Completada', value: 'COMPLETED', parent: 'CONFIRMED', state: 'CHECKED_OUT', assigned: true },
  { label: 'No show', value: 'NO_SHOW', parent: 'CONFIRMED', state: 'NO_SHOW' },
  { label: 'Cancelada', value: 'CANCELLED', parent: 'CANCELLED', state: 'CANCELLED' },
];
function fixture(index: number) {
  const dto = staffReservationFixture(), item = cases[index];
  dto.reservationId = `${index + 1}1111111-1111-1111-1111-111111111111`;
  dto.confirmationCode = `REAL-${index}`; dto.status = item.parent; dto.stays[0].status = item.state;
  dto.stays[0].room = item.assigned ? { roomId: '77777777-7777-7777-7777-777777777777', code: '203' } : null;
  return dto;
}
describe('real reservation badges and operational filter', () => {
  it('filters the seven visible states, combining search and dates without replacing real status', () => {
    const dtos = cases.map((_, index) => fixture(index)), items = mapStaffReservationCenter(dtos).reservations;
    render(<ReservationList propertyId={dtos[0].propertyId} reservations={items} />);
    const select = screen.getByLabelText('Filtrar por estado');
    expect(within(select).getAllByRole('option')).toHaveLength(8);
    expect(within(select).queryByRole('option', { name: 'Waitlist' })).not.toBeInTheDocument();
    for (const [index, item] of cases.entries()) {
      fireEvent.change(select, { target: { value: item.value } });
      const table = screen.getByRole('table', { name: 'Reservas de la propiedad' });
      expect(within(table).getByText(item.label)).toBeInTheDocument();
      expect(within(table).getByRole('link', { name: `REAL-${index}` })).toBeInTheDocument();
      expect(within(table).getAllByRole('row')).toHaveLength(2);
    }
    fireEvent.change(select, { target: { value: 'ASSIGNED' } });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'REAL-2' } });
    fireEvent.change(screen.getByLabelText('Llegada desde'), { target: { value: '2026-11-01' } });
    expect(screen.getByRole('link', { name: 'REAL-2' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Llegada hasta'), { target: { value: '2026-10-30' } });
    expect(screen.queryByRole('link', { name: 'REAL-2' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByRole('link', { name: 'REAL-2' })).toBeInTheDocument();
    expect(items[2]).toMatchObject({ status: 'CONFIRMED', operationalStatus: 'ASSIGNED' });
  });
  it.each(cases.map((item, index) => ({ ...item, index })))('uses $label in the real detail without exposing unsupported mutations', ({ label, index }) => {
    const dto = fixture(index);
    mocks.detail.mockReturnValue({ data: mapStaffReservationDetail(dto), refetch: vi.fn() });
    render(<ReservationDetail propertyId={dto.propertyId} reservationId={dto.reservationId} endpoint="/api/staff/reservations" sessionId="staff" canManage />);
    const header = screen.getByRole('heading', { name: `Reserva ${dto.confirmationCode}` }).closest('header')!;
    expect(within(header).getByText(label, { selector: 'span' })).toBeInTheDocument();
    for (const name of ['Cancelar reserva', 'Cambiar habitación', 'Extender estadía', 'Marcar no-show']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });
});
