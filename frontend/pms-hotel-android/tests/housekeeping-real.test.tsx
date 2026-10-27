import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { router, usePathname } from 'expo-router';
import { GuestRouteGuard } from '@/modules/guest-auth/presentation/GuestRouteGuard';
import { ServicesScreen } from '@/modules/services/presentation/ServicesScreen';
import { MockServicesService } from '@/modules/services/data/mocks/MockServicesService';
import { FetchTransport } from '@/data/remote/http/FetchTransport';
import { HttpError, NetworkError } from '@/data/remote/http/HttpError';
import { DomainMappingError } from '@/domain/errors/DomainMappingError';
import { NativeGuestClient, nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { ActiveReservationContextProvider, useActiveReservationContext } from '@/modules/guest-auth/presentation/ActiveReservationContextProvider';
import { GuestAuthSessionProvider, useGuestAuthSession } from '@/modules/guest-auth/presentation/GuestAuthSessionProvider';
import { HttpHousekeepingService } from '@/modules/services/housekeeping/data/http/HttpHousekeepingService';
import { mapHousekeepingRequestDto } from '@/modules/services/housekeeping/data/mappers/mapHousekeepingRequestDto';
import { type HousekeepingRequestDto } from '@/modules/services/housekeeping/data/dtos/HousekeepingRequestDto';
import { HousekeepingScreen } from '@/modules/services/housekeeping/presentation/HousekeepingScreen';
import { HousekeepingRequestsSection } from '@/modules/services/housekeeping/presentation/HousekeepingRequestsSection';
import { SessionServiceRequestsProvider, useSessionServiceRequests } from '@/modules/service-requests';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';

jest.mock('@/config/environment', () => ({ environment: { useMockApi: false }, requireApiBaseUrl: () => 'https://pms.example.test' }));
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), router: { replace: jest.fn(), dismissTo: jest.fn() }, useLocalSearchParams: () => ({}), useFocusEffect: jest.fn(), usePathname: jest.fn(() => '/services/housekeeping') }));
const context = { reservationId: 'reservation-real', reservationStayId: 'stay-real' };
const input = { serviceDate: '2030-01-01', timeSlot: '10:00–11:00' as const, cleaningType: 'FULL_CLEANING' as const, notes: 'Silencio' };
const dto: HousekeepingRequestDto = { id: 'request-real', reservationId: context.reservationId, stayId: context.reservationStayId,
  ...input, notes: 'Silencio', status: 'OPEN', createdAt: '2030-01-01T08:00:00Z', updatedAt: '2030-01-01T08:00:00Z', modifiableUntil: '2030-01-01T15:35:00Z' };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function Probe() {
  const { requests } = useSessionServiceRequests();
  const { setActiveReservationContext } = useActiveReservationContext();
  const { beginSession } = useGuestAuthSession();
  return <><Text testID="local-count">{requests.length}</Text><Pressable testID="switch-stay" onPress={() => setActiveReservationContext({ reservationId: 'second', reservationStayId: 'second-stay' })}><Text>Cambiar estancia</Text></Pressable><Pressable testID="switch-account" onPress={() => beginSession({ accountId: 'second-account' })}><Text>Cambiar cuenta</Text></Pressable></>;
}
const stayService = { getCurrentStay: async () => ({ ...currentStayFixture, timezone: 'America/Guatemala', id: context.reservationStayId, reservationId: context.reservationId, arrival: '2030-01-01', departure: '2030-01-04', status: 'IN_HOUSE' }) };
async function setup(form = false, content?: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const view = await render(<QueryClientProvider client={queryClient}><GuestAuthSessionProvider initialSession={{ accountId: 'own-account' }}><ActiveReservationContextProvider initialActiveReservationContext={context}><SessionServiceRequestsProvider><GuestRouteGuard><Probe />{content}{form ? <HousekeepingScreen nowMs={() => new Date(2030, 0, 1, 8).getTime()} stayService={stayService} /> : null}<HousekeepingRequestsSection /></GuestRouteGuard></SessionServiceRequestsProvider></ActiveReservationContextProvider></GuestAuthSessionProvider></QueryClientProvider>);
  return { ...view, queryClient };
}
beforeEach(() => (usePathname as jest.Mock).mockReturnValue('/services/housekeeping'));
afterEach(() => jest.restoreAllMocks());

it('uses FetchTransport with native Guest authorization for POST and GET, without identity in the body', async () => {
  const fetch = jest.spyOn(globalThis, 'fetch');
  for (const body of [{ accessToken: 'synthetic', refreshToken: 'rotated', accessTokenExpiresInSeconds: 900 }, dto, [dto]]) fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => body } as Response);
  const client = new NativeGuestClient(new FetchTransport(), { read: async () => JSON.stringify({ backend: 'https://pms.example.test', refreshToken: 'synthetic-refresh' }), write: async () => {}, clear: async () => {} }, () => 'https://pms.example.test');
  const service = new HttpHousekeepingService(client);
  expect(mapHousekeepingRequestDto(await service.submitRequest(input, context, 'hk-stable-key-123456'), context).id).toBe(dto.id);
  expect(await service.listRequests(context)).toEqual([dto]);
  const [, request] = fetch.mock.calls[1];
  expect(request).toMatchObject({ method: 'POST', credentials: 'omit', headers: { Authorization: 'Bearer synthetic', 'Idempotency-Key': 'hk-stable-key-123456' } });
  expect(JSON.parse(request!.body as string)).toEqual(input);
  expect(fetch.mock.calls[2][0]).toContain('/reservations/reservation-real/stays/stay-real/housekeeping-requests');
});
it.each([{ ...dto, stayId: 'foreign' }, { ...dto, reservationId: 'foreign' }, { ...dto, status: 'fabricated' }, { ...dto, serviceDate: 'invalid' }, { ...dto, notes: 'x'.repeat(501) }])('rejects foreign or invalid DTO instead of rendering a local fallback', row => {
  expect(() => mapHousekeepingRequestDto(row as HousekeepingRequestDto, context)).toThrow(DomainMappingError);
});
it('shows submitting, avoids double click, refreshes persisted list and never creates a session-only copy', async () => {
  let rows: HousekeepingRequestDto[] = []; const pending = deferred<HousekeepingRequestDto>();
  const request = jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => init?.method === 'POST' ? pending.promise : rows);
  const view = await setup(true);
  await waitFor(() => expect(view.getByTestId('housekeeping-submit')).toBeTruthy());
  await fireEvent.changeText(view.getByTestId('housekeeping-notes'), 'Silencio');
  await fireEvent.press(view.getByTestId('housekeeping-submit')); await fireEvent.press(view.getByTestId('housekeeping-submit'));
  await waitFor(() => expect(view.getByText('Enviando solicitud...')).toBeTruthy());
  expect(request.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  rows = [dto]; await act(async () => pending.resolve(dto));
  await waitFor(() => expect(view.getByTestId('housekeeping-request-request-real')).toBeTruthy());
  expect(view.getByText('Solicitado')).toBeTruthy();expect(view.getByTestId('local-count')).toHaveTextContent('0');
  expect(router.replace).toHaveBeenCalledWith('/account');
});
it('keeps form on offline/rejection, reuses the intent key on manual retry and shows no false success', async () => {
  let attempts = 0;
  const request = jest.spyOn(nativeGuestClient, 'request').mockImplementation(async (_path, init) => {
    if (init?.method !== 'POST') return [];
    attempts++; if (attempts === 1) throw new NetworkError(); if (attempts === 2) throw new HttpError('Rejected', 400); return dto;
  });
  const view = await setup(true);await waitFor(() => expect(view.getByTestId('housekeeping-submit')).toBeTruthy());
  await fireEvent.changeText(view.getByTestId('housekeeping-notes'), 'Silencio');await fireEvent.press(view.getByTestId('housekeeping-submit'));
  await waitFor(() => expect(view.getByTestId('housekeeping-submit-offline')).toBeTruthy());
  await fireEvent.press(view.getByTestId('housekeeping-submit'));
  await waitFor(() => expect(view.getByTestId('housekeeping-submit-error')).toBeTruthy());
  expect(view.getByTestId('housekeeping-notes')).toHaveProp('value', 'Silencio');
  expect(view.queryByTestId('housekeeping-submit-success')).toBeNull();
  await fireEvent.press(view.getByTestId('housekeeping-submit'));
  await waitFor(() => expect(view.getByTestId('housekeeping-submit-success')).toBeTruthy());
  expect(attempts).toBe(3);
  const keys = request.mock.calls.filter(([, init]) => init?.method === 'POST').map(([, init]) => (init!.headers as Record<string, string>)['Idempotency-Key']);
  expect(new Set(keys).size).toBe(1);
});
it('does not expose an old stay or account list after context changes, including delayed responses', async () => {
  const delayed = deferred<HousekeepingRequestDto[]>();
  let count = 0; jest.spyOn(nativeGuestClient, 'request').mockImplementation(async () => ++count === 1 ? delayed.promise : []);
  const view = await setup();expect(view.getByTestId('housekeeping-requests-loading')).toBeTruthy();
  await fireEvent.press(view.getByTestId('switch-stay'));await act(async () => delayed.resolve([dto]));
  await waitFor(() => expect(view.getByText('Sin solicitudes de limpieza.')).toBeTruthy());
  expect(view.queryByTestId('housekeeping-request-request-real')).toBeNull();
  await fireEvent.press(view.getByTestId('switch-account'));
  await waitFor(() => expect(view.queryClient.getQueryCache().find({ queryKey: ['guest-housekeeping', 'second-account', 'second', 'second-stay'] })?.state.status).toBe('success'));
  expect(view.queryByTestId('housekeeping-request-request-real')).toBeNull();
});
it('shows every persisted status with real OPEN actions and no Guest completion control', async () => {
  jest.spyOn(nativeGuestClient, 'request').mockResolvedValue((['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const).map(status => ({ ...dto, id: status, status })));
  const view = await setup();
  for (const label of ['Solicitado', 'En proceso', 'Completado', 'Cancelado']) await waitFor(() => expect(view.getByText(label)).toBeTruthy());
  expect(view.getByTestId('housekeeping-edit-OPEN').props.accessibilityState.disabled).toBe(false);
  expect(view.getByTestId('housekeeping-edit-IN_PROGRESS').props.accessibilityState.disabled).toBe(true);
  expect(view.getByTestId('housekeeping-edit-DONE').props.accessibilityState.disabled).toBe(true);
  expect(view.getByTestId('housekeeping-edit-CANCELLED').props.accessibilityState.disabled).toBe(true);
  expect(view.queryByLabelText(/Marcar.*completado/)).toBeNull();
});
it('shows list errors without presenting mock data', async () => {
  jest.spyOn(nativeGuestClient, 'request').mockRejectedValue(new NetworkError());
  const view = await setup();await waitFor(() => expect(view.getByTestId('housekeeping-requests-error')).toBeTruthy());
  expect(view.getByText(/Sin conexión/)).toBeTruthy();expect(view.queryByTestId('housekeeping-request-request-real')).toBeNull();
});

it.each(['/services', '/services/housekeeping', '/services/requests'])('allows the real %s journey through the existing route guard', async path => {
  (usePathname as jest.Mock).mockReturnValue(path);jest.spyOn(nativeGuestClient, 'request').mockResolvedValue([]);
  const view = await setup();await waitFor(() => expect(view.getByTestId('housekeeping-requests-real')).toBeTruthy());
});
it('keeps other service routes blocked in real mode', async () => {
  (usePathname as jest.Mock).mockReturnValue('/services/room-service');
  const view = await setup();expect(view.getByTestId('guest-real-feature-unavailable')).toBeTruthy();
});
it('shows only existing real launchers and never loads the mock paid catalogue', async () => {
  const catalogue = jest.spyOn(MockServicesService.prototype, 'getCatalog');jest.spyOn(nativeGuestClient, 'request').mockResolvedValue([]);
  const view = await setup(false, <ServicesScreen stayService={stayService} />);
  await waitFor(() => expect(view.getByTestId('services-housekeeping-launcher').props.accessibilityState.disabled).toBe(false));
  await waitFor(() => expect(view.getByTestId('housekeeping-requests-real')).toBeTruthy());
  expect(view.getByTestId('services-requests-launcher')).toBeTruthy();expect(view.queryByTestId('services-room-service-launcher')).toBeNull();
  expect(catalogue).not.toHaveBeenCalled();
});
