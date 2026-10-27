import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { AppState, PanResponder, Text, type GestureResponderEvent, type PanResponderGestureState } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FetchTransport } from '@/data/remote/http/FetchTransport';
import { HttpError, NetworkError } from '@/data/remote/http/HttpError';
import { NativeGuestClient, nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { ActiveReservationContextProvider } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { GuestAuthSessionProvider } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { HttpHousekeepingService } from '@/modules/services/housekeeping/data/http/HttpHousekeepingService';
import { type HousekeepingRequestDto } from '@/modules/services/housekeeping/data/dtos/HousekeepingRequestDto';
import { HousekeepingScreen } from '@/modules/services/housekeeping/presentation/HousekeepingScreen';
import { SessionServiceRequestsProvider, useSessionServiceRequests } from '@/modules/service-requests';
import { SessionServiceRequestsScreen } from '@/modules/service-requests/presentation/SessionServiceRequestsScreen';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';

jest.mock('@/config/environment', () => ({ environment: { useMockApi: false }, requireApiBaseUrl: () => 'https://pms.example.test' }));
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), router: { replace: jest.fn(), dismissTo: jest.fn(), push: jest.fn() }, useLocalSearchParams: jest.fn(() => ({})), useFocusEffect: jest.fn(), usePathname: () => '/services/requests' }));
const context = { reservationId: 'reservation-real', reservationStayId: 'stay-real' };
const dto: HousekeepingRequestDto = { id: 'request-real', reservationId: context.reservationId, stayId: context.reservationStayId, serviceDate: '2030-01-01', timeSlot: '10:00–11:00', cleaningType: 'FULL_CLEANING', notes: 'Notas originales', status: 'OPEN', createdAt: '2030-01-01T08:00:00Z', updatedAt: '2030-01-01T08:00:00Z', modifiableUntil: '2030-01-01T15:35:00Z' };
const stayService = { getCurrentStay: async () => ({ ...currentStayFixture, timezone: 'America/Guatemala', id: context.reservationStayId, reservationId: context.reservationId, arrival: '2030-01-01', departure: '2030-01-04', status: 'IN_HOUSE' }) };
function Probe() { const { requests } = useSessionServiceRequests();return <Text testID="local-count">{requests.length}</Text>; }
async function setup(edit = false, nowMs = () => new Date(2030, 0, 1, 8).getTime()) {
  (useLocalSearchParams as jest.Mock).mockReturnValue(edit ? { editRequestId: dto.id } : {});
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={queryClient}><GuestAuthSessionProvider initialSession={{ accountId: 'own-account' }}><ActiveReservationContextProvider initialActiveReservationContext={context}><SessionServiceRequestsProvider><Probe />{edit ? <HousekeepingScreen nowMs={nowMs} stayService={stayService} /> : <SessionServiceRequestsScreen stayService={stayService} nowMs={nowMs} />}</SessionServiceRequestsProvider></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>);
  return { ...view, queryClient };
}
const originalAppState = AppState.currentState;
beforeEach(() => { AppState.currentState = 'active';jest.clearAllMocks();(useLocalSearchParams as jest.Mock).mockReturnValue({}); });
afterEach(() => { AppState.currentState = originalAppState;jest.restoreAllMocks(); });
async function revealCancellation(view: Awaited<ReturnType<typeof setup>>, create: jest.SpyInstance) {
  await waitFor(() => expect(view.getByTestId('housekeeping-swipe-request-real')).toBeTruthy());
  await act(async () => { const config = create.mock.calls.at(-1)![0] as Parameters<typeof PanResponder.create>[0];config.onPanResponderRelease?.({} as GestureResponderEvent, { dx: -1000 } as PanResponderGestureState); });
  await fireEvent.press(view.getByLabelText('Cancelar solicitud'));
  await waitFor(() => expect(view.getByTestId('housekeeping-cancel-confirmation')).toBeTruthy());
}
it('sends authenticated native PUT/cancel with the existing timestamp and no forged identity', async () => {
  const fetch = jest.spyOn(globalThis, 'fetch');const tokens = { accessToken: 'synthetic', refreshToken: 'rotated', accessTokenExpiresInSeconds: 900 };
  for (const body of [tokens, dto, { ...dto, status: 'CANCELLED' }]) fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body } as Response);
  const client = new NativeGuestClient(new FetchTransport(), { read: async () => JSON.stringify({ backend: 'https://pms.example.test', refreshToken: 'synthetic-refresh' }), write: async () => {}, clear: async () => {} }, () => 'https://pms.example.test');
  const service = new HttpHousekeepingService(client);
  await service.updateRequest({ serviceDate: dto.serviceDate, timeSlot: '10:00–11:00', cleaningType: 'FULL_CLEANING', notes: '  Nuevo  ' }, context, dto.id, dto.updatedAt);
  await service.cancelRequest(context, dto.id, dto.updatedAt);
  expect(fetch.mock.calls[1][1]).toMatchObject({ method: 'PUT', credentials: 'omit', headers: { Authorization: 'Bearer synthetic' } });
  expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual({ serviceDate: dto.serviceDate, timeSlot: dto.timeSlot, cleaningType: dto.cleaningType, notes: 'Nuevo', expectedUpdatedAt: dto.updatedAt });
  expect(String(fetch.mock.calls[2][0])).toContain(`/housekeeping-requests/${dto.id}/cancel`);
  expect(JSON.parse(fetch.mock.calls[2][1]!.body as string)).toEqual({ expectedUpdatedAt: dto.updatedAt });
});
it('uses swipe/confirmation, soft cancellation and persisted filters without creating a local copy', async () => {
  const pan = jest.spyOn(PanResponder, 'create');let rows = [dto];
  const request = jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => {
    if (init?.method === 'POST') { rows = [{ ...dto, status: 'CANCELLED', updatedAt: '2030-01-01T08:01:00Z' }];return rows[0]; }return rows;
  });
  const view = await setup();await revealCancellation(view, pan);
  expect(request.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(0);
  await fireEvent.press(view.getByTestId('housekeeping-cancel-confirmation-confirm'));
  await waitFor(() => expect(view.queryByTestId('housekeeping-request-request-real')).toBeNull());
  await fireEvent.press(view.getByTestId('session-service-request-filter-ALL'));
  await waitFor(() => expect(view.getByText('Cancelado')).toBeTruthy());
  expect(view.getByTestId('local-count')).toHaveTextContent('0');expect(request.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
});
it('keeps confirmation and request after offline cancellation and permits a real retry', async () => {
  const pan = jest.spyOn(PanResponder, 'create');let attempts = 0;let rows = [dto];
  jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => {
    if (init?.method !== 'POST') return rows;
    if (++attempts === 1) throw new NetworkError();rows = [{ ...dto, status: 'CANCELLED' }];return rows[0];
  });
  const view = await setup();await revealCancellation(view, pan);await fireEvent.press(view.getByTestId('housekeeping-cancel-confirmation-confirm'));
  await waitFor(() => expect(view.getByText('Sin conexión. Conéctate y reintenta.')).toBeTruthy());
  expect(view.getByTestId('housekeeping-request-request-real')).toBeTruthy();
  await fireEvent.press(view.getByTestId('housekeeping-cancel-confirmation-confirm'));
  await waitFor(() => expect(view.queryByTestId('housekeeping-request-request-real')).toBeNull());expect(attempts).toBe(2);
});
it('preloads the real existing form and saves the same id with no POST or local request', async () => {
  let rows = [dto];const request = jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') { const body = JSON.parse(init.body as string);rows = [{ ...dto, notes: body.notes, updatedAt: '2030-01-01T08:01:00Z' }];return rows[0]; }return rows;
  });
  const view = await setup(true);await waitFor(() => expect(view.getByTestId('housekeeping-notes')).toHaveProp('value', 'Notas originales'));
  await fireEvent.changeText(view.getByTestId('housekeeping-notes'), '  Cambios reales  ');await fireEvent.press(view.getByText('Guardar cambios'));
  await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/account'));
  const writes = request.mock.calls.filter(([, init]) => init?.method === 'PUT');expect(writes).toHaveLength(1);
  expect(writes[0][0]).toContain(`/housekeeping-requests/${dto.id}`);expect(JSON.parse(writes[0][1]!.body as string)).toMatchObject({ expectedUpdatedAt: dto.updatedAt, notes: 'Cambios reales' });
  expect(request.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);expect(view.getByTestId('local-count')).toHaveTextContent('0');
});
it('keeps the draft on offline save and retries with the original version', async () => {
  let attempts = 0;const request = jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => {
    if (init?.method !== 'PUT') return [dto];if (++attempts === 1) throw new NetworkError();return { ...dto, notes: 'Borrador' };
  });
  const view = await setup(true);await waitFor(() => expect(view.getByTestId('housekeeping-notes')).toBeTruthy());
  await fireEvent.changeText(view.getByTestId('housekeeping-notes'), 'Borrador');await fireEvent.press(view.getByText('Guardar cambios'));
  await waitFor(() => expect(view.getByTestId('housekeeping-submit-offline')).toBeTruthy());expect(view.getByTestId('housekeeping-notes')).toHaveProp('value', 'Borrador');
  await fireEvent.press(view.getByText('Guardar cambios'));await waitFor(() => expect(attempts).toBe(2));
  expect(request.mock.calls.filter(([, init]) => init?.method === 'PUT').every(([, init]) => JSON.parse(init!.body as string).expectedUpdatedAt === dto.updatedAt)).toBe(true);
});
it('blocks editing after a concurrent Staff transition instead of displaying false success', async () => {
  let rows = [dto];jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') { rows = [{ ...dto, status: 'IN_PROGRESS' }];throw new HttpError('Changed', 409); }return rows;
  });
  const view = await setup(true);await waitFor(() => expect(view.getByTestId('housekeeping-notes')).toBeTruthy());await fireEvent.changeText(view.getByTestId('housekeeping-notes'), 'Otro');await fireEvent.press(view.getByText('Guardar cambios'));
  await waitFor(() => expect(view.getByText('Esta solicitud ya no admite cambios')).toBeTruthy());expect(view.queryByTestId('housekeeping-submit-success')).toBeNull();
});
it('allows unchanged-schedule notes at 28 minutes using the server cutoff rather than the phone timezone', async () => {
  jest.spyOn(nativeGuestClient, 'request').mockResolvedValue([dto]);
  const view = await setup(true, () => Date.parse('2030-01-01T15:32:00Z'));await waitFor(() => expect(view.getByText('Guardar cambios')).toBeTruthy());
  expect(view.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(false);
});
it('reads a Staff-completed state on focus and retains it in completed history', async () => {
  let rows = [dto];jest.spyOn(nativeGuestClient, 'request').mockImplementation(async () => rows);
  const view = await setup();await waitFor(() => expect(view.getByText('Solicitado')).toBeTruthy());
  rows = [{ ...dto, status: 'DONE' }];await act(async () => { (useFocusEffect as jest.Mock).mock.calls.at(-1)![0](); });
  await waitFor(() => expect(view.queryByTestId('housekeeping-request-request-real')).toBeNull());
  await fireEvent.press(view.getByTestId('session-service-request-filter-COMPLETED'));await waitFor(() => expect(view.getByText('Completado')).toBeTruthy());
  expect(view.queryByLabelText(/Marcar.*completado/)).toBeNull();
});
