import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { staffReservationFixture } from '../staff-reservation.fixture';
import { mapStaffReservationDetail } from '../mappers/staff-reservation.mapper';
import { ReservationDetail } from './reservation-detail';
const mocks = vi.hoisted(() => ({ detail: vi.fn(), perform: vi.fn() }));
vi.mock('../hooks/use-reservation-detail', () => ({ useReservationDetail: mocks.detail }));
vi.mock('../service/stay-lifecycle.service', () => ({ performStayLifecycle: mocks.perform }));
const dto = staffReservationFixture();
function detail() {
  const value = mapStaffReservationDetail(dto);
  value.stays[0].roomId = dto.reservationId; value.stays[0].roomLabel = '204';
  return value;
}
function view(props: Partial<Parameters<typeof ReservationDetail>[0]> = {}) {
  return render(<QueryClientProvider client={new QueryClient()}><ReservationDetail propertyId={dto.propertyId}
    reservationId={dto.reservationId} endpoint="/api/staff/reservations" sessionId="staff" canManage {...props} /></QueryClientProvider>);
}
beforeEach(() => { mocks.detail.mockReset().mockReturnValue({ data: detail() }); mocks.perform.mockReset(); });
describe('real lifecycle composition in Staff detail', () => {
  it('hides commands without management permission, Staff session, real transport or a concurrency token', () => {
    for (const props of [{ canManage: false }, { sessionId: undefined }, { endpoint: '/legacy/reservations' }]) {
      const rendered = view(props);
      expect(screen.queryByRole('button', { name: 'Registrar entrada' })).not.toBeInTheDocument(); rendered.unmount();
    }
    const data = detail(); delete data.stays[0].updatedAt; mocks.detail.mockReturnValue({ data });
    view(); expect(screen.queryByRole('button', { name: 'Registrar entrada' })).not.toBeInTheDocument();
    expect(mocks.perform).not.toHaveBeenCalled();
  });
  it('selects the right stay in a multi-room reservation without enabling legacy commands', async () => {
    const data = detail(); const secondId = '66666666-6666-6666-6666-666666666666';
    data.stays.push({ ...data.stays[0], id: secondId, roomLabel: '205' }); mocks.detail.mockReturnValue({ data });
    mocks.perform.mockResolvedValue({ propertyId: dto.propertyId, reservationId: dto.reservationId, stayId: secondId,
      operationId: secondId, status: 'IN_HOUSE', completedAt: '2026-10-22T19:00:00Z' });
    view();
    expect(screen.getAllByRole('button', { name: 'Registrar entrada' })).toHaveLength(2);
    for (const name of ['Cancelar reserva', 'Cambiar habitación', 'Extender estadía'])
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('group', { name: `Estadía ${secondId}` })).getByRole('button', { name: 'Registrar entrada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrada' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mocks.perform.mock.calls[0][0]).toEqual({ propertyId: dto.propertyId, reservationId: dto.reservationId, stayId: secondId });
    expect(within(screen.getByRole('group', { name: `Estadía ${dto.stays[0].stayId}` })).getByText('Reservada')).toBeInTheDocument();
  });
});
