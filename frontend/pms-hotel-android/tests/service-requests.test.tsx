import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useEffect, useRef } from 'react';
import { Slot, usePathname } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Pressable, Text, View } from 'react-native';

import AccountRoute from '../app/(guest)/account';
import RequestsRoute from '../app/(guest)/services/requests';
import { AccountStayHubScreen } from '@/modules/account';
import {
  canModifyServiceRequest,
  canCompleteServiceRequest,
  filterServiceRequests,
  formatServiceDate,
  getNearestServiceTime,
  getFirstAvailableServiceDate,
  getStayCheckoutDateTimeMs,
  getServiceRequestCompletionEligibleAt,
  getServiceDateTimeMs,
  initialSessionServiceRequestsState,
  SessionServiceRequestsProvider,
  SessionServiceRequestsScreen,
  SessionServiceRequestCard,
  getSessionRequestSwipeRevealDistance,
  hasServiceTimeAvailableToday,
  isServiceTimeTextAllowed,
  isServiceDateTimeAllowed,
  isServiceDateWithinStay,
  isServiceWithinStayWindow,
  hotelStayPolicy,
  sessionServiceRequestEditPath,
  sessionServiceRequestsReducer,
  useSessionServiceRequests,
  type AddSessionServiceRequestInput,
  type SessionServiceRequest,
} from '@/modules/service-requests';
import { MockStayService } from '@/modules/stay';

const sampleRequest: AddSessionServiceRequestInput = {
  kind: 'HOUSEKEEPING', origin: 'SERVICES', status: 'REQUESTED', summary: 'Limpieza completa · 10:00–11:00', title: 'Limpieza',
};

function SeedRequests({ requests }: { requests: readonly AddSessionServiceRequestInput[] }) {
  const { addRequest } = useSessionServiceRequests();
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    requests.forEach(addRequest);
  }, [addRequest, requests]);

  return null;
}

function PathProbe() { return <Text testID="pathname">{usePathname()}</Text>; }

function RemoveRequestButton({ sessionRequestId }: { sessionRequestId: string }) {
  const { removeRequest } = useSessionServiceRequests();
  return <Pressable onPress={() => removeRequest(sessionRequestId)} testID={`remove-${sessionRequestId}`} />;
}

describe('Session service requests — IMP-AND-0112', () => {
  it('starts empty, keeps newest first, supports types/origins, and dedupes local events', () => {
    const older = { ...sampleRequest, createdAtMs: 10, sessionRequestId: 'session-request-1' };
    const newer = { kind: 'HOTEL_ASSIGNED' as const, origin: 'CHAT' as const, status: 'ASSIGNED' as const, title: 'Traslado al aeropuerto', createdAtMs: 20, sessionRequestId: 'session-request-2' };
    const once = sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request: older, dedupeKey: 'one' });
    const ordered = sessionServiceRequestsReducer(once, { type: 'ADD_REQUEST', request: newer, dedupeKey: 'two' });
    const duplicated = sessionServiceRequestsReducer(ordered, { type: 'ADD_REQUEST', request: newer, dedupeKey: 'two' });

    expect(initialSessionServiceRequestsState.requests).toEqual([]);
    expect(ordered.requests.map((request) => request.sessionRequestId)).toEqual(['session-request-2', 'session-request-1']);
    expect(ordered.requests[0]).toMatchObject({ kind: 'HOTEL_ASSIGNED', origin: 'CHAT', status: 'ASSIGNED' });
    expect(duplicated).toBe(ordered);
  });

  it('removes only the selected session request and preserves the remaining newest-first order', () => {
    const first = sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request: { ...sampleRequest, createdAtMs: 10, sessionRequestId: 'session-request-1' } });
    const second = sessionServiceRequestsReducer(first, { type: 'ADD_REQUEST', request: { ...sampleRequest, createdAtMs: 30, sessionRequestId: 'session-request-3' } });
    const third = sessionServiceRequestsReducer(second, { type: 'ADD_REQUEST', request: { ...sampleRequest, createdAtMs: 20, sessionRequestId: 'session-request-2' } });
    const removed = sessionServiceRequestsReducer(third, { type: 'REMOVE_REQUEST', sessionRequestId: 'session-request-2' });

    expect(removed.requests.map((request) => request.sessionRequestId)).toEqual(['session-request-3', 'session-request-1']);
  });

  it('uses the complete editable card for edit without a visible Edit button', async () => {
    const onEdit = jest.fn();
    const request = { ...sampleRequest, kind: 'ROOM_SERVICE' as const, sessionRequestId: 'session-request-9', createdAtMs: 9 };
    const rendered = await render(<SessionServiceRequestCard onEdit={onEdit} request={request} />);

    expect(rendered.queryByText('Editar')).toBeNull();
    fireEvent.press(rendered.getByLabelText('Editar Limpieza'));
    expect(onEdit).toHaveBeenCalledWith(request);
  });

  it('maps every request kind to its editor route', () => {
    const request = { ...sampleRequest, sessionRequestId: 'session-request-10', createdAtMs: 10 };
    expect(sessionServiceRequestEditPath({ ...request, kind: 'ROOM_SERVICE' })).toBe('/services/room-service');
    expect(sessionServiceRequestEditPath({ ...request, kind: 'VEHICLE_REQUEST' })).toBe('/valet');
    expect(sessionServiceRequestEditPath({ ...request, kind: 'TRANSFER' })).toBe('/valet');
    expect(sessionServiceRequestEditPath({ ...request, kind: 'HOUSEKEEPING' })).toBe('/services/housekeeping');
    expect(sessionServiceRequestEditPath({ ...request, kind: 'LATE_CHECKOUT' })).toBe('/services/requests');
    expect(sessionServiceRequestEditPath({ ...request, kind: 'HOTEL_ASSIGNED' })).toBe('/services/requests');
  });

  it('derives the destructive swipe reveal from half of the measured card width', () => {
    expect(getSessionRequestSwipeRevealDistance(320)).toBe(160);
    expect(getSessionRequestSwipeRevealDistance(287)).toBe(143.5);
  });

  it('filters the session-only history by every approved status without changing its order', () => {
    const requests = [
      { ...sampleRequest, sessionRequestId: 'c', createdAtMs: 3, status: 'COMPLETED' as const },
      { ...sampleRequest, sessionRequestId: 'b', createdAtMs: 2, status: 'ASSIGNED' as const },
      { ...sampleRequest, sessionRequestId: 'a', createdAtMs: 1, status: 'REQUESTED' as const },
    ];
    expect(filterServiceRequests(requests, 'ACTIVE').map((item) => item.sessionRequestId)).toEqual(['b', 'a']);
    expect(filterServiceRequests(requests, 'REQUESTED').map((item) => item.sessionRequestId)).toEqual(['a']);
    expect(filterServiceRequests(requests, 'ASSIGNED').map((item) => item.sessionRequestId)).toEqual(['b']);
    expect(filterServiceRequests(requests, 'COMPLETED').map((item) => item.sessionRequestId)).toEqual(['c']);
    expect(filterServiceRequests(requests, 'ALL').map((item) => item.sessionRequestId)).toEqual(['c', 'b', 'a']);
  });

  it('uses an injected current time for the exact thirty-minute creation boundary and time-only midnight limit', () => {
    const at1300 = new Date(2026, 0, 1, 13, 0).getTime();
    expect(isServiceTimeTextAllowed('13:29', at1300)).toBe(false);
    expect(isServiceTimeTextAllowed('13:30', at1300)).toBe(true);
    expect(isServiceTimeTextAllowed('13:31', at1300)).toBe(true);
    expect(hasServiceTimeAvailableToday(new Date(2026, 0, 1, 23, 29).getTime())).toBe(true);
    expect(hasServiceTimeAvailableToday(new Date(2026, 0, 1, 23, 30).getTime())).toBe(false);
    expect(isServiceTimeTextAllowed('00:30', new Date(2026, 0, 1, 23, 45).getTime())).toBe(false);
  });

  it('combines local YYYY-MM-DD dates with time or slot starts for creation and future-date cutoff', () => {
    const now = new Date(2026, 8, 15, 13, 7).getTime();
    expect(formatServiceDate(new Date(now))).toBe('2026-09-15');
    expect(isServiceDateTimeAllowed('2026-09-15', '13:36', now)).toBe(false);
    expect(isServiceDateTimeAllowed('2026-09-15', '13:37', now)).toBe(true);
    expect(isServiceDateTimeAllowed('2026-09-15', '13:38', now)).toBe(true);
    expect(isServiceDateTimeAllowed('2026-09-16', '00:00', now)).toBe(true);
    expect(getServiceDateTimeMs('2026-09-16', '08:00–09:00')).toBe(new Date(2026, 8, 16, 8, 0).getTime());
    expect(getNearestServiceTime('2026-09-15', ['13:36', '13:37', '13:38'], now)).toBe('13:37');
    expect(getNearestServiceTime('2026-09-16', ['08:00', '13:37'], now, '13:37')).toBe('13:37');
  });

  it('keeps every guest-selected service date inside the inclusive checkout boundary', () => {
    const now = new Date(2026, 8, 15, 13, 7).getTime();
    expect(isServiceDateWithinStay('2026-09-15', now, '2026-09-18')).toBe(true);
    expect(isServiceDateWithinStay('2026-09-18', now, '2026-09-18')).toBe(true);
    expect(isServiceDateWithinStay('2026-09-19', now, '2026-09-18')).toBe(false);
    expect(getFirstAvailableServiceDate(new Date(2026, 8, 18, 14, 31).getTime(), ['09:00–10:00', '10:00–11:00', '11:00–12:00', '14:00–15:00'], '2026-09-18')).toBeNull();
    expect(getFirstAvailableServiceDate(new Date(2026, 8, 18, 23, 31).getTime(), ['00:00', '13:37'], '2026-09-18')).toBeNull();
  });

  it('uses the approved frontend/mock normal checkout policy for point services and slot ends', () => {
    const now = new Date(2026, 8, 17, 8, 0).getTime();
    const departure = '2026-09-18';
    expect(hotelStayPolicy.standardCheckoutTime).toBe('12:00');
    expect(getStayCheckoutDateTimeMs(departure)).toBe(new Date(2026, 8, 18, 12, 0).getTime());
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: '2026-09-17', startTime: '20:00' })).toBe(true);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '11:59' })).toBe(true);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '12:00' })).toBe(true);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '12:01' })).toBe(false);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: '2026-09-19', startTime: '08:00' })).toBe(false);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '09:00–10:00' })).toBe(true);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '10:00–11:00' })).toBe(true);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '11:00–12:00' })).toBe(true);
    expect(isServiceWithinStayWindow({ departure, nowMs: now, serviceDate: departure, startTime: '14:00–15:00' })).toBe(false);
  });

  it('has no new service time when the thirty-minute minimum exceeds checkout', () => {
    const now = new Date(2026, 8, 18, 11, 31).getTime();
    expect(getFirstAvailableServiceDate(now, ['11:00–12:00', '14:00–15:00'], '2026-09-18')).toBeNull();
    expect(getFirstAvailableServiceDate(now, ['11:59', '12:00', '12:01'], '2026-09-18')).toBeNull();
  });

  it('keeps the approved late checkout exception at 14:00 apart from normal checkout', () => {
    const late = { ...sampleRequest, kind: 'LATE_CHECKOUT' as const, sessionRequestId: 'late-checkout', createdAtMs: 0, details: { type: 'LATE_CHECKOUT' as const, serviceDate: '2026-09-18', checkoutUntil: '14:00' } };
    expect(getServiceRequestCompletionEligibleAt(late)).toBe(new Date(2026, 8, 18, 14, 0).getTime());
    expect(canCompleteServiceRequest(late, new Date(2026, 8, 18, 12, 0).getTime())).toBe(false);
    expect(canCompleteServiceRequest(late, new Date(2026, 8, 18, 14, 0).getTime())).toBe(true);
  });

  it('enables completion only at the configured service moment, using slot end for housekeeping', () => {
    const make = (kind: SessionServiceRequest['kind'], details: NonNullable<SessionServiceRequest['details']>): SessionServiceRequest => ({ sessionRequestId: kind, kind, origin: 'SERVICES', status: 'REQUESTED', title: kind, createdAtMs: 0, details });
    const room = make('ROOM_SERVICE', { type: 'ROOM_SERVICE', serviceDate: '2026-09-16', deliveryTime: '14:30', items: [] });
    const vehicle = make('VEHICLE_REQUEST', { type: 'VEHICLE_REQUEST', serviceDate: '2026-09-16', requestedTime: '14:30', sessionVehicleId: 'vehicle' });
    const transfer = make('TRANSFER', { type: 'TRANSFER', destinationKey: 'airport', scheduledAtMs: new Date(2026, 8, 16, 14, 30).getTime(), passengers: 1 });
    const housekeeping = make('HOUSEKEEPING', { type: 'HOUSEKEEPING', serviceDate: '2026-09-16', timeSlot: '11:00–12:00', cleaningType: 'FULL_CLEANING' });
    const late = make('LATE_CHECKOUT', { type: 'LATE_CHECKOUT', serviceDate: '2026-09-16', checkoutUntil: '14:00' });
    const assigned = make('HOTEL_ASSIGNED', { type: 'HOTEL_ASSIGNED' });
    expect(canCompleteServiceRequest(room, new Date(2026, 8, 16, 14, 29).getTime())).toBe(false);
    expect(canCompleteServiceRequest(room, new Date(2026, 8, 16, 14, 30).getTime())).toBe(true);
    expect(canCompleteServiceRequest(vehicle, new Date(2026, 8, 16, 14, 29).getTime())).toBe(false);
    expect(canCompleteServiceRequest(vehicle, new Date(2026, 8, 16, 14, 30).getTime())).toBe(true);
    expect(canCompleteServiceRequest(transfer, new Date(2026, 8, 16, 14, 29).getTime())).toBe(false);
    expect(canCompleteServiceRequest(transfer, new Date(2026, 8, 16, 14, 30).getTime())).toBe(true);
    expect(canCompleteServiceRequest(housekeeping, new Date(2026, 8, 16, 11, 59).getTime())).toBe(false);
    expect(getServiceRequestCompletionEligibleAt(housekeeping)).toBe(new Date(2026, 8, 16, 12, 0).getTime());
    expect(canCompleteServiceRequest(housekeeping, new Date(2026, 8, 16, 12, 0).getTime())).toBe(true);
    expect(canCompleteServiceRequest(late, new Date(2026, 8, 16, 13, 59).getTime())).toBe(false);
    expect(canCompleteServiceRequest(late, new Date(2026, 8, 16, 14, 0).getTime())).toBe(true);
    expect(getServiceRequestCompletionEligibleAt(assigned)).toBeNull();
  });

  it('keeps the check in a separate right-side action and never opens edit from it', async () => {
    const onComplete = jest.fn(); const onEdit = jest.fn();
    const request = { ...sampleRequest, sessionRequestId: 'separate-check', createdAtMs: 1, details: { type: 'ROOM_SERVICE' as const, serviceDate: '2026-01-01', items: [], deliveryTime: '14:00' } };
    const rendered = await render(<SessionServiceRequestCard nowMs={new Date(2026, 0, 1, 14, 0).getTime()} onComplete={onComplete} onEdit={onEdit} request={request} />);
    await fireEvent.press(rendered.getByTestId('complete-session-service-request-separate-check'));
    expect(onEdit).not.toHaveBeenCalled();
    expect(rendered.getByTestId('complete-session-service-request-modal-separate-check')).toBeTruthy();
    await fireEvent.press(rendered.getByTestId('complete-session-service-request-modal-separate-check-confirm'));
    expect(onComplete).toHaveBeenCalledWith(request);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('applies the twenty-five-minute modification cutoff while leaving unscheduled requests editable', () => {
    const request = { ...sampleRequest, sessionRequestId: 'cutoff', createdAtMs: 0, details: { type: 'ROOM_SERVICE' as const, serviceDate: '2026-01-01', items: [], deliveryTime: '14:00' } };
    const at1329 = new Date(2026, 0, 1, 13, 29).getTime();
    const at1335 = new Date(2026, 0, 1, 13, 35).getTime();
    expect(canModifyServiceRequest(request, at1329)).toBe(true);
    expect(canModifyServiceRequest(request, at1335)).toBe(false);
    expect(canModifyServiceRequest({ ...sampleRequest, kind: 'HOTEL_ASSIGNED', sessionRequestId: 'unscheduled', createdAtMs: 0, details: { type: 'HOTEL_ASSIGNED' } }, at1335)).toBe(true);
  });

  it('keeps configurable request kinds tappable and leaves fixed Late check-out as detail-only', async () => {
    const onEdit = jest.fn();
    const requests = [
      { ...sampleRequest, kind: 'HOUSEKEEPING' as const, title: 'Limpieza' },
      { ...sampleRequest, kind: 'ROOM_SERVICE' as const, title: 'Room Service' },
      { ...sampleRequest, kind: 'VEHICLE_REQUEST' as const, title: 'Solicitud de vehículo' },
      { ...sampleRequest, kind: 'TRANSFER' as const, title: 'Traslado' },
      { ...sampleRequest, kind: 'LATE_CHECKOUT' as const, title: 'Late check-out', details: { type: 'LATE_CHECKOUT' as const, serviceDate: '2026-09-16', checkoutUntil: '14:00' } },
      { ...sampleRequest, kind: 'HOTEL_ASSIGNED' as const, title: 'Servicio asignado' },
    ];
    const rendered = await render(<View>{requests.map((request, index) => <SessionServiceRequestCard key={request.kind} onEdit={onEdit} request={{ ...request, createdAtMs: index, sessionRequestId: `session-request-edit-${index}` }} />)}</View>);

    for (const request of requests.filter((request) => request.kind !== 'LATE_CHECKOUT')) await fireEvent.press(rendered.getByLabelText(`Editar ${request.title}`));
    expect(onEdit).toHaveBeenCalledTimes(requests.length - 1);
    expect(rendered.queryByLabelText('Editar Late check-out')).toBeNull();
    await rendered.unmount();
  });

  it('marks requests completed without deleting them from session state', () => {
    const request = { ...sampleRequest, createdAtMs: 10, sessionRequestId: 'session-request-completed' };
    const seeded = sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request });
    const completed = sessionServiceRequestsReducer(seeded, { type: 'COMPLETE_REQUEST', sessionRequestId: request.sessionRequestId });

    expect(completed.requests).toHaveLength(1);
    expect(completed.requests[0]).toMatchObject({ sessionRequestId: request.sessionRequestId, status: 'COMPLETED' });
  });

  it('keeps vehicle requests for distinct local dates and times separate, completing only the exact request', () => {
    const first = {
      kind: 'VEHICLE_REQUEST' as const, origin: 'VALET' as const, status: 'REQUESTED' as const, title: 'Solicitud de vehículo',
      createdAtMs: 1, sessionRequestId: 'vehicle-request-1', details: { type: 'VEHICLE_REQUEST' as const, sessionVehicleId: 'vehicle-1', serviceDate: '2026-09-16', requestedTime: '08:00' },
    };
    const second = {
      ...first, createdAtMs: 2, sessionRequestId: 'vehicle-request-2', details: { ...first.details, serviceDate: '2026-09-17', requestedTime: '09:30' },
    };
    const state = sessionServiceRequestsReducer(
      sessionServiceRequestsReducer(initialSessionServiceRequestsState, { type: 'ADD_REQUEST', request: first }),
      { type: 'ADD_REQUEST', request: second },
    );
    const completed = sessionServiceRequestsReducer(state, { type: 'COMPLETE_REQUEST', sessionRequestId: second.sessionRequestId });

    expect(completed.requests).toHaveLength(2);
    expect(completed.requests.find((request) => request.sessionRequestId === first.sessionRequestId)).toMatchObject({ status: 'REQUESTED', details: first.details });
    expect(completed.requests.find((request) => request.sessionRequestId === second.sessionRequestId)).toMatchObject({ status: 'COMPLETED', details: second.details });
  });

  it('hides completed requests from the Account preview and canonical active list', async () => {
    const completed = { ...sampleRequest, status: 'COMPLETED' as const, title: 'Servicio completado' };
    const requests = [completed, { ...sampleRequest, title: 'Servicio activo' }];
    const list = await render(<SessionServiceRequestsProvider><SeedRequests requests={requests} /><SessionServiceRequestsScreen /></SessionServiceRequestsProvider>);
    await waitFor(() => expect(list.getByText('Servicio activo')).toBeTruthy());
    expect(list.queryByText('Servicio completado')).toBeNull();
    await list.unmount();

    const account = await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionServiceRequestsProvider><SeedRequests requests={requests} /><AccountStayHubScreen service={new MockStayService()} /></SessionServiceRequestsProvider></QueryClientProvider>);
    await waitFor(() => expect(account.getByText('Servicio activo')).toBeTruthy());
    expect(account.queryByText('Servicio completado')).toBeNull();
  });

  it('renders empty and complete canonical list with frontend status labels', async () => {
    const empty = await render(<SessionServiceRequestsProvider><SessionServiceRequestsScreen /></SessionServiceRequestsProvider>);
    expect(empty.getByText('No tienes servicios activos.')).toBeTruthy();

    const populated = await render(
      <SessionServiceRequestsProvider>
        <SeedRequests requests={[sampleRequest, { kind: 'HOTEL_ASSIGNED', origin: 'CHAT', status: 'ASSIGNED', title: 'Traslado al aeropuerto', summary: 'Asignado por Recepción' }]} />
        <SessionServiceRequestsScreen />
      </SessionServiceRequestsProvider>,
    );
    await waitFor(() => expect(populated.getByText('Limpieza')).toBeTruthy());
    expect(populated.getByText('Solicitado')).toBeTruthy();
    expect(populated.getByText('Traslado al aeropuerto')).toBeTruthy();
    expect(populated.getByText('Asignado por el hotel')).toBeTruthy();
  });

  it('keeps Account stay content, renders an empty preview, and limits the preview to three requests', async () => {
    const requests: AddSessionServiceRequestInput[] = [
      sampleRequest,
      { kind: 'ROOM_SERVICE', origin: 'SERVICES', status: 'REQUESTED', title: 'Room Service', summary: '2 productos · Entrega 13:45' },
      { kind: 'VEHICLE_REQUEST', origin: 'VALET', status: 'REQUESTED', title: 'Solicitud de vehículo', summary: '5 min' },
    ];
    const empty = await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionServiceRequestsProvider><AccountStayHubScreen service={new MockStayService()} /></SessionServiceRequestsProvider></QueryClientProvider>);
    await waitFor(() => expect(empty.getByText('Mi estadía')).toBeTruthy());
    expect(empty.getByText('Aún no tienes servicios solicitados.')).toBeTruthy();

    const populated = await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionServiceRequestsProvider><SeedRequests requests={requests} /><AccountStayHubScreen service={new MockStayService()} /></SessionServiceRequestsProvider></QueryClientProvider>);
    await waitFor(() => expect(populated.getByText('Room Service')).toBeTruthy());
    expect(populated.getByText('Mis servicios')).toBeTruthy();
    expect(populated.getByTestId('account-session-requests-all')).toBeTruthy();
    expect(populated.getByText('Limpieza')).toBeTruthy();
  });

  it('derives the Account preview from requests after a session-only deletion', async () => {
    const requests: AddSessionServiceRequestInput[] = [
      { ...sampleRequest, title: 'Solicitud A' },
      { ...sampleRequest, title: 'Solicitud B' },
      { ...sampleRequest, title: 'Solicitud C' },
      { ...sampleRequest, title: 'Solicitud D' },
    ];
    const rendered = await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SessionServiceRequestsProvider><SeedRequests requests={requests} /><RemoveRequestButton sessionRequestId="session-request-3" /><AccountStayHubScreen service={new MockStayService()} /></SessionServiceRequestsProvider></QueryClientProvider>);
    await waitFor(() => expect(rendered.getByText('Solicitud D')).toBeTruthy());
    expect(rendered.queryByText('Solicitud A')).toBeNull();

    await fireEvent.press(rendered.getByTestId('remove-session-request-3'));
    await waitFor(() => expect(rendered.getByText('Solicitud A')).toBeTruthy());
    expect(rendered.queryByText('Solicitud C')).toBeNull();
  });

  it('navigates from Account preview to the canonical route, keeps Servicios active, and returns to Services', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });
    const ui = await renderRouter({
      _layout: () => <QueryClientProvider client={queryClient}><SessionServiceRequestsProvider><SeedRequests requests={[sampleRequest]} /><PathProbe /><Slot /></SessionServiceRequestsProvider></QueryClientProvider>,
      account: AccountRoute,
      services: () => <Text testID="services-root">Servicios root</Text>,
      'services/requests': RequestsRoute,
    }, { initialUrl: '/account' });

    await waitFor(() => expect(ui.getByTestId('account-session-requests-all')).toBeTruthy());
    await fireEvent.press(ui.getByTestId('account-session-requests-all'));
    await waitFor(() => expect(ui.getByTestId('session-service-requests-screen')).toBeTruthy());
    expect(ui.getByTestId('pathname').props.children).toBe('/services/requests');
    expect(ui.getByRole('tab', { name: 'Servicios' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(ui.getByTestId('session-service-requests-back'));
    await waitFor(() => expect(ui.getByTestId('pathname').props.children).toBe('/services'));
    expect(ui.getByTestId('services-root')).toBeTruthy();
  });
});
