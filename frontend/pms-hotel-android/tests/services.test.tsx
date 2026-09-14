import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { act, renderRouter } from 'expo-router/testing-library';

import { NetworkError } from '@/data/remote/http/HttpError';
import {
  mapServicesCatalogFixtureDto,
  MockServicesService,
  ServicesScreen,
} from '@/modules/services';
import { servicesCatalogFixture } from '@/modules/services/data/mocks/servicesCatalogFixture';

declare const require: (moduleName: string) => { readFileSync(path: string, encoding: string): string };

function createDeferred<T>() {
  let resolve: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve: resolve! };
}

async function renderServices(service: MockServicesService) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ServicesScreen service={service} />
    </QueryClientProvider>,
  );
}

async function selectLateCheckOut(rendered: Awaited<ReturnType<typeof render>>) {
  await waitFor(() => expect(rendered.getByTestId('services-screen')).toBeTruthy());
  await fireEvent.press(rendered.getByTestId('service-card-late-check-out'));
  await waitFor(() => expect(rendered.getByTestId('services-selection')).toBeTruthy());
}

describe('Services', () => {
  it('maps the approved fixture DTO to a UI-safe domain catalog', () => {
    expect(mapServicesCatalogFixtureDto(servicesCatalogFixture)).toEqual({
      context: servicesCatalogFixture.context,
      items: servicesCatalogFixture.items,
    });
  });

  it('renders the two inline services, dedicated-flow launchers, and V3 shell with Services active', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { retry: false } },
    });
    const ServicesRoute = () => (
      <QueryClientProvider client={queryClient}>
        <ServicesScreen service={new MockServicesService()} />
      </QueryClientProvider>
    );
    const rendered = await renderRouter({ services: ServicesRoute }, { initialUrl: '/services' });

    await waitFor(() => expect(rendered.getByTestId('services-screen')).toBeTruthy());

    expect(rendered.getByText('Late check-out')).toBeTruthy();
    expect(rendered.getByText('Hasta las 14:00')).toBeTruthy();
    expect(rendered.getByText('Q 180')).toBeTruthy();
    expect(rendered.getByText('Decoración especial')).toBeTruthy();
    expect(rendered.queryByText('Desayuno en habitación')).toBeNull();
    expect(rendered.queryByText('Traslado aeropuerto')).toBeNull();
    expect(rendered.getByRole('button', { name: 'Limpieza incluida' })).toBeTruthy();
    expect(rendered.getByRole('button', { name: 'Room Service' })).toBeTruthy();
    expect(rendered.getByTestId('services-housekeeping-launcher-chevron')).toBeTruthy();
    expect(rendered.getByTestId('services-room-service-launcher-chevron')).toBeTruthy();
    expect(rendered.getByLabelText('Servicios').props.accessibilityState).toEqual(expect.objectContaining({
      disabled: false,
      selected: true,
    }));
    expect(rendered.getByLabelText('Chat').props.accessibilityState).toEqual(expect.objectContaining({
      disabled: false,
      selected: false,
    }));
    expect(rendered.getByLabelText('Valet').props.accessibilityState.disabled).toBe(false);
    expect(rendered.getByLabelText('Cuenta').props.accessibilityState.disabled).toBe(false);
    expect(rendered.getByTestId('services-submit-button').props.accessibilityState.disabled).toBe(true);
  });

  it('keeps exactly one inline selection and enables submit only after selection', async () => {
    const rendered = await renderServices(new MockServicesService());

    await selectLateCheckOut(rendered);

    expect(rendered.getByTestId('services-selection').props.children).toBeTruthy();
    expect(rendered.getAllByText('Late check-out').length).toBe(2);
    expect(rendered.getAllByText('Hasta las 14:00').length).toBe(2);
    expect(rendered.getAllByText('Q 180').length).toBe(2);
    expect(rendered.getByTestId('services-submit-button').props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(rendered.getByTestId('service-card-special-decoration'));
    expect(rendered.getAllByText('Decoración especial').length).toBe(2);
    expect(rendered.queryAllByText('Late check-out').length).toBe(1);
  });

  it('shows submitting, disables the CTA, and prevents concurrent duplicate submission', async () => {
    const deferred = createDeferred<{ serviceFixtureKey: string }>();
    const submitRequest = jest.fn(() => deferred.promise);
    const rendered = await renderServices(new MockServicesService({ submitRequest }));

    await selectLateCheckOut(rendered);
    const submitButton = rendered.getByTestId('services-submit-button');
    await fireEvent.press(submitButton);
    await fireEvent.press(submitButton);

    await waitFor(() => expect(rendered.getByText('Confirmando...')).toBeTruthy());
    expect(rendered.getByTestId('services-submit-button').props.accessibilityState.disabled).toBe(true);
    expect(rendered.getByTestId('services-selection')).toBeTruthy();
    expect(submitRequest).toHaveBeenCalledTimes(1);

    await act(async () => {
      deferred.resolve({ serviceFixtureKey: 'late-check-out' });
    });
    await waitFor(() => expect(rendered.getByTestId('services-submit-success')).toBeTruthy());
  });

  it('shows success only after the mock mutation and returns to the base catalog', async () => {
    const rendered = await renderServices(new MockServicesService());

    await selectLateCheckOut(rendered);
    await fireEvent.press(rendered.getByTestId('services-submit-button'));
    await waitFor(() => expect(rendered.getByText('Servicio solicitado')).toBeTruthy());
    expect(rendered.getByText('Recibimos tu solicitud.')).toBeTruthy();

    await fireEvent.press(rendered.getByText('Volver a servicios'));
    await waitFor(() => expect(rendered.getByTestId('services-screen')).toBeTruthy());
    expect(rendered.queryByTestId('services-selection')).toBeNull();
    expect(rendered.getByTestId('services-submit-button').props.accessibilityState.disabled).toBe(true);
  });

  it('shows generic submit error and retries the same selected fixture through a new mutation', async () => {
    const submitRequest = jest
      .fn<Promise<{ serviceFixtureKey: string }>, [{ serviceFixtureKey: string }]>()
      .mockRejectedValueOnce(new Error('mock failure'))
      .mockResolvedValueOnce({ serviceFixtureKey: 'late-check-out' });
    const rendered = await renderServices(new MockServicesService({ submitRequest }));

    await selectLateCheckOut(rendered);
    await fireEvent.press(rendered.getByTestId('services-submit-button'));
    await waitFor(() => expect(rendered.getByTestId('services-submit-error')).toBeTruthy());
    expect(rendered.getByText('No pudimos enviar tu solicitud')).toBeTruthy();
    expect(rendered.getByText('Intenta nuevamente.')).toBeTruthy();
    expect(rendered.getByTestId('services-selection')).toBeTruthy();
    expect(rendered.queryByTestId('services-submit-button')).toBeNull();

    await fireEvent.press(rendered.getByText('Reintentar'));
    await waitFor(() => expect(rendered.getByTestId('services-submit-success')).toBeTruthy());
    expect(submitRequest).toHaveBeenCalledTimes(2);
    expect(submitRequest).toHaveBeenLastCalledWith({ serviceFixtureKey: 'late-check-out' });
  });

  it('distinguishes NetworkError submit offline and retries without queuing work', async () => {
    const submitRequest = jest
      .fn<Promise<{ serviceFixtureKey: string }>, [{ serviceFixtureKey: string }]>()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce({ serviceFixtureKey: 'late-check-out' });
    const rendered = await renderServices(new MockServicesService({ submitRequest }));

    await selectLateCheckOut(rendered);
    await fireEvent.press(rendered.getByTestId('services-submit-button'));
    await waitFor(() => expect(rendered.getByTestId('services-submit-offline')).toBeTruthy());
    expect(rendered.getByText('Sin conexión')).toBeTruthy();
    expect(rendered.getByText('Conéctate a internet para solicitar este servicio.')).toBeTruthy();
    expect(rendered.getByTestId('services-selection')).toBeTruthy();
    expect(rendered.queryByTestId('services-submit-button')).toBeNull();

    await fireEvent.press(rendered.getByText('Reintentar'));
    await waitFor(() => expect(rendered.getByTestId('services-submit-success')).toBeTruthy());
    expect(submitRequest).toHaveBeenCalledTimes(2);
  });

  it('represents catalog loading, generic error, and NetworkError offline independently from submit', async () => {
    const pendingCatalog = createDeferred<typeof servicesCatalogFixture>();
    const loading = await renderServices(new MockServicesService({ getCatalog: () => pendingCatalog.promise }));
    expect(loading.getByTestId('services-catalog-loading')).toBeTruthy();

    await act(async () => {
      pendingCatalog.resolve(servicesCatalogFixture);
    });
    await waitFor(() => expect(loading.getByTestId('services-screen')).toBeTruthy());
    await loading.unmount();

    const genericError = await renderServices(
      new MockServicesService({ getCatalog: async () => { throw new Error('catalog failure'); } }),
    );
    await waitFor(() => expect(genericError.getByTestId('services-catalog-error')).toBeTruthy());
    expect(genericError.getByText('No pudimos cargar los servicios')).toBeTruthy();
    await genericError.unmount();

    const offline = await renderServices(
      new MockServicesService({ getCatalog: async () => { throw new NetworkError(); } }),
    );
    await waitFor(() => expect(offline.getByTestId('services-catalog-offline')).toBeTruthy());
    expect(offline.getByText('Sin conexión')).toBeTruthy();
  });

  it('centers only the Services success content while preserving the shared footbar composition', () => {
    const fs = require('fs');
    const stylesSource = fs.readFileSync('src/modules/services/presentation/servicesStyles.ts', 'utf8');
    const screenSource = fs.readFileSync('src/modules/services/presentation/ServicesScreen.tsx', 'utf8');

    expect(stylesSource).toMatch(/successContent:[\s\S]*flexGrow: 1,[\s\S]*justifyContent: 'center'/);
    expect(screenSource).toContain('servicesStyles.successContent');
    expect(screenSource).toContain('<GuestNavigationShell />');
    expect(screenSource).toContain('servicesStyles.screen');
  });
});
