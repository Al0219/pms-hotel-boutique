import { createContext, type EffectCallback } from 'react';
import { AppState, type AppStateStatus, Text } from 'react-native';
import { QueryClient, QueryClientProvider, notifyManager, defaultScheduler } from '@tanstack/react-query';
import { act, fireEvent, render, within } from '@testing-library/react-native';
import { environment } from '@/config/environment';
import { NetworkError } from '@/data/remote/http/HttpError';
import { nativeGuestClient } from '@/modules/guest-auth/data/http/NativeGuestClient';
import { useHousekeepingRequests } from '@/modules/services/housekeeping/presentation/hooks/useHousekeepingRequests';
import { HousekeepingRequestsSection } from '@/modules/services/housekeeping/presentation/HousekeepingRequestsSection';
import type { HousekeepingRequestDto } from '@/modules/services/housekeeping/data/dtos/HousekeepingRequestDto';

const mockFocus = createContext(true);
let mockSession: { accountId: string } | null = { accountId: 'guest-one' };
let mockContext: { reservationId: string; reservationStayId: string } | null = { reservationId: 'reservation-one', reservationStayId: 'stay-one' };
let mockExpired = false;
jest.mock('@/config/environment', () => ({ environment: { useMockApi: false }, requireApiBaseUrl: () => 'https://pms.example.test' }));
jest.mock('@/modules/guest-auth/presentation/GuestAuthSessionProvider', () => ({ useGuestAuthSession: () => ({ session: mockSession, sessionExpired: mockExpired }) }));
jest.mock('@/modules/guest-auth/presentation/ActiveReservationContextProvider', () => ({ useActiveReservationContext: () => ({ activeReservationContext: mockContext }) }));
jest.mock('expo-router', () => ({ ...jest.requireActual('expo-router'), router: { push: jest.fn() },
  useFocusEffect: function useTestFocusEffect(callback: EffectCallback) {
    const React = jest.requireActual<typeof import('react')>('react');
    const focused = React.useContext(mockFocus);
    React.useEffect(() => focused ? callback() : undefined, [callback, focused]);
  },
}));
const dto: HousekeepingRequestDto = { id: 'request-one', reservationId: 'reservation-one', stayId: 'stay-one', serviceDate: '2030-01-02', timeSlot: '10:00–11:00', cleaningType: 'FULL_CLEANING', notes: null, status: 'OPEN', createdAt: '2030-01-01T00:00:00Z', updatedAt: '2030-01-01T00:00:00Z', modifiableUntil: '2030-01-02T15:35:00Z' };
const originalAppState = AppState.currentState;
const listeners = new Set<(state: AppStateStatus) => void>();
let client: QueryClient;
let request: jest.SpyInstance;
let rows: HousekeepingRequestDto[];
async function flush(ms = 0) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}
async function appState(state: AppStateStatus) {
  await act(async () => { AppState.currentState = state;listeners.forEach(listener => listener(state)); });
  await flush();
}
function Probe({ name = 'probe' }: { name?: string }) {
  const query = useHousekeepingRequests();
  return <Text testID={name}>{query.data?.map(row => `${row.id}:${row.status}`).join(',') ?? 'empty'}{query.isError ? ':error' : ''}</Text>;
}
function tree(content: React.ReactNode, focused = true) {
  return <QueryClientProvider client={client}><mockFocus.Provider value={focused}>{content}</mockFocus.Provider></QueryClientProvider>;
}
beforeEach(() => {
  jest.useFakeTimers();
  notifyManager.setScheduler(callback => callback());
  AppState.currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.add(listener);
    return { remove: jest.fn(() => listeners.delete(listener)) };
  });
  mockSession = { accountId: 'guest-one' };mockContext = { reservationId: 'reservation-one', reservationStayId: 'stay-one' };mockExpired = false;
  (environment as { useMockApi: boolean }).useMockApi = false;
  rows = [dto];client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } } });
  request = jest.spyOn(nativeGuestClient, 'request').mockImplementation(async () => rows);
});
afterEach(async () => { client?.clear();listeners.clear();jest.restoreAllMocks();AppState.currentState = originalAppState;notifyManager.setScheduler(defaultScheduler);jest.useRealTimers(); });

it('automatically moves OPEN→IN_PROGRESS→DONE and stops after the persisted terminal state', async () => {
  const ui = await render(tree(<Probe />));await flush();expect(request).toHaveBeenCalledTimes(1);
  rows = [{ ...dto, status: 'IN_PROGRESS' }];await flush(9_999);expect(request).toHaveBeenCalledTimes(1);
  await flush(1);expect(ui.getByTestId('probe')).toHaveTextContent(/IN_PROGRESS/);expect(request).toHaveBeenCalledTimes(2);
  rows = [{ ...dto, status: 'DONE' }];await flush(10_000);expect(ui.getByTestId('probe')).toHaveTextContent(/DONE/);
  await flush(60_000);expect(request).toHaveBeenCalledTimes(3);await ui.unmount();
});
it('updates existing Active/Completed/All cards without loaders, edits or cancellation after Staff completes', async () => {
  const ui = await render(tree(<><Text>Sections</Text><HousekeepingRequestsSection filter="ACTIVE" /><HousekeepingRequestsSection filter="COMPLETED" /><HousekeepingRequestsSection filter="ALL" /></>));await flush();
  expect(ui.getAllByText('Solicitado')).toHaveLength(2);
  rows = [{ ...dto, status: 'IN_PROGRESS' }];await flush(10_000);expect(ui.getAllByText('En proceso')).toHaveLength(2);
  expect(ui.queryByTestId('housekeeping-requests-loading')).toBeNull();expect(ui.queryByLabelText('Editar solicitud de limpieza')).toBeNull();
  rows = [{ ...dto, status: 'DONE' }];await flush(10_000);
  expect(ui.getAllByText('Completado')).toHaveLength(2);expect(ui.getAllByText('Sin solicitudes de limpieza.')).toHaveLength(1);
  expect(ui.queryByLabelText('Cancelar solicitud')).toBeNull();expect(ui.queryByLabelText('Editar solicitud de limpieza')).toBeNull();
  const all = ui.getAllByTestId('housekeeping-requests-real')[2];expect(within(all).getByText('Completado')).toBeTruthy();await ui.unmount();
});
it('pauses in background/inactive and refreshes immediately on foreground even when all known rows are terminal', async () => {
  const ui=await render(tree(<Probe />));await flush();await appState('background');rows=[{...dto,status:'DONE'}];
  await flush(60_000);expect(request).toHaveBeenCalledTimes(1);
  await appState('active');expect(request).toHaveBeenCalledTimes(2);expect(ui.getByTestId('probe')).toHaveTextContent(/DONE/);
  await appState('inactive');await flush(30_000);await appState('active');expect(request).toHaveBeenCalledTimes(3);await ui.unmount();
});
it('stops on blur, never resumes while unfocused, and reads immediately when focused again', async () => {
  const ui=await render(tree(<Probe />));await flush();await ui.rerender(tree(<Probe />,false));await flush(60_000);expect(request).toHaveBeenCalledTimes(1);
  await appState('background');await appState('active');expect(request).toHaveBeenCalledTimes(1);
  rows=[{...dto,status:'IN_PROGRESS'}];await ui.rerender(tree(<Probe />,true));await flush();expect(request).toHaveBeenCalledTimes(2);expect(ui.getByTestId('probe')).toHaveTextContent(/IN_PROGRESS/);await ui.unmount();
});
it('shares one polling cadence between observers even when the second mounts between ticks', async () => {
  const ui=await render(tree(<Probe name="account" />));await flush();await flush(3_000);
  await ui.rerender(tree(<><Probe name="account" /><Probe name="services" /></>));await flush();
  const before=request.mock.calls.length;
  await flush(9_999);expect(request).toHaveBeenCalledTimes(before);await flush(1);expect(request).toHaveBeenCalledTimes(before+1);
  rows=[{...dto,status:'IN_PROGRESS'}];await flush(10_000);expect(request).toHaveBeenCalledTimes(before+2);
  expect(ui.getByTestId('account')).toHaveTextContent(/IN_PROGRESS/);expect(ui.getByTestId('services')).toHaveTextContent(/IN_PROGRESS/);await ui.unmount();
});
it.each([{ saved: [] }, { saved: [{ ...dto,status:'DONE' as const }] }, { saved: [{...dto,status:'CANCELLED' as const}] }])('does not poll an empty or terminal list', async ({saved}) => {
  rows=saved;const ui=await render(tree(<Probe />));await flush();await flush(60_000);expect(request).toHaveBeenCalledTimes(1);await ui.unmount();
});
it('does not fetch or install listeners in mock mode', async () => {
  (environment as { useMockApi: boolean }).useMockApi=true;const ui=await render(tree(<Probe />));await flush(60_000);
  expect(request).not.toHaveBeenCalled();expect(listeners.size).toBe(0);await ui.unmount();
});
it('stops for logout/expired sessions and isolates a new stay/account query using the existing scoped key', async () => {
  const ui=await render(tree(<Probe />));await flush();mockSession=null;await ui.rerender(tree(<Probe />));await flush(30_000);expect(request).toHaveBeenCalledTimes(1);
  mockSession={accountId:'guest-two'};mockContext={reservationId:'other',reservationStayId:'other-stay'};rows=[{...dto,id:'other-request',reservationId:'other',stayId:'other-stay'}];
  await ui.rerender(tree(<Probe />));await flush();expect(ui.getByTestId('probe')).toHaveTextContent('other-request:OPEN');
  expect(ui.getByTestId('probe')).not.toHaveTextContent('request-one');
  expect(client.getQueryData(['guest-housekeeping','guest-two','other','other-stay'])).toEqual(rows);
  mockExpired=true;await ui.rerender(tree(<Probe />));await flush(30_000);expect(request).toHaveBeenCalledTimes(2);await ui.unmount();
});
it('retains real cached data on network errors and retries only on the normal10s cadence', async () => {
  const ui=await render(tree(<Probe />));await flush();request.mockRejectedValue(new NetworkError());await flush(10_000);
  expect(request).toHaveBeenCalledTimes(2);expect(ui.getByTestId('probe')).toHaveTextContent(/OPEN:error/);
  await flush(9_999);expect(request).toHaveBeenCalledTimes(2);rows=[{...dto,status:'IN_PROGRESS'}];request.mockImplementation(async()=>rows);await flush(1);
  expect(request).toHaveBeenCalledTimes(3);expect(ui.getByTestId('probe')).toHaveTextContent(/IN_PROGRESS/);await ui.unmount();
});
it('keeps manual refresh and cleans listeners/timers on unmount', async () => {
  const ui=await render(tree(<HousekeepingRequestsSection />));await flush();expect(listeners.size).toBe(1);
  rows=[{...dto,status:'IN_PROGRESS'}];await fireEvent.press(ui.getByTestId('housekeeping-requests-refresh'));await flush();expect(ui.getByText('En proceso')).toBeTruthy();
  const before=request.mock.calls.length;await ui.unmount();await flush(60_000);expect(request).toHaveBeenCalledTimes(before);expect(listeners.size).toBe(0);expect(jest.getTimerCount()).toBe(0);
});

it('does not show a late polling response from the previous stay or keep polling that stay', async () => {
 const ui=await render(tree(<Probe />));await flush();
 let resolve!: (value: HousekeepingRequestDto[]) => void;
 const pending=new Promise<HousekeepingRequestDto[]>(done => { resolve=done; });request.mockImplementationOnce(()=>pending);
 await flush(10_000);expect(request).toHaveBeenCalledTimes(2);
 mockContext={reservationId:'new-reservation',reservationStayId:'new-stay'};rows=[{...dto,id:'new-request',reservationId:'new-reservation',stayId:'new-stay'}];
 await ui.rerender(tree(<Probe />));await flush();expect(ui.getByTestId('probe')).toHaveTextContent('new-request:OPEN');
 await act(async()=>resolve([{...dto,status:'DONE'}]));await flush();expect(ui.getByTestId('probe')).not.toHaveTextContent(/DONE/);
 await flush(10_000);expect(request).toHaveBeenCalledTimes(4);
 expect(request.mock.calls.at(-1)![0]).toContain('/new-reservation/stays/new-stay/');await ui.unmount();
});
