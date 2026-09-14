import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { NetworkError } from '@/data/remote/http/HttpError';
import { valetScreenFixture } from '@/data/mocks/valet/valetScreenFixture';
import { GuestNavigationTabs } from '@/modules/navigation';
import { mapValetScreenFixtureDto, MockValetService, type ReserveTransferFixtureInput, ValetScreen } from '@/modules/valet';
import { type ExternalMapService } from '@/modules/valet/data/services/GoogleMapsLinkingService';
import { MockTransferRouteService } from '@/modules/valet/data/mocks/MockTransferRouteService';
import { type Clock } from '@/modules/valet/domain/services/Clock';
import { calculateTransferFare, transferFareConfig } from '@/modules/valet/domain/services/TransferFareCalculator';

declare const require: (name: string) => { readFileSync(path: string, encoding: string): string };

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((next) => { resolve = next; }); return { promise, resolve }; }
const fixedNow = new Date(2026, 8, 11, 15, 20, 0);
const fixedClock: Clock = { getNow: () => new Date(fixedNow) };
function queryClient() { return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { gcTime: 0, retry: false } } }); }
async function renderValet(service = new MockValetService(), routeService?: MockTransferRouteService, mapService?: ExternalMapService, clock: Clock = fixedClock) { return render(<QueryClientProvider client={queryClient()}><ValetScreen clock={clock} mapService={mapService} routeService={routeService} service={service} /></QueryClientProvider>); }
async function ready(rendered: Awaited<ReturnType<typeof render>>) { await waitFor(() => expect(rendered.getByTestId('valet-screen')).toBeTruthy()); }
async function openTransfer(rendered: Awaited<ReturnType<typeof render>>) { await fireEvent.press(rendered.getByTestId('valet-transfer-card')); await waitFor(() => expect(rendered.getByTestId('valet-transfer-modal')).toBeTruthy()); }

describe('Transporte y valet', () => {
  it('maps fixture places, active vehicle, and semantic transfer defaults to Domain', () => {
    const domain = mapValetScreenFixtureDto(valetScreenFixture);
    expect(domain.activeVehicleKey).toBe('valet-vehicle-primary');
    expect(domain.places.find((place) => place.key === 'place-hotel')?.type).toBe('HOTEL');
    expect(domain.transfer).toMatchObject({ title: 'Traslado', defaultDestinationKey: 'place-airport', defaultPassengers: 2 });
    expect(domain.vehicles).toHaveLength(2);
  });

  it('calculates deterministic mock fares outside UI using Q40 + Q8/km', () => {
    expect(transferFareConfig).toEqual({ baseFare: 40, pricePerKm: 8 });
    expect(calculateTransferFare({ distanceKm: 12.4, distanceText: '12.4 km', durationMinutes: 28, durationText: '28 min' })).toEqual({ estimatedPrice: 139, estimatedPriceText: 'Q 139' });
  });

  it('keeps UI free from DTOs, fixtures, direct fetch, and fare arithmetic', () => {
    const fs = require('fs'); const source = fs.readFileSync('src/modules/valet/presentation/ValetScreen.tsx', 'utf8');
    expect(source).not.toMatch(/data\/dtos|data\/mocks|(?:^|[^A-Za-z])fetch\s*\(/);
    expect(source).toContain('useTransferRouteEstimate'); expect(source).toContain('useReserveTransfer'); expect(source).toContain('calculateTransferFare');
  });

  it('renders Traslado and the approved Guest V3 states', async () => {
    const rendered = await renderValet(); await ready(rendered);
    expect(rendered.getByText('Traslado')).toBeTruthy(); expect(rendered.getByText('Aeropuerto Internacional La Aurora')).toBeTruthy();
    const navigation = await render(<GuestNavigationTabs pathname="/valet" />);
    expect(navigation.getByLabelText('Valet').props.accessibilityState).toMatchObject({ disabled: false, selected: true });
    expect(navigation.getByLabelText('Servicios').props.accessibilityState.disabled).toBe(false); expect(navigation.getByLabelText('Chat').props.accessibilityState.disabled).toBe(false); expect(navigation.getByLabelText('Cuenta').props.accessibilityState.disabled).toBe(false);
  });

  it('keeps loading, generic error, and NetworkError query states distinct', async () => {
    const wait = deferred<typeof valetScreenFixture>(); const loading = await renderValet(new MockValetService({ getScreen: () => wait.promise })); expect(loading.getByTestId('valet-screen-loading')).toBeTruthy(); await act(async () => { wait.resolve(valetScreenFixture); }); await ready(loading);
    const error = await renderValet(new MockValetService({ getScreen: async () => { throw new Error('failure'); } })); await waitFor(() => expect(error.getByTestId('valet-screen-error')).toBeTruthy());
    const offline = await renderValet(new MockValetService({ getScreen: async () => { throw new NetworkError(); } })); await waitFor(() => expect(offline.getByTestId('valet-screen-offline')).toBeTruthy());
  });

  it('selects a local vehicle and sends only its fixture key after pending resolves', async () => {
    const wait = deferred<{ vehicleFixtureKey: string; requestReferenceText: string }>(); const requestVehicle = jest.fn(() => wait.promise); const rendered = await renderValet(new MockValetService({ requestVehicle })); await ready(rendered);
    await fireEvent.press(rendered.getByTestId('valet-vehicle-card')); await fireEvent.press(rendered.getByTestId('valet-vehicle-option-valet-vehicle-secondary')); await fireEvent.press(rendered.getByTestId('valet-request-button')); await fireEvent.press(rendered.getByTestId('valet-request-button'));
    expect(requestVehicle).toHaveBeenCalledTimes(1); expect(requestVehicle).toHaveBeenCalledWith({ vehicleFixtureKey: 'valet-vehicle-secondary' }); expect(rendered.queryByTestId('valet-request-success')).toBeNull(); await act(async () => { wait.resolve({ vehicleFixtureKey: 'valet-vehicle-secondary', requestReferenceText: 'VAL-0148' }); }); await waitFor(() => expect(rendered.getByTestId('valet-request-success')).toBeTruthy()); expect(rendered.getByText('Mazda CX-5 · Blanco')).toBeTruthy();
  });

  it('calculates Hotel to place, presents route/fare, and reserves with no pickup', async () => {
    const reserveTransfer = jest.fn<Promise<{ confirmationText: string; referenceText: string }>, [ReserveTransferFixtureInput]>(async () => ({ confirmationText: 'Traslado reservado', referenceText: 'TRF-0220' })); const rendered = await renderValet(new MockValetService({ reserveTransfer })); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy()); expect(rendered.queryByTestId('transfer-pickup-selector')).toBeNull(); await fireEvent.press(rendered.getByTestId('transfer-reserve-button')); await waitFor(() => expect(rendered.getByTestId('valet-transfer-success')).toBeTruthy());
    expect(reserveTransfer).toHaveBeenCalledWith(expect.objectContaining({ destinationType: 'PLACE', destinationPlaceFixtureKey: 'place-airport', routeEstimate: expect.objectContaining({ distanceKm: expect.any(Number) }), fareEstimate: expect.objectContaining({ estimatedPrice: expect.any(Number) }) }));
    expect(reserveTransfer.mock.calls[0][0]).not.toHaveProperty('pickupPlaceFixtureKey');
  });

  it('requires a non-Hotel pickup for place to Hotel and includes it only then', async () => {
    const reserveTransfer = jest.fn<Promise<{ confirmationText: string; referenceText: string }>, [ReserveTransferFixtureInput]>(async () => ({ confirmationText: 'Traslado reservado', referenceText: 'TRF-0220' })); const rendered = await renderValet(new MockValetService({ reserveTransfer })); await ready(rendered); await openTransfer(rendered);
    await fireEvent.press(rendered.getByTestId('transfer-destination-selector')); await fireEvent.press(rendered.getByTestId('transfer-place-option-place-hotel')); await waitFor(() => expect(rendered.getByTestId('transfer-pickup-selector')).toBeTruthy()); expect(rendered.getByTestId('transfer-reserve-button').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(rendered.getByTestId('transfer-pickup-selector')); expect(rendered.queryByTestId('transfer-place-option-place-hotel')).toBeNull(); await fireEvent.press(rendered.getByTestId('transfer-place-option-place-oakland')); await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy()); await fireEvent.press(rendered.getByTestId('transfer-reserve-button')); await waitFor(() => expect(rendered.getByTestId('valet-transfer-success')).toBeTruthy());
    expect(reserveTransfer).toHaveBeenCalledWith(expect.objectContaining({ destinationType: 'HOTEL', destinationPlaceFixtureKey: 'place-hotel', pickupPlaceFixtureKey: 'place-oakland' })); expect(rendered.getByText('Oakland Place')).toBeTruthy();
  });

  it('represents route loading, error, offline and manual retry without losing selected places', async () => {
    const waiting = deferred<{ distanceKm: number; distanceText: string; durationMinutes: number; durationText: string }>(); const route = new MockTransferRouteService({ calculateRoute: () => waiting.promise }); const rendered = await renderValet(undefined, route); await ready(rendered); await openTransfer(rendered); expect(rendered.getByTestId('transfer-route-loading')).toBeTruthy(); await act(async () => { waiting.resolve({ distanceKm: 2, distanceText: '2.0 km', durationMinutes: 5, durationText: '5 min' }); }); await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    const routeError = new MockTransferRouteService({ calculateRoute: async () => { throw new NetworkError(); } }); const offline = await renderValet(undefined, routeError); await ready(offline); await openTransfer(offline); await waitFor(() => expect(offline.getByTestId('transfer-route-offline')).toBeTruthy()); expect(offline.getByText('Aeropuerto Internacional La Aurora')).toBeTruthy();
  });

  it('keeps the draft and retries a generic route error manually', async () => {
    let attempts = 0;
    const route = new MockTransferRouteService({ calculateRoute: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('route unavailable');
      return { distanceKm: 2, distanceText: '2.0 km', durationMinutes: 5, durationText: '5 min' };
    } });
    const rendered = await renderValet(undefined, route); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-error')).toBeTruthy());
    expect(rendered.getByTestId('transfer-date-picker-button')).toBeTruthy();
    await fireEvent.press(rendered.getByText('Reintentar'));
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    expect(attempts).toBe(2);
  });

  it('keeps the transfer draft on reservation error and succeeds only after manual retry', async () => {
    let attempts = 0;
    const reserveTransfer = jest.fn<Promise<{ confirmationText: string; referenceText: string }>, [ReserveTransferFixtureInput]>(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('reservation unavailable');
      return { confirmationText: 'Traslado reservado', referenceText: 'TRF-0220' };
    });
    const rendered = await renderValet(new MockValetService({ reserveTransfer })); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-reserve-button'));
    await waitFor(() => expect(rendered.getByTestId('valet-transfer-error')).toBeTruthy());
    expect(rendered.getByTestId('transfer-date-picker-button')).toBeTruthy();
    await fireEvent.press(rendered.getByText('Reintentar'));
    await waitFor(() => expect(rendered.getByTestId('valet-transfer-success')).toBeTruthy());
    expect(reserveTransfer).toHaveBeenCalledTimes(2);
  });

  it('keeps the transfer draft and reports offline when reservation has a NetworkError', async () => {
    const reserveTransfer = jest.fn<Promise<{ confirmationText: string; referenceText: string }>, [ReserveTransferFixtureInput]>(async () => { throw new NetworkError(); });
    const rendered = await renderValet(new MockValetService({ reserveTransfer })); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-reserve-button'));
    await waitFor(() => expect(rendered.getByTestId('valet-transfer-offline')).toBeTruthy());
    expect(rendered.getByTestId('transfer-date-picker-button')).toBeTruthy();
    expect(rendered.queryByTestId('valet-transfer-success')).toBeNull();
  });

  it('does not show Maps until a route is valid', async () => {
    const waiting = deferred<{ distanceKm: number; distanceText: string; durationMinutes: number; durationText: string }>();
    const route = new MockTransferRouteService({ calculateRoute: () => waiting.promise });
    const rendered = await renderValet(undefined, route); await ready(rendered); await openTransfer(rendered);
    expect(rendered.queryByTestId('transfer-view-route-maps')).toBeNull();
    await act(async () => { waiting.resolve({ distanceKm: 2, distanceText: '2.0 km', durationMinutes: 5, durationText: '5 min' }); });
    await waitFor(() => expect(rendered.getByTestId('transfer-view-route-maps')).toBeTruthy());
  });

  it('opens the selected Hotel to place route without changing transfer state', async () => {
    const openRoute = jest.fn(async () => true);
    const mapService: ExternalMapService = { openRoute };
    const rendered = await renderValet(undefined, undefined, mapService); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-view-route-maps')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-view-route-maps'));
    await waitFor(() => expect(openRoute).toHaveBeenCalledWith(expect.objectContaining({ key: 'place-hotel' }), expect.objectContaining({ key: 'place-airport' })));
    expect(rendered.getByLabelText('Destino').props.value).toBe('Aeropuerto Internacional La Aurora');
    expect(rendered.getByText('2.3 km')).toBeTruthy();
    expect(rendered.getByText('Q 58')).toBeTruthy();
  });

  it('opens the selected pickup to Hotel route and handles an unavailable Maps app', async () => {
    const openRoute = jest.fn(async () => false);
    const mapService: ExternalMapService = { openRoute };
    const rendered = await renderValet(undefined, undefined, mapService); await ready(rendered); await openTransfer(rendered);
    await fireEvent.press(rendered.getByTestId('transfer-destination-selector'));
    await fireEvent.press(rendered.getByTestId('transfer-place-option-place-hotel'));
    await fireEvent.press(rendered.getByTestId('transfer-pickup-selector'));
    await fireEvent.press(rendered.getByTestId('transfer-place-option-place-oakland'));
    await waitFor(() => expect(rendered.getByTestId('transfer-view-route-maps')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-view-route-maps'));
    await waitFor(() => expect(openRoute).toHaveBeenCalledWith(expect.objectContaining({ key: 'place-oakland' }), expect.objectContaining({ key: 'place-hotel' })));
    expect(rendered.getByTestId('transfer-maps-error')).toBeTruthy();
    expect(rendered.getByLabelText('Destino').props.value).toBe('Hotel');
    expect(rendered.getByLabelText('Punto de recogida').props.value).toBe('Oakland Place');
    expect(rendered.getByTestId('transfer-pickup-selector')).toBeTruthy();
    expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy();
  });

  it('opens native calendar and the shared free-time wheel instead of text inputs', async () => {
    const rendered = await renderValet(); await ready(rendered); await openTransfer(rendered);
    expect(rendered.queryByTestId('transfer-date-input')).toBeNull();
    expect(rendered.queryByTestId('transfer-time-input')).toBeNull();
    await fireEvent.press(rendered.getByTestId('transfer-date-picker-button'));
    expect(rendered.getByTestId('transfer-date-picker').props.mode).toBe('date');
    expect(new Date(rendered.getByTestId('transfer-date-picker').props.minimumDate)).toEqual(new Date(2026, 8, 11));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-button'));
    expect(rendered.getByTestId('transfer-time-picker-wheel')).toBeTruthy();
    expect(rendered.getByTestId('transfer-time-picker-hour-00')).toBeTruthy();
    expect(rendered.getByTestId('transfer-time-picker-minute-59')).toBeTruthy();
  });

  it('blocks an invalid same-day time, preserves the route, and accepts a future date', async () => {
    const rendered = await renderValet(); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-date-picker-button'));
    await fireEvent(rendered.getByTestId('transfer-date-picker'), 'onChange', { type: 'set', nativeEvent: { timestamp: new Date(2026, 8, 11).getTime(), utcOffset: 0 } });
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-button'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-hour-15'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-minute-49'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-confirm'));
    await waitFor(() => expect(rendered.getByTestId('transfer-schedule-error')).toBeTruthy());
    expect(rendered.getByTestId('transfer-reserve-button').props.accessibilityState.disabled).toBe(true);
    expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy();
    await fireEvent.press(rendered.getByTestId('transfer-date-picker-button'));
    await fireEvent(rendered.getByTestId('transfer-date-picker'), 'onChange', { type: 'set', nativeEvent: { timestamp: new Date(2026, 8, 12).getTime(), utcOffset: 0 } });
    await waitFor(() => expect(rendered.queryByTestId('transfer-schedule-error')).toBeNull());
    expect(rendered.getByTestId('transfer-reserve-button').props.accessibilityState.disabled).toBe(false);
  });

  it('revalidates immediately before a reservation when time has elapsed', async () => {
    let now = new Date(2026, 8, 11, 15, 20, 0);
    const clock: Clock = { getNow: () => new Date(now) };
    const reserveTransfer = jest.fn<Promise<{ confirmationText: string; referenceText: string }>, [ReserveTransferFixtureInput]>(async () => ({ confirmationText: 'Traslado reservado', referenceText: 'TRF-0220' }));
    const rendered = await renderValet(new MockValetService({ reserveTransfer }), undefined, undefined, clock); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-date-picker-button'));
    await fireEvent(rendered.getByTestId('transfer-date-picker'), 'onChange', { type: 'set', nativeEvent: { timestamp: new Date(2026, 8, 11).getTime(), utcOffset: 0 } });
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-button'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-hour-15'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-minute-50'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-confirm'));
    now = new Date(2026, 8, 13, 7, 31, 0);
    await fireEvent.press(rendered.getByTestId('transfer-reserve-button'));
    expect(reserveTransfer).not.toHaveBeenCalled();
  });

  it('revalidates a retry and preserves schedule controls after an offline reservation', async () => {
    let now = new Date(2026, 8, 11, 15, 20, 0);
    const clock: Clock = { getNow: () => new Date(now) };
    const reserveTransfer = jest.fn<Promise<{ confirmationText: string; referenceText: string }>, [ReserveTransferFixtureInput]>(async () => { throw new NetworkError(); });
    const rendered = await renderValet(new MockValetService({ reserveTransfer }), undefined, undefined, clock); await ready(rendered); await openTransfer(rendered);
    await waitFor(() => expect(rendered.getByTestId('transfer-route-estimate')).toBeTruthy());
    await fireEvent.press(rendered.getByTestId('transfer-date-picker-button'));
    await fireEvent(rendered.getByTestId('transfer-date-picker'), 'onChange', { type: 'set', nativeEvent: { timestamp: new Date(2026, 8, 11).getTime(), utcOffset: 0 } });
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-button'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-hour-15'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-minute-50'));
    await fireEvent.press(rendered.getByTestId('transfer-time-picker-confirm'));
    await fireEvent.press(rendered.getByTestId('transfer-reserve-button'));
    await waitFor(() => expect(rendered.getByTestId('valet-transfer-offline')).toBeTruthy());
    now = new Date(2026, 8, 13, 7, 31, 0);
    await fireEvent.press(rendered.getByText('Reintentar'));
    expect(reserveTransfer).toHaveBeenCalledTimes(1);
    expect(rendered.getByTestId('transfer-date-picker-button')).toBeTruthy();
    expect(rendered.getByTestId('transfer-time-picker-button')).toBeTruthy();
  });
});
