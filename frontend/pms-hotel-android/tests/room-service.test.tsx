import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router, Slot, usePathname } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import RoomServiceRoute from '../app/(guest)/services/room-service';
import ServicesRoute from '../app/(guest)/services';
import { NetworkError } from '@/data/remote/http/HttpError';
import { MockRoomServiceService, RoomServiceScreen, roomServiceMenuFixture, type RoomServiceRequest, type RoomServiceService } from '@/modules/services/room-service';
import { MockStayService, type StayService } from '@/modules/stay';
import { currentStayFixture } from '@/modules/stay/data/mocks/currentStayFixture';

declare const require: (moduleName: string) => { existsSync(path: string): boolean };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function client() {
  return new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { gcTime: 0, retry: false } } });
}

async function setup(service: RoomServiceService = new MockRoomServiceService(), stayService: StayService = new MockStayService()) {
  const ui = await render(<QueryClientProvider client={client()}><RoomServiceScreen service={service} stayService={stayService} /></QueryClientProvider>);
  return { ui };
}

async function ready(ui: Awaited<ReturnType<typeof render>>) {
  await waitFor(() => expect(ui.getByTestId('room-service-product-continental-breakfast')).toBeTruthy());
}

async function openCart(ui: Awaited<ReturnType<typeof render>>) {
  await fireEvent.press(ui.getByTestId('room-service-cart-button'));
  await waitFor(() => expect(ui.getByTestId('room-service-cart-panel')).toBeTruthy());
}

async function chooseDeliveryTime(ui: Awaited<ReturnType<typeof render>>, hour = '13', minute = '45') {
  await fireEvent.press(ui.getByTestId('room-service-delivery-picker'));
  await waitFor(() => expect(ui.getByTestId('room-service-delivery-time-picker-wheel')).toBeTruthy());
  await fireEvent.press(ui.getByTestId(`room-service-delivery-time-picker-hour-${hour}`));
  await fireEvent.press(ui.getByTestId(`room-service-delivery-time-picker-minute-${minute}`));
  await fireEvent.press(ui.getByTestId('room-service-delivery-time-picker-confirm'));
}

function PathProbe() {
  return <Text testID="pathname">{usePathname()}</Text>;
}

describe('Room Service — IMP-AND-0111', () => {
  it('keeps the cart content closed initially and opens an empty, closable panel from the accessible header button', async () => {
    const { ui } = await setup();
    await ready(ui);
    expect(ui.getByText('Habitación 204')).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Volver a servicios' })).toBeTruthy();
    expect(ui.getByRole('button', { name: 'Abrir carrito' })).toBeTruthy();
    expect(ui.queryByTestId('room-service-cart-panel')).toBeNull();
    expect(ui.queryByTestId('room-service-notes')).toBeNull();
    expect(ui.queryByTestId('room-service-submit')).toBeNull();

    await openCart(ui);
    expect(ui.getByText('Aún no has agregado productos.')).toBeTruthy();
    expect(ui.getByTestId('room-service-submit').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(ui.getByTestId('room-service-cart-close'));
    expect(ui.queryByTestId('room-service-cart-panel')).toBeNull();
  });

  it('renders categories and the approved mock catalog, including the nullable room context', async () => {
    const { ui } = await setup();
    await ready(ui);
    for (const category of ['Desayunos', 'Comidas', 'Bebidas']) expect(ui.getByRole('tab', { name: category })).toBeTruthy();
    expect(ui.getByText('Desayuno continental')).toBeTruthy();
    expect(ui.getByText('Q 75')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('room-service-category-Comidas'));
    expect(ui.getByText('Club sándwich')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('room-service-category-Bebidas'));
    expect(ui.getByText('Café')).toBeTruthy();

    const noRoom = await setup(undefined, new MockStayService({ kind: 'success', dto: { ...currentStayFixture, room: null } }));
    await ready(noRoom.ui);
    expect(noRoom.ui.getByText('Habitación por asignar')).toBeTruthy();
  });

  it('keeps cart lines and multiline notes after closing and reopening the cart', async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await openCart(ui);
    expect(ui.getByTestId('room-service-cart-line-continental-breakfast')).toBeTruthy();
    expect(ui.getByTestId('room-service-total').props.children).toBe('Q 75');
    await fireEvent.changeText(ui.getByTestId('room-service-notes'), 'Sin cebolla\nPor favor');
    await fireEvent.press(ui.getByTestId('room-service-cart-close'));
    await openCart(ui);
    expect(ui.getByTestId('room-service-cart-line-continental-breakfast')).toBeTruthy();
    expect(ui.getByTestId('room-service-notes').props.value).toBe('Sin cebolla\nPor favor');
  });

  it('manages quantities and derives the cart total in the panel', async () => {
    const { ui } = await setup();
    await ready(ui);
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await fireEvent.press(ui.getByTestId('room-service-increment-continental-breakfast'));
    await fireEvent.press(ui.getByTestId('room-service-category-Bebidas'));
    await fireEvent.press(ui.getByTestId('room-service-add-coffee'));
    await openCart(ui);
    expect(ui.getByTestId('room-service-total').props.children).toBe('Q 170');
    await fireEvent.press(ui.getByTestId('room-service-decrement-continental-breakfast'));
    await fireEvent.press(ui.getByTestId('room-service-decrement-continental-breakfast'));
    expect(ui.queryByTestId('room-service-cart-line-continental-breakfast')).toBeNull();
    expect(ui.getByTestId('room-service-total').props.children).toBe('Q 20');
    await fireEvent.press(ui.getByTestId('room-service-remove-coffee'));
    expect(ui.getByText('Aún no has agregado productos.')).toBeTruthy();
  });

  it('uses the shared free-time picker, preserves the value on cancel, and enables submit only with an item and time', async () => {
    const { ui } = await setup();
    await ready(ui);
    await openCart(ui);
    expect(ui.getByText('Seleccionar hora')).toBeTruthy();
    expect(ui.getByTestId('room-service-submit').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(ui.getByTestId('room-service-delivery-picker'));
    expect(ui.getByTestId('room-service-delivery-time-picker-hour-00')).toBeTruthy();
    expect(ui.getByTestId('room-service-delivery-time-picker-minute-59')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('room-service-delivery-time-picker-cancel'));
    expect(ui.getByText('Seleccionar hora')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('room-service-cart-close'));
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await openCart(ui);
    expect(ui.getByTestId('room-service-submit').props.accessibilityState.disabled).toBe(true);
    await chooseDeliveryTime(ui);
    expect(ui.getByText('13:45')).toBeTruthy();
    expect(ui.getByTestId('room-service-submit').props.accessibilityState.disabled).toBe(false);
  });

  it.each(['', '   \n  '])('omits whitespace-only notes from the request (%j)', async (notes) => {
    const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>(async () => undefined);
    const { ui } = await setup(new MockRoomServiceService({ submitRequest }));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await openCart(ui);
    await fireEvent.changeText(ui.getByTestId('room-service-notes'), notes);
    await chooseDeliveryTime(ui);
    await fireEvent.press(ui.getByTestId('room-service-submit'));
    await waitFor(() => expect(submitRequest).toHaveBeenCalledWith({ items: [{ itemFixtureKey: 'continental-breakfast', quantity: 1 }], deliveryTime: '13:45' }));
  });

  it('trims multiline notes and sends no Stay, Reservation, Room, total, or price data', async () => {
    const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>(async () => undefined);
    const { ui } = await setup(new MockRoomServiceService({ submitRequest }), new MockStayService({ kind: 'success', dto: {
      ...currentStayFixture, id: 'another-stay', reservationId: 'another-reservation', room: { id: 'another-room', number: '205' },
    } }));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await openCart(ui);
    await fireEvent.changeText(ui.getByTestId('room-service-notes'), '  Sin cebolla\nPor favor  ');
    await chooseDeliveryTime(ui);
    await fireEvent.press(ui.getByTestId('room-service-submit'));
    await waitFor(() => expect(submitRequest).toHaveBeenCalledWith({
      items: [{ itemFixtureKey: 'continental-breakfast', quantity: 1 }], deliveryTime: '13:45', notes: 'Sin cebolla\nPor favor',
    }));
    const request = submitRequest.mock.calls[0][0];
    for (const key of ['stayId', 'reservationId', 'roomId', 'propertyId', 'total', 'priceAmount']) expect(request).not.toHaveProperty(key);
  });

  it('shows submitting, blocks duplicate confirmation, and renders success only after resolution', async () => {
    const pending = deferred<void>();
    const submitRequest = jest.fn(() => pending.promise);
    const { ui } = await setup(new MockRoomServiceService({ submitRequest }));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await openCart(ui);
    await chooseDeliveryTime(ui);
    await fireEvent.press(ui.getByTestId('room-service-submit'));
    await fireEvent.press(ui.getByTestId('room-service-submit'));
    await waitFor(() => expect(ui.getByText('Enviando pedido...')).toBeTruthy());
    expect(submitRequest).toHaveBeenCalledTimes(1);
    expect(ui.queryByTestId('room-service-submit-success')).toBeNull();
    await act(async () => pending.resolve());
    await waitFor(() => expect(ui.getByTestId('room-service-submit-success')).toBeTruthy());
  });

  it.each([
    ['error', new Error('technical failure')], ['offline', new NetworkError()],
  ] as const)('keeps cart, notes, and delivery time on submit %s and retries', async (kind, error) => {
    const submitRequest = jest.fn<Promise<void>, [RoomServiceRequest]>().mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
    const { ui } = await setup(new MockRoomServiceService({ submitRequest }));
    await ready(ui);
    await fireEvent.press(ui.getByTestId('room-service-add-continental-breakfast'));
    await openCart(ui);
    await fireEvent.changeText(ui.getByTestId('room-service-notes'), '  Sin azúcar  ');
    await chooseDeliveryTime(ui);
    await fireEvent.press(ui.getByTestId('room-service-submit'));
    await waitFor(() => expect(ui.getByTestId(`room-service-submit-${kind}`)).toBeTruthy());
    expect(ui.getByTestId('room-service-cart-line-continental-breakfast')).toBeTruthy();
    expect(ui.getByTestId('room-service-notes').props.value).toBe('  Sin azúcar  ');
    expect(ui.getByText('13:45')).toBeTruthy();
    await fireEvent.press(ui.getByTestId('room-service-submit'));
    await waitFor(() => expect(ui.getByTestId('room-service-submit-success')).toBeTruthy());
    expect(submitRequest).toHaveBeenCalledTimes(2);
  });

  it('distinguishes menu and shared Stay loading, generic error, offline, and retry', async () => {
    const pendingMenu = deferred<typeof roomServiceMenuFixture>();
    const loading = await setup(new MockRoomServiceService({ getMenu: () => pendingMenu.promise }));
    await waitFor(() => expect(loading.ui.getByTestId('room-service-menu-loading')).toBeTruthy());
    await act(async () => pendingMenu.resolve(roomServiceMenuFixture));
    await ready(loading.ui);

    const retryMenu = jest.fn().mockRejectedValueOnce(new Error('menu failure')).mockResolvedValueOnce(roomServiceMenuFixture);
    const generic = await setup(new MockRoomServiceService({ getMenu: retryMenu }));
    await waitFor(() => expect(generic.ui.getByTestId('room-service-menu-error')).toBeTruthy());
    await fireEvent.press(generic.ui.getByTestId('room-service-menu-error-action'));
    await ready(generic.ui);
    expect(retryMenu).toHaveBeenCalledTimes(2);

    const menuOffline = await setup(new MockRoomServiceService({ getMenu: async () => { throw new NetworkError(); } }));
    await waitFor(() => expect(menuOffline.ui.getByTestId('room-service-menu-offline')).toBeTruthy());

    const stayRetry = jest.fn().mockRejectedValueOnce(new NetworkError()).mockResolvedValueOnce(currentStayFixture);
    const stayOffline = await setup(undefined, { getCurrentStay: stayRetry });
    await waitFor(() => expect(stayOffline.ui.getByTestId('room-service-stay-offline')).toBeTruthy());
    await fireEvent.press(stayOffline.ui.getByTestId('room-service-stay-offline-action'));
    await ready(stayOffline.ui);
    expect(stayRetry).toHaveBeenCalledTimes(2);
  });

  it('opens from Services, keeps Servicios active, and returns through Back and success', async () => {
    const queryClient = client();
    const ui = await renderRouter({
      _layout: () => <QueryClientProvider client={queryClient}><PathProbe /><Slot /></QueryClientProvider>,
      services: ServicesRoute,
      'services/room-service': RoomServiceRoute,
    }, { initialUrl: '/services' });
    await waitFor(() => expect(ui.getByTestId('services-room-service-launcher')).toBeTruthy());
    await fireEvent.press(ui.getByRole('button', { name: 'Room Service' }));
    await waitFor(() => expect(ui.getByTestId('room-service-cart-button')).toBeTruthy());
    expect(ui.getByTestId('pathname').props.children).toBe('/services/room-service');
    expect(ui.getByRole('tab', { name: 'Servicios' }).props.accessibilityState.selected).toBe(true);
    await act(async () => router.back());
    expect(ui.getByTestId('pathname').props.children).toBe('/services');
    await fireEvent.press(await ui.findByTestId('services-room-service-launcher'));
    await waitFor(() => expect(ui.getByTestId('room-service-back-arrow')).toBeTruthy());
    await fireEvent.press(ui.getByTestId('room-service-back-arrow'));
    expect(ui.getByTestId('pathname').props.children).toBe('/services');
  });

  it('does not introduce the separate IMP-AND-0112 requests route', () => {
    const fs = require('fs');
    expect(fs.existsSync('app/(guest)/services/requests.tsx')).toBe(false);
  });
});
