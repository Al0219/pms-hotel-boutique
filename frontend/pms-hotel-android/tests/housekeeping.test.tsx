import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { router, Slot, usePathname } from 'expo-router';
import { Text } from 'react-native';
import { renderRouter } from 'expo-router/testing-library';

import HousekeepingRoute from '../app/(guest)/services/housekeeping';
import ServicesRoute from '../app/(guest)/services';
import { NetworkError } from '@/data/remote/http/HttpError';
import { HousekeepingScreen, MockHousekeepingService, type HousekeepingRequest } from '@/modules/services/housekeeping';
import { MockStayService, type StayService } from '@/modules/stay';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';
import { currentStayQueryKey } from '@/modules/stay/presentation/hooks/useCurrentStay';
import { SessionServiceRequestsProvider, useSessionServiceRequests } from '@/modules/service-requests';

function RequestProbe() {
  const { requests } = useSessionServiceRequests();
  return <Text testID="session-service-requests-probe">{JSON.stringify(requests)}</Text>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function PathProbe() {
  return <Text testID="pathname">{usePathname()}</Text>;
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { gcTime: 0, retry: false } } });
}

const morningNowMs = new Date(2026, 8, 11, 8, 0, 0).getTime();

async function setup(service = new MockHousekeepingService(), stayService: StayService = new MockStayService(), nowMs: () => number = () => morningNowMs) {
  const queryClient = client();
  const ui = await render(
    <QueryClientProvider client={queryClient}><SessionServiceRequestsProvider><RequestProbe /><HousekeepingScreen nowMs={nowMs} service={service} stayService={stayService} /></SessionServiceRequestsProvider></QueryClientProvider>,
  );
  return { ui, queryClient };
}

const expectedInput: HousekeepingRequest = {
  serviceDate: '2026-09-11', timeSlot: '09:00–10:00', cleaningType: 'FULL_CLEANING',
};

async function ready(ui: Awaited<ReturnType<typeof render>>) {
  await waitFor(() => expect(ui.getByTestId('housekeeping-submit')).toBeTruthy());
}

describe('Housekeeping — IMP-AND-0110', () => {
  it('renders the existing stay, assigned room, confirmed defaults and multiline notes', async () => {
    const { ui, queryClient } = await setup();
    await ready(ui);
    expect(ui.getByText('Habitación 204')).toBeTruthy();
    expect(queryClient.getQueryData(currentStayQueryKey)).toEqual(expect.objectContaining({ id: currentStayFixture.id }));
    expect(ui.getByText('09:00–10:00')).toBeTruthy();
    expect(ui.getByText('Limpieza completa')).toBeTruthy();
    expect(ui.getByTestId('housekeeping-notes').props.multiline).toBe(true);
    expect(ui.getByTestId('housekeeping-notes').props.maxLength).toBe(500);
    await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
    expect(ui.getByTestId('housekeeping-time-picker-wheel')).toBeTruthy();
    expect(ui.getByTestId('housekeeping-time-picker-options').props.snapToInterval).toBe(48);
    for (const slot of ['09:00–10:00', '10:00–11:00', '11:00–12:00', '14:00–15:00']) {
      expect(ui.getByTestId(`housekeeping-time-picker-option-${slot}`)).toBeTruthy();
    }
    await fireEvent.press(ui.getByTestId('housekeeping-time-picker-cancel'));
  });

  it('keeps wheel changes temporary until Accept and preserves the field on Cancel', async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
    await fireEvent(ui.getByTestId('housekeeping-time-picker-options'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 96 } },
    });
    expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('09:00–10:00')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('housekeeping-time-picker-cancel'));
    expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('09:00–10:00')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
    await fireEvent(ui.getByTestId('housekeeping-time-picker-options'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { y: 96 } },
    });
    await fireEvent.press(ui.getByTestId('housekeeping-time-picker-confirm'));
    expect(within(ui.getByTestId('housekeeping-time-selector')).getByText('11:00–12:00')).toBeTruthy();
  });

  it('uses injected nowMs to disable slots inside thirty minutes and blocks a stale selection before submit', async () => {
    let now = new Date(2026, 8, 11, 9, 40, 0).getTime();
    const submitRequest = jest.fn<Promise<void>, [HousekeepingRequest]>(async () => undefined);
    const { ui } = await setup(new MockHousekeepingService({ submitRequest }), new MockStayService(), () => now);
    await ready(ui);
    expect(ui.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
    expect(ui.getByTestId('housekeeping-time-picker-option-09:00–10:00').props.accessibilityState.disabled).toBe(true);
    expect(ui.getByTestId('housekeeping-time-picker-option-10:00–11:00').props.accessibilityState.disabled).toBe(true);
    expect(ui.getByTestId('housekeeping-time-picker-option-11:00–12:00').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(ui.getByTestId('housekeeping-time-picker-option-11:00–12:00'));
    await fireEvent.press(ui.getByTestId('housekeeping-time-picker-confirm'));
    expect(ui.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(false);
    now = new Date(2026, 8, 11, 10, 31, 0).getTime();
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    expect(submitRequest).not.toHaveBeenCalled();
    expect(ui.getByTestId('housekeeping-schedule-error')).toBeTruthy();
  });

  it('disables checkout-day slots that cannot finish by the normal checkout policy', async () => {
    const { ui } = await setup(undefined, new MockStayService({ kind: 'success', dto: { ...currentStayFixture, departure: '2026-09-18' } }), () => new Date(2026, 8, 18, 11, 31).getTime());
    await ready(ui);
    await waitFor(() => expect(ui.getByTestId('housekeeping-no-availability')).toBeTruthy());
    expect(ui.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(ui.getByTestId('housekeeping-time-selector'));
    expect(ui.getByTestId('housekeeping-time-picker-option-11:00–12:00').props.accessibilityState.disabled).toBe(true);
    expect(ui.getByTestId('housekeeping-time-picker-option-14:00–15:00').props.accessibilityState.disabled).toBe(true);
  });

  it('selects a temporary QA cleaning type and sends it in the frontend request', async () => {
    const submitRequest = jest.fn<Promise<void>, [HousekeepingRequest]>(async () => undefined);
    const { ui } = await setup(new MockHousekeepingService({ submitRequest }));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('housekeeping-type-selector'));
    for (const type of ['FULL_CLEANING', 'LIGHT_CLEANING', 'TOWELS_AND_AMENITIES']) {
      expect(ui.getByTestId(`housekeeping-type-option-${type}`)).toBeTruthy();
    }
    await fireEvent.press(ui.getByTestId('housekeeping-type-option-LIGHT_CLEANING'));
    expect(ui.getByTestId('housekeeping-type-option-LIGHT_CLEANING').props.accessibilityState.selected).toBe(true);
    expect(within(ui.getByTestId('housekeeping-type-selector')).getByText('Limpieza completa')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('housekeeping-type-confirm'));
    expect(within(ui.getByTestId('housekeeping-type-selector')).getByText('Limpieza ligera')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    await waitFor(() => expect(submitRequest).toHaveBeenCalledWith({
      serviceDate: '2026-09-11', timeSlot: '09:00–10:00', cleaningType: 'LIGHT_CLEANING',
    }));
    await waitFor(() => expect(ui.getByTestId('housekeeping-submit-success')).toBeTruthy());
  });

  it('shows exactly Habitación por asignar for room null', async () => {
    const { ui } = await setup(undefined, new MockStayService({ kind: 'success', dto: { ...currentStayFixture, room: null } }));
    await ready(ui);
    expect(ui.getByText('Habitación por asignar')).toBeTruthy();
    expect(ui.queryByText('Habitación 204')).toBeNull();
  });

  it.each(['', '   \n  '])('omits empty/whitespace notes from the boundary payload (%j)', async (notes) => {
    const submitRequest = jest.fn<Promise<void>, [HousekeepingRequest]>(async () => undefined);
    const { ui } = await setup(new MockHousekeepingService({ submitRequest }));
    await ready(ui);
    await fireEvent.changeText(ui.getByTestId('housekeeping-notes'), notes);
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    await waitFor(() => expect(submitRequest).toHaveBeenCalledWith(expectedInput));
    expect(submitRequest.mock.calls[0][0]).not.toHaveProperty('notes');
    await waitFor(() => expect(ui.getByTestId('housekeeping-submit-success')).toBeTruthy());
  });

  it('trims notes without sending IDs when Stay and Reservation fixture identifiers change', async () => {
    const submitRequest = jest.fn<Promise<void>, [HousekeepingRequest]>(async () => undefined);
    const { ui } = await setup(new MockHousekeepingService({ submitRequest }), new MockStayService({
      kind: 'success', dto: {
        ...currentStayFixture,
        id: 'another-stay-fixture',
        reservationId: 'another-reservation-fixture',
      },
    }));
    await ready(ui);
    await fireEvent.changeText(ui.getByTestId('housekeeping-notes'), '  Primera línea\nSegunda línea  ');
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    await waitFor(() => expect(submitRequest).toHaveBeenCalledWith({
      ...expectedInput, notes: 'Primera línea\nSegunda línea',
    }));
    expect(submitRequest.mock.calls[0][0]).not.toHaveProperty('id');
    expect(submitRequest.mock.calls[0][0]).not.toHaveProperty('currentStayFixtureKey');
    expect(submitRequest.mock.calls[0][0]).not.toHaveProperty('stayId');
    expect(submitRequest.mock.calls[0][0]).not.toHaveProperty('reservationId');
    expect(submitRequest.mock.calls[0][0]).not.toHaveProperty('roomId');
    await waitFor(() => expect(ui.getByTestId('housekeeping-submit-success')).toBeTruthy());
  });

  it('blocks rapid and pending double presses and shows success only after resolution', async () => {
    const pending = deferred<void>();
    const submitRequest = jest.fn(() => pending.promise);
    const { ui } = await setup(new MockHousekeepingService({ submitRequest }));
    await ready(ui);
    const button = ui.getByTestId('housekeeping-submit');
    await fireEvent.press(button);
    await fireEvent.press(button);
    await waitFor(() => expect(ui.getByText('Enviando solicitud...')).toBeTruthy());
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    expect(ui.getByTestId('housekeeping-submit').props.accessibilityState.disabled).toBe(true);
    expect(ui.getByTestId('housekeeping-notes').props.editable).toBe(false);
    expect(ui.getByTestId('housekeeping-type-selector').props.accessibilityState.disabled).toBe(true);
    expect(submitRequest).toHaveBeenCalledTimes(1);
    expect(ui.queryByTestId('housekeeping-submit-success')).toBeNull();
    expect(ui.getByTestId('session-service-requests-probe').props.children).toBe('[]');
    await act(async () => pending.resolve());
    await waitFor(() => expect(ui.getByText('Limpieza solicitada')).toBeTruthy());
    expect(ui.queryByTestId('housekeeping-submit')).toBeNull();
    expect(JSON.parse(ui.getByTestId('session-service-requests-probe').props.children)).toEqual([
      expect.objectContaining({ kind: 'HOUSEKEEPING', origin: 'SERVICES', status: 'REQUESTED', title: 'Limpieza', summary: '11 sept 2026 · 09:00–10:00' }),
    ]);
  });

  it.each([
    ['error', new Error('technical failure')], ['offline', new NetworkError()],
  ] as const)('preserves form on submit %s and manually retries the same payload', async (kind, error) => {
    const submitRequest = jest.fn<Promise<void>, [HousekeepingRequest]>()
      .mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
    const { ui } = await setup(new MockHousekeepingService({ submitRequest }));
    await ready(ui);
    await fireEvent.changeText(ui.getByTestId('housekeeping-notes'), '  Mantener ventana cerrada  ');
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    await waitFor(() => expect(ui.getByTestId(`housekeeping-submit-${kind}`)).toBeTruthy());
    expect(ui.queryByTestId(`housekeeping-submit-${kind === 'error' ? 'offline' : 'error'}`)).toBeNull();
    expect(ui.getByTestId('housekeeping-notes').props.value).toBe('  Mantener ventana cerrada  ');
    expect(ui.getByText('09:00–10:00')).toBeTruthy();
    expect(submitRequest).toHaveBeenCalledTimes(1);
    expect(ui.queryByTestId('housekeeping-submit-success')).toBeNull();
    expect(ui.getByTestId('session-service-requests-probe').props.children).toBe('[]');
    await fireEvent.press(ui.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(ui.getByTestId('housekeeping-submit-success')).toBeTruthy());
    expect(submitRequest.mock.calls).toEqual([
      [{ ...expectedInput, notes: 'Mantener ventana cerrada' }], [{ ...expectedInput, notes: 'Mantener ventana cerrada' }],
    ]);
    expect(JSON.parse(ui.getByTestId('session-service-requests-probe').props.children)).toHaveLength(1);
  });

  it('shows Stay loading until the existing boundary resolves', async () => {
    const pending = deferred<typeof currentStayFixture>();
    const { ui } = await setup(undefined, { getCurrentStay: () => pending.promise });
    expect(ui.getByTestId('housekeeping-stay-loading')).toBeTruthy();
    expect(ui.queryByTestId('housekeeping-submit')).toBeNull();
    await act(async () => pending.resolve(currentStayFixture));
    await ready(ui);
  });

  it.each([
    ['error', new Error('stay failure')], ['offline', new NetworkError()],
  ] as const)('distinguishes Stay %s and retries the existing query', async (kind, error) => {
    const getCurrentStay = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(currentStayFixture);
    const { ui } = await setup(undefined, { getCurrentStay });
    await waitFor(() => expect(ui.getByTestId(`housekeeping-stay-${kind}`)).toBeTruthy());
    expect(ui.queryByTestId('housekeeping-submit')).toBeNull();
    expect(ui.queryByTestId(`housekeeping-stay-${kind === 'error' ? 'offline' : 'error'}`)).toBeNull();
    await fireEvent.press(ui.getByTestId('housekeeping-stay-retry'));
    await ready(ui);
    expect(getCurrentStay).toHaveBeenCalledTimes(2);
  });

  it('opens the productive route from Services, keeps Services active, and returns via Back and success', async () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(morningNowMs);
    const queryClient = client();
    const ui = await renderRouter({
      _layout: () => <QueryClientProvider client={queryClient}><SessionServiceRequestsProvider><PathProbe /><Slot /></SessionServiceRequestsProvider></QueryClientProvider>,
      services: ServicesRoute,
      'services/housekeeping': HousekeepingRoute,
    }, { initialUrl: '/services' });
    await waitFor(() => expect(ui.getByTestId('services-housekeeping-launcher')).toBeTruthy());
    for (const label of ['Late check-out', 'Limpieza', 'Room Service']) {
      expect(ui.getByText(label)).toBeTruthy();
    }
    await fireEvent.press(ui.getByRole('button', { name: 'Limpieza' }));
    await ready(ui);
    expect(ui.getByTestId('pathname').props.children).toBe('/services/housekeeping');
    expect(ui.getByRole('tab', { name: 'Servicios' }).props.accessibilityState.selected).toBe(true);
    expect(ui.getAllByRole('tab')).toHaveLength(4);
    await act(async () => router.back());
    expect(ui.getByTestId('pathname').props.children).toBe('/services');
    await fireEvent.press(await ui.findByTestId('services-housekeeping-launcher'));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('housekeeping-back-arrow'));
    expect(ui.getByTestId('pathname').props.children).toBe('/services');
    await fireEvent.press(await ui.findByTestId('services-housekeeping-launcher'));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('housekeeping-submit'));
    await waitFor(() => expect(ui.getByTestId('housekeeping-submit-success')).toBeTruthy());
    await fireEvent.press(ui.getByRole('button', { name: 'Volver a servicios' }));
    expect(ui.getByTestId('pathname').props.children).toBe('/services');
    nowSpy.mockRestore();
  });
});
