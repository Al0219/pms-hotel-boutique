import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StaffSession } from '@/modules/auth';
import type { ReactNode } from 'react';
import { StaffCalendarWorkspace, StaffReservationsWorkspace, StaffRoomsWorkspace } from './staff-property-workspace';

const mocks = vi.hoisted(() => ({ scope: vi.fn(), session: vi.fn(), center: vi.fn(), detail: vi.fn(), board: vi.fn(), catalog: vi.fn(), stays: vi.fn(), calendar: vi.fn() }));
const sessionFixture: StaffSession = {
  id: 'staff-1', userName: 'QA Staff', roleId: 'gerencia', roleName: 'Gerencia', permissions: [],
  memberships: [{ propertyId: 'GT-HB-01', propertyCode: 'GT-HB-01', name: 'Hotel Boutique',
    timezone: 'America/Guatemala', currency: 'GTQ', active: true }],
};
vi.mock('@/modules/properties', () => ({ usePropertyScope: mocks.scope }));
vi.mock('@/modules/auth', () => ({ useStaffSession: mocks.session }));
vi.mock('@/modules/reservations', () => ({ useStaffReservationStays: mocks.stays, CalendarGantt: (props: unknown) => { mocks.calendar(props); return <p>Calendario del hotel</p>; }, ReservationCenter: (props: unknown) => { mocks.center(props); return <p>Reservas del hotel</p>; }, ReservationDetail: (props: unknown) => { mocks.detail(props); return <p>Detalle de reserva</p>; } }));
vi.mock('@/modules/rooms', () => ({ RoomBoard: (props: { viewControls?: ReactNode }) => { mocks.board(props); return <>{props.viewControls}<p>Tablero del hotel</p></>; }, RoomCatalogAdmin: (props: unknown) => { mocks.catalog(props); return <p>Catálogo del hotel</p>; } }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.stays.mockReturnValue({ data: [], isSuccess: true, isError: false, isFetching: false, error: null, refetch: vi.fn() }); vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'true');
  mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: ['GT-HB-01'] } });
  mocks.session.mockReturnValue({ ...sessionFixture });
});
afterEach(() => vi.unstubAllEnvs());

describe('Staff property composition', () => {
  it.each([null, { kind: 'ALL_PROPERTIES', propertyIds: ['GT-HB-01', 'GT-HB-03'] }])('requires one explicit authorized property', scope => {
    mocks.scope.mockReturnValue({ ready: true, scope });
    render(<StaffReservationsWorkspace />);
    expect(screen.getByRole('heading', { name: 'Selecciona una propiedad' })).toBeInTheDocument();
    expect(mocks.center).not.toHaveBeenCalled();
  });
  it('uses session property scope instead of a global property default for list and detail', () => {
    mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: ['GT-HB-03'] } });
    render(<StaffReservationsWorkspace reservationId="R1" />);
    expect(mocks.detail).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 'GT-HB-03', reservationId: 'R1' }));
  });
  it('keeps the operational board and physical catalog as separate views', () => {
    render(<StaffRoomsWorkspace />);
    expect(mocks.board).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 'GT-HB-01', propertyName: 'Hotel Boutique', timezone: 'America/Guatemala' }));
    fireEvent.click(screen.getByRole('button', { name: 'Administrar inventario' }));
    expect(mocks.catalog).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 'GT-HB-01', sessionId: 'staff-1', canManage: true }));
    expect(screen.queryByText('Tablero del hotel')).not.toBeInTheDocument();
  });
  it.each(['GERENCIA', 'SUPER_ADMIN'])('does not let real %s manage inventory without COMMERCIAL_MANAGE', roleId => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
    mocks.session.mockReturnValue({ ...sessionFixture, id: 'real-staff', roleId });
    render(<StaffRoomsWorkspace />); fireEvent.click(screen.getByRole('button', { name: 'Administrar inventario' }));
    expect(mocks.catalog).toHaveBeenCalledWith(expect.objectContaining({ canManage: false }));
    expect(mocks.board).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/api/staff/rooms', occupancySource: mocks.stays.mock.results[0].value }));
    expect(mocks.stays).toHaveBeenCalledWith('GT-HB-01', 'real-staff', true);
  });
  it.each(['false', 'true'])('uses the real Staff BFF for list and detail with mocks=%s', mocksEnabled => {
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', mocksEnabled);
    const view = render(<StaffReservationsWorkspace />);
    expect(mocks.center).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/api/staff/reservations', canCreate: false }));
    view.rerender(<StaffReservationsWorkspace reservationId="real-reservation" />);
    expect(mocks.detail).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/api/staff/reservations', canManage: false, reservationId: 'real-reservation' }));
  });
});

it('enables contracted real management with COMMERCIAL_MANAGE and keeps real source composition', () => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', 'false');
  mocks.session.mockReturnValue({ ...sessionFixture, roleId: 'GERENCIA', permissions: ['COMMERCIAL_MANAGE'] });
  render(<StaffRoomsWorkspace />);
  expect(mocks.board).toHaveBeenCalledWith(expect.objectContaining({ canManage: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Administrar inventario' }));
  expect(mocks.catalog).toHaveBeenCalledWith(expect.objectContaining({ canManage: true }));
});

it.each(['true', 'false'])('enables real initial assignment with permission and mocks=%s', flag => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', flag);
  mocks.session.mockReturnValue({ ...sessionFixture, permissions: ['RESERVATION_MANAGE'] });
  render(<StaffReservationsWorkspace reservationId="real-reservation" />);
  expect(mocks.detail).toHaveBeenCalledWith(expect.objectContaining({ canManage: true, endpoint: '/api/staff/reservations' }));
});

it.each(['true', 'false'])('composes calendar from PropertyContext and Staff session with mocks=%s', flag => {
  vi.stubEnv('NEXT_PUBLIC_USE_MOCK_API', flag);
  vi.stubEnv('NEXT_PUBLIC_PROPERTY_ID', 'env-must-be-ignored');
  const view = render(<StaffCalendarWorkspace />);
  expect(mocks.calendar).toHaveBeenLastCalledWith(expect.objectContaining({ propertyId: 'GT-HB-01', sessionId: 'staff-1' }));
  mocks.scope.mockReturnValue({ ready: true, scope: { kind: 'PROPERTY', propertyIds: ['GT-HB-03'] } });
  view.rerender(<StaffCalendarWorkspace />);
  expect(mocks.calendar).toHaveBeenLastCalledWith(expect.objectContaining({ propertyId: 'GT-HB-03', sessionId: 'staff-1' }));
});
it.each([null, { kind: 'ALL_PROPERTIES', propertyIds: ['GT-HB-01', 'GT-HB-03'] }])('does not mount calendar without specific scope', scope => {
  mocks.scope.mockReturnValue({ ready: true, scope });
  render(<StaffCalendarWorkspace />);
  expect(mocks.calendar).not.toHaveBeenCalled();
  expect(screen.getByRole('heading', { name: 'Selecciona una propiedad' })).toBeInTheDocument();
});
it('waits for the authorized property before mounting calendar', () => {
  mocks.scope.mockReturnValue({ ready: false, scope: null });
  render(<StaffCalendarWorkspace />);
  expect(mocks.calendar).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent('Preparando');
});
